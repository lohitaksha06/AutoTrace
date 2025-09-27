import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import { z } from 'zod';

const app = express();
app.use(cors());
app.use(express.json());

// Mongo setup
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'autotrace';
const client = new MongoClient(MONGO_URI);
let db = client.db(DB_NAME);

async function ensureDb() {
  if (!client.topology?.isConnected()) {
    await client.connect();
    db = client.db(DB_NAME);
  }
}

// Health
app.get('/health', async (_req, res) => {
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
app.post('/api/vehicles', async (req, res) => {
  try {
    await ensureDb();
    const body = vehicleSchema.parse(req.body);
    const doc = { ...body, createdAt: new Date() };
    const r = await db.collection('vehicles').insertOne(doc);
    res.status(201).json({ id: r.insertedId, ...doc });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// Get vehicle with logs
app.get('/api/vehicles/:id', async (req, res) => {
  try {
    await ensureDb();
    const { id } = req.params;
    const vehicle = await db.collection('vehicles').findOne({ _id: new (await import('mongodb')).ObjectId(id) });
    if (!vehicle) return res.status(404).json({ error: 'not found' });
    const logs = await db.collection('logs').find({ vehicleId: id }).sort({ createdAt: -1 }).toArray();
    res.json({ vehicle, logs });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// Add service log (hash/merkle placeholder)
app.post('/api/vehicles/:id/logs', async (req, res) => {
  try {
    await ensureDb();
    const { id } = req.params;
    const body = logSchema.parse(req.body);
    // TODO: call Rust via WASM or N-API to compute hash and merkle root
    const log = { vehicleId: id, ...body, status: 'PENDING', createdAt: new Date() };
    const r = await db.collection('logs').insertOne(log);
    // TODO: optional: enqueue chain anchoring job and return job id
    res.status(201).json({ id: r.insertedId, ...log });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => console.log(`[autotrace] api listening on :${PORT}`));
