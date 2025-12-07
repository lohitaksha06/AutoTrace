import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import { z } from 'zod';
import { canonicalJSONStringify, merkleProof, merkleRoot, sha256Hex, verifyProof } from './crypto';
import type { LogDoc, VehicleDoc } from './types';

const app = express();
app.use(cors());
app.use(express.json());

// Mongo setup
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'autotrace';
const client = new MongoClient(MONGO_URI);
let connected = false;

function getDb() { return client.db(DB_NAME); }

async function ensureDb(): Promise<void> {
  if (!connected) {
    await client.connect();
    // warm indexes
    const d = getDb();
    await d.collection('logs').createIndex({ vehicleId: 1, createdAt: 1 });
    await d.collection('vehicles').createIndex({ vin: 1 }, { unique: true });
    connected = true;
  }
}

// Health
app.get('/health', async (_req: Request, res: Response) => {
  try {
    await ensureDb();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// Schemas
const vehicleSchema = z.object({ vin: z.string().min(6), metadata: z.record(z.any()).optional() });
const logSchema = z.object({ summary: z.string(), parts: z.array(z.string()).optional(), mileage: z.number().int().nonnegative(), docCid: z.string().optional() });

// Create vehicle
app.post('/api/vehicles', async (req: Request, res: Response) => {
  try {
    await ensureDb();
    const body = vehicleSchema.parse(req.body);
    const doc: VehicleDoc = { ...body, createdAt: new Date(), merkleRoot: null, merkleUpdatedAt: new Date() };
    const r = await getDb().collection<VehicleDoc>('vehicles').insertOne(doc);
    res.status(201).json({
      id: r.insertedId.toHexString(),
      vin: doc.vin,
      metadata: doc.metadata ?? {},
      createdAt: doc.createdAt.toISOString(),
      merkleRoot: doc.merkleRoot,
      merkleUpdatedAt: doc.merkleUpdatedAt?.toISOString() ?? null,
    });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// List vehicles with aggregates
app.get('/api/vehicles', async (req: Request, res: Response) => {
  try {
    await ensureDb();
    const rawLimit = Number(req.query.limit ?? 25);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 100) : 25;

    const vehicles = await getDb()
      .collection<VehicleDoc>('vehicles')
      .aggregate<Array<Record<string, any>>>([
        { $sort: { createdAt: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'logs',
            let: { vehicleId: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$vehicleId', '$$vehicleId'] } } },
              { $sort: { createdAt: -1 } },
              {
                $group: {
                  _id: null,
                  count: { $sum: 1 },
                  lastLogAt: { $first: '$createdAt' },
                  lastSummary: { $first: '$summary' },
                  lastHash: { $first: '$hash' },
                  lastStatus: { $first: '$status' },
                  lastDocCid: { $first: '$docCid' },
                  lastMileage: { $first: '$mileage' },
                  lastId: { $first: '$_id' },
                },
              },
            ],
            as: 'logStats',
          },
        },
        { $addFields: { logStats: { $arrayElemAt: ['$logStats', 0] } } },
        {
          $addFields: {
            logCount: { $ifNull: ['$logStats.count', 0] },
            lastLog: {
              $cond: [
                { $gt: [{ $ifNull: ['$logStats.count', 0] }, 0] },
                {
                  _id: '$logStats.lastId',
                  summary: '$logStats.lastSummary',
                  createdAt: '$logStats.lastLogAt',
                  status: '$logStats.lastStatus',
                  hash: '$logStats.lastHash',
                  docCid: '$logStats.lastDocCid',
                  mileage: '$logStats.lastMileage',
                },
                null,
              ],
            },
          },
        },
        { $project: { logStats: 0 } },
      ])
      .toArray();

    res.json({
      items: vehicles.map((v) => ({
        id: v._id?.toString(),
        vin: v.vin,
        metadata: v.metadata ?? {},
        createdAt: v.createdAt instanceof Date ? v.createdAt.toISOString() : v.createdAt,
        merkleRoot: v.merkleRoot ?? null,
        merkleUpdatedAt:
          v.merkleUpdatedAt instanceof Date ? v.merkleUpdatedAt.toISOString() : v.merkleUpdatedAt ?? null,
        logCount: v.logCount ?? 0,
        lastLog: v.lastLog
          ? {
              id: v.lastLog._id?.toString(),
              summary: v.lastLog.summary,
              createdAt:
                v.lastLog.createdAt instanceof Date ? v.lastLog.createdAt.toISOString() : v.lastLog.createdAt,
              status: v.lastLog.status,
              hash: v.lastLog.hash,
              docCid: v.lastLog.docCid ?? null,
              mileage: v.lastLog.mileage ?? null,
            }
          : null,
      })),
    });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// Get vehicle with logs
app.get('/api/vehicles/:id', async (req: Request, res: Response) => {
  try {
    await ensureDb();
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'invalid id' });
    const objectId = new ObjectId(id);
    const vehicle = await getDb().collection<VehicleDoc>('vehicles').findOne({ _id: objectId });
    if (!vehicle) return res.status(404).json({ error: 'not found' });
    const logs = await getDb()
      .collection<LogDoc>('logs')
      .find({ vehicleId: objectId })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      vehicle: {
        id: vehicle._id?.toString(),
        vin: vehicle.vin,
        metadata: vehicle.metadata ?? {},
        createdAt: vehicle.createdAt.toISOString(),
        merkleRoot: vehicle.merkleRoot ?? null,
        merkleUpdatedAt: vehicle.merkleUpdatedAt?.toISOString() ?? null,
      },
      logs: logs.map((l) => ({
        id: l._id?.toString(),
        summary: l.summary,
        parts: l.parts ?? [],
        mileage: l.mileage,
        docCid: l.docCid ?? null,
        createdAt: l.createdAt.toISOString(),
        previousHash: l.previousHash ?? null,
        hash: l.hash,
        status: l.status,
      })),
    });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// Add service log (hash/merkle placeholder)
app.post('/api/vehicles/:id/logs', async (req: Request, res: Response) => {
  try {
    await ensureDb();
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'invalid id' });
    const vehicleId = new ObjectId(id);
    const vehicle = await getDb().collection<VehicleDoc>('vehicles').findOne({ _id: vehicleId });
    if (!vehicle) return res.status(404).json({ error: 'vehicle not found' });

    const body = logSchema.parse(req.body);

    // previous hash (last log for this vehicle)
    const lastLog = await getDb()
      .collection<LogDoc>('logs')
      .find({ vehicleId })
      .sort({ createdAt: -1 })
      .limit(1)
      .next();

    const createdAt = new Date();
    const previousHash = lastLog?.hash ?? null;

    const canonical = canonicalJSONStringify({
      vin: vehicle.vin,
      summary: body.summary,
      parts: body.parts ?? [],
      mileage: body.mileage,
      docCid: body.docCid ?? null,
      previousHash,
      createdAt: createdAt.toISOString(),
    });
    const hash = sha256Hex(canonical);

    const log: LogDoc = { vehicleId, ...body, createdAt, previousHash, hash, status: 'LOCAL' };
    const r = await getDb().collection<LogDoc>('logs').insertOne(log);

    // recompute merkle root
    const hashesAsc = await getDb()
      .collection<LogDoc>('logs')
      .find({ vehicleId })
      .sort({ createdAt: 1 })
      .project<{ hash: string }>({ hash: 1, _id: 0 })
      .toArray();
    const root = merkleRoot(hashesAsc.map((h) => h.hash)) ?? null;

    await getDb().collection<VehicleDoc>('vehicles').updateOne(
      { _id: vehicleId },
      { $set: { merkleRoot: root, merkleUpdatedAt: new Date() } }
    );

    res.status(201).json({
      id: r.insertedId.toHexString(),
      hash,
      previousHash,
      merkleRoot: root,
      createdAt: createdAt.toISOString(),
    });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// Recent activity feed (latest logs)
app.get('/api/activity', async (req: Request, res: Response) => {
  try {
    await ensureDb();
    const rawLimit = Number(req.query.limit ?? 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 100) : 10;

    const items = await getDb()
      .collection<LogDoc>('logs')
      .aggregate<Array<Record<string, any>>>([
        { $sort: { createdAt: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'vehicles',
            localField: 'vehicleId',
            foreignField: '_id',
            as: 'vehicle',
          },
        },
        { $unwind: '$vehicle' },
        {
          $project: {
            _id: 1,
            summary: 1,
            mileage: 1,
            createdAt: 1,
            status: 1,
            hash: 1,
            docCid: 1,
            vehicle: {
              _id: '$vehicle._id',
              vin: '$vehicle.vin',
              metadata: '$vehicle.metadata',
            },
          },
        },
      ])
      .toArray();

    res.json({
      items: items.map((item) => ({
        id: item._id?.toString(),
        summary: item.summary,
        mileage: item.mileage,
        createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
        status: item.status,
        hash: item.hash,
        docCid: item.docCid ?? null,
        vehicle: {
          id: item.vehicle?._id?.toString(),
          vin: item.vehicle?.vin,
          metadata: item.vehicle?.metadata ?? {},
        },
      })),
    });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// Verify a log against current Merkle root
app.get('/api/vehicles/:id/verify', async (req: Request, res: Response) => {
  try {
    await ensureDb();
    const { id } = req.params;
    const { logId } = req.query as { logId?: string };
    if (!ObjectId.isValid(id) || !logId || !ObjectId.isValid(logId)) {
      return res.status(400).json({ error: 'invalid id/logId' });
    }
    const vehicleId = new ObjectId(id);
    const vehicle = await getDb().collection<VehicleDoc>('vehicles').findOne({ _id: vehicleId });
    if (!vehicle) return res.status(404).json({ error: 'vehicle not found' });

    const logsAsc = await getDb()
      .collection<LogDoc>('logs')
      .find({ vehicleId })
      .sort({ createdAt: 1 })
      .toArray();

    const root = vehicle.merkleRoot;
    if (!root) return res.status(400).json({ error: 'no merkle root yet' });

    const leaves = logsAsc.map((l) => l.hash);
    const idx = logsAsc.findIndex((l) => l._id?.toString() === logId);
    if (idx === -1) return res.status(404).json({ error: 'log not found' });

    const proof = merkleProof(leaves, idx);
    const verified = verifyProof(leaves[idx], proof, root);

    res.json({ logId, leafHash: leaves[idx], merkleRoot: root, proof, verified });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => console.log(`[autotrace] api listening on :${PORT}`));
