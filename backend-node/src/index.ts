import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import type { Document } from 'mongodb';
import { z } from 'zod';
import { canonicalJSONStringify, merkleProof, merkleRoot, sha256Hex, verifyProof } from './crypto';
import type { LogDoc, VehicleDoc } from './types';

export const app = express();
app.use(cors());
app.use(express.json());

// Mongo setup
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'autotrace';
const client = new MongoClient(MONGO_URI);
let connected = false;

export function getDb() { return client.db(DB_NAME); }

export async function ensureDb(): Promise<void> {
  if (!connected) {
    await client.connect();
    // warm indexes
    const d = getDb();
    await d.collection('logs').createIndex({ vehicleId: 1, createdAt: 1 });
    await d.collection('vehicles').createIndex({ vin: 1 }, { unique: true });
    connected = true;
  }
}

export async function clearDatabase(): Promise<void> {
  await ensureDb();
  const db = getDb();
  await Promise.all([
    db.collection('logs').deleteMany({}),
    db.collection('vehicles').deleteMany({}),
  ]);
}

export async function disconnectDb(): Promise<void> {
  if (connected) {
    await client.close();
    connected = false;
  }
}

const MAX_PAGE_SIZE = 100;
const LOG_STATUSES = new Set(['LOCAL', 'PENDING', 'ON_CHAIN', 'FAILED']);

function clampPageSize(raw: unknown, fallback: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  const coerced = Math.trunc(parsed);
  if (coerced <= 0) return fallback;
  return Math.min(coerced, MAX_PAGE_SIZE);
}

function clampPage(raw: unknown, fallback: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  const coerced = Math.trunc(parsed);
  return coerced >= 1 ? coerced : fallback;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
const logSchema = z.object({
  summary: z.string().min(1),
  parts: z.array(z.string().min(1)).optional(),
  mileage: z.number().int().nonnegative(),
  docCid: z.string().min(1).optional(),
  performedBy: z.string().min(1).max(120).optional(),
  metadata: z.record(z.any()).optional(),
});

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

    const page = clampPage(req.query.page ?? 1, 1);
    const perPage = clampPageSize(req.query.perPage ?? req.query.limit ?? 25, 25);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const roleFilterRaw = typeof req.query.role === 'string' ? req.query.role.trim().toLowerCase() : '';
    const roleFilter = roleFilterRaw && roleFilterRaw !== 'all' ? roleFilterRaw : null;

    const filter: Document = {};
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      filter.$or = [
        { vin: regex },
        { 'metadata.make': regex },
        { 'metadata.model': regex },
        { 'metadata.owner': regex },
      ];
    }

    const vehicleCollection = getDb().collection<VehicleDoc>('vehicles');

    const basePipeline: Document[] = [];
    if (Object.keys(filter).length > 0) {
      basePipeline.push({ $match: filter });
    }

    basePipeline.push(
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
                lastPerformedBy: { $first: '$performedBy' },
                lastMetadata: { $first: '$metadata' },
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
          roleCandidates: {
            $setUnion: [
              {
                $map: {
                  input: {
                    $filter: {
                      input: [
                        '$metadata.role',
                        '$metadata.ownerRole',
                        '$metadata.owner_role',
                        '$metadata.ownerType',
                        '$metadata.owner_type',
                        '$metadata.type',
                        '$metadata.category',
                      ],
                      as: 'val',
                      cond: {
                        $and: [
                          { $ne: ['$$val', null] },
                          { $eq: [{ $type: '$$val' }, 'string'] },
                          { $gt: [{ $strLenCP: { $trim: { input: '$$val' } } }, 0] },
                        ],
                      },
                    },
                  },
                  as: 'val',
                  in: { $toLower: { $trim: { input: '$$val' } } },
                },
              },
              {
                $map: {
                  input: {
                    $filter: {
                      input: [
                        '$logStats.lastMetadata.role',
                        '$logStats.lastMetadata.ownerRole',
                        '$logStats.lastMetadata.owner_role',
                        '$logStats.lastMetadata.ownerType',
                        '$logStats.lastMetadata.owner_type',
                        '$logStats.lastMetadata.type',
                        '$logStats.lastMetadata.category',
                      ],
                      as: 'val',
                      cond: {
                        $and: [
                          { $ne: ['$$val', null] },
                          { $eq: [{ $type: '$$val' }, 'string'] },
                          { $gt: [{ $strLenCP: { $trim: { input: '$$val' } } }, 0] },
                        ],
                      },
                    },
                  },
                  as: 'val',
                  in: { $toLower: { $trim: { input: '$$val' } } },
                },
              },
            ],
          },
        },
      },
    );

    if (roleFilter) {
      basePipeline.push({
        $match: {
          $expr: {
            $anyElementTrue: {
              $map: {
                input: { $ifNull: ['$roleCandidates', []] },
                as: 'candidate',
                in: {
                  $gte: [{ $strIndexOfCP: ['$$candidate', roleFilter] }, 0],
                },
              },
            },
          },
        },
      });
    }

    const countPipeline = [...basePipeline, { $count: 'count' }];
    const countResult = await vehicleCollection.aggregate(countPipeline).toArray();
    const total = countResult[0]?.count ?? 0;
    const totalPages = total === 0 ? 0 : Math.ceil(total / perPage);
    const currentPage = totalPages === 0 ? 1 : Math.min(page, totalPages);
    const skip = totalPages === 0 ? 0 : (currentPage - 1) * perPage;

    const vehicles = await vehicleCollection
      .aggregate([
        ...basePipeline,
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: perPage },
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
                  performedBy: '$logStats.lastPerformedBy',
                  metadata: '$logStats.lastMetadata',
                },
                null,
              ],
            },
          },
        },
        { $project: { logStats: 0, roleCandidates: 0 } },
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
              performedBy: v.lastLog.performedBy ?? null,
              metadata: v.lastLog.metadata ?? {},
            }
          : null,
      })),
      pagination: {
        page: currentPage,
        perPage,
        total,
        totalPages,
      },
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
        performedBy: l.performedBy ?? null,
        metadata: l.metadata ?? {},
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

    const payload = logSchema.parse(req.body);
    const parts = payload.parts?.map((p) => p.trim()).filter(Boolean) ?? [];
    const performedBy = payload.performedBy ? payload.performedBy.trim() : undefined;
    const docCid = payload.docCid ? payload.docCid.trim() : undefined;
    const metadata = payload.metadata ?? undefined;

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
      summary: payload.summary,
      parts,
      mileage: payload.mileage,
      docCid: docCid ?? null,
      performedBy: performedBy ?? null,
      metadata: metadata ?? {},
      previousHash,
      createdAt: createdAt.toISOString(),
    });
    const hash = sha256Hex(canonical);

    const log: LogDoc = {
      vehicleId,
      summary: payload.summary,
      parts,
      mileage: payload.mileage,
      docCid,
      performedBy,
      metadata,
      createdAt,
      previousHash,
      hash,
      status: 'LOCAL',
    };
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
      performedBy: performedBy ?? null,
    });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// Recent activity feed (latest logs)
app.get('/api/activity', async (req: Request, res: Response) => {
  try {
    await ensureDb();

    const page = clampPage(req.query.page ?? 1, 1);
    const perPage = clampPageSize(req.query.perPage ?? req.query.limit ?? 10, 10);
    const statusRaw = typeof req.query.status === 'string' ? req.query.status.trim().toUpperCase() : '';
    const status = LOG_STATUSES.has(statusRaw) ? statusRaw : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const vinQuery = typeof req.query.vin === 'string' ? req.query.vin.trim() : '';
    const vehicleIdQuery = typeof req.query.vehicleId === 'string' ? req.query.vehicleId.trim() : '';

    const basePipeline: Document[] = [];
    const match: Document = {};
    if (status) match.status = status;
    if (vehicleIdQuery && ObjectId.isValid(vehicleIdQuery)) {
      match.vehicleId = new ObjectId(vehicleIdQuery);
    }
    if (Object.keys(match).length > 0) {
      basePipeline.push({ $match: match });
    }

    basePipeline.push(
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicleId',
          foreignField: '_id',
          as: 'vehicle',
        },
      },
      { $unwind: '$vehicle' },
    );

    if (vinQuery) {
      const regex = new RegExp(escapeRegex(vinQuery), 'i');
      basePipeline.push({ $match: { 'vehicle.vin': regex } });
    }

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      basePipeline.push({
        $match: {
          $or: [
            { summary: regex },
            { performedBy: regex },
            { hash: regex },
            { 'vehicle.vin': regex },
          ],
        },
      });
    }

    const collection = getDb().collection<LogDoc>('logs');
    const countResult = await collection.aggregate([...basePipeline, { $count: 'count' }]).toArray();
    const total = countResult[0]?.count ?? 0;
    const totalPages = total === 0 ? 0 : Math.ceil(total / perPage);
    const currentPage = totalPages === 0 ? 1 : Math.min(page, totalPages);
    const skip = totalPages === 0 ? 0 : (currentPage - 1) * perPage;

    const items = await collection
      .aggregate<Array<Record<string, any>>>([
        ...basePipeline,
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: perPage },
        {
          $project: {
            _id: 1,
            summary: 1,
            mileage: 1,
            createdAt: 1,
            status: 1,
            hash: 1,
            docCid: 1,
            performedBy: 1,
            metadata: 1,
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
        performedBy: item.performedBy ?? null,
        metadata: item.metadata ?? {},
        vehicle: {
          id: item.vehicle?._id?.toString(),
          vin: item.vehicle?.vin,
          metadata: item.vehicle?.metadata ?? {},
        },
      })),
      pagination: {
        page: currentPage,
        perPage,
        total,
        totalPages,
      },
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

if (process.env.NODE_ENV !== 'test') {
  const PORT = Number(process.env.PORT || 4000);
  app.listen(PORT, () => console.log(`[autotrace] api listening on :${PORT}`));
}
