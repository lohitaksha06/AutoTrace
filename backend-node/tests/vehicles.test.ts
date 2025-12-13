import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Express } from 'express';

type EnsureDb = () => Promise<void>;
type ClearDatabase = () => Promise<void>;
type DisconnectDb = () => Promise<void>;

describe('GET /api/vehicles role filtering', () => {
  let mongo: MongoMemoryServer;
  let app: Express;
  let ensureDbFn: EnsureDb;
  let clearDatabaseFn: ClearDatabase;
  let disconnectDbFn: DisconnectDb;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongo.getUri();
    process.env.DB_NAME = 'autotrace_test';
    process.env.NODE_ENV = 'test';

    const mod = await import('../src/index');
    app = mod.app;
    ensureDbFn = mod.ensureDb;
    clearDatabaseFn = mod.clearDatabase;
    disconnectDbFn = mod.disconnectDb;

    await ensureDbFn();
  }, 20000);

  beforeEach(async () => {
    await clearDatabaseFn();
  });

  afterAll(async () => {
    await disconnectDbFn();
    await mongo.stop();
  });

  async function seedVehicles() {
    const owner = await request(app)
      .post('/api/vehicles')
      .send({ vin: 'VINOWNER123456789', metadata: { make: 'Ford', role: 'Owner' } });
    expect(owner.status).toBe(201);

    const garage = await request(app)
      .post('/api/vehicles')
      .send({ vin: 'VINGARAGE1234567', metadata: { make: 'Tesla' } });
    expect(garage.status).toBe(201);

    const garageLog = await request(app)
      .post(`/api/vehicles/${garage.body.id}/logs`)
      .send({
        summary: 'Brake replacement',
        mileage: 1200,
        metadata: { ownerRole: 'Garage partner' },
      });
    expect(garageLog.status).toBe(201);

    return {
      ownerId: owner.body.id as string,
      ownerVin: owner.body.vin as string,
      garageId: garage.body.id as string,
      garageVin: garage.body.vin as string,
    };
  }

  it('returns all vehicles when no role filter is provided', async () => {
    const { ownerId, garageId } = await seedVehicles();

    const res = await request(app).get('/api/vehicles');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    const ids = res.body.items.map((item: any) => item.id);
    expect(ids).toContain(ownerId);
    expect(ids).toContain(garageId);
    expect(res.body.pagination.total).toBe(2);
  });

  it('filters vehicles by role values stored on vehicle metadata', async () => {
    const { ownerId } = await seedVehicles();

    const res = await request(app).get('/api/vehicles').query({ role: 'owner' });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].id).toBe(ownerId);
    expect(res.body.pagination.total).toBe(1);
  });

  it('filters vehicles by metadata derived from the most recent log', async () => {
    const { garageId } = await seedVehicles();

    const res = await request(app).get('/api/vehicles').query({ role: 'garage' });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].id).toBe(garageId);
    expect(res.body.pagination.total).toBe(1);
  });

  it('returns no vehicles when the requested role is absent', async () => {
    await seedVehicles();

    const res = await request(app).get('/api/vehicles').query({ role: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
    expect(res.body.pagination.total).toBe(0);
  });
});
