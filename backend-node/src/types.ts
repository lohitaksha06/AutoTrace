import { ObjectId } from 'mongodb';

export type VehicleDoc = {
  _id?: ObjectId;
  vin: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  merkleRoot?: string | null;
  merkleUpdatedAt?: Date;
};

export type LogDoc = {
  _id?: ObjectId;
  vehicleId: ObjectId;
  summary: string;
  parts?: string[];
  mileage: number;
  docCid?: string;
  createdAt: Date;
  previousHash?: string | null;
  hash: string;
  status: 'PENDING' | 'ON_CHAIN' | 'FAILED' | 'LOCAL';
};
