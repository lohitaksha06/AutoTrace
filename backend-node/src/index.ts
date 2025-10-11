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
    res.status(201).json({ id: r.insertedId, ...doc });
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
  const vehicle = await getDb().collection<VehicleDoc>('vehicles').findOne({ _id: new ObjectId(id) });
    if (!vehicle) return res.status(404).json({ error: 'not found' });
    const logs = await getDb().collection<LogDoc>('logs').find({ vehicleId: new ObjectId(id) }).sort({ createdAt: -1 }).toArray();
    res.json({ vehicle, logs });
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

    res.status(201).json({ id: r.insertedId, hash, previousHash, merkleRoot: root, createdAt });
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
