const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

type FetchOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
};

function buildQuery(params?: Record<string, string | number | undefined | null>): string {
  if (!params) return "";
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export type CreateVehicleInput = {
  vin: string;
  metadata?: Record<string, unknown>;
};

export type CreateVehicleResponse = {
  id: string;
  vin: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  merkleRoot: string | null;
  merkleUpdatedAt: string | null;
};

export function createVehicle(input: CreateVehicleInput) {
  return apiFetch<CreateVehicleResponse>("/api/vehicles", {
    method: "POST",
    body: input,
  });
}

export type VehicleSummary = {
  id: string;
  vin: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  merkleRoot: string | null;
  merkleUpdatedAt: string | null;
  logCount: number;
  lastLog: null | {
    id: string;
    summary: string;
    createdAt: string;
    status: string;
    hash: string;
    docCid: string | null;
    mileage: number | null;
    performedBy: string | null;
    metadata: Record<string, unknown>;
  };
};

export type Pagination = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

export type ListVehiclesParams = {
  page?: number;
  perPage?: number;
  search?: string;
};

export type ListVehiclesResponse = {
  items: VehicleSummary[];
  pagination: Pagination;
};

export function listVehicles(params?: ListVehiclesParams) {
  return apiFetch<ListVehiclesResponse>(`/api/vehicles${buildQuery(params)}`);
}

export type CreateLogInput = {
  vehicleId: string;
  summary: string;
  parts?: string[];
  mileage: number;
  docCid?: string;
  performedBy?: string;
  metadata?: Record<string, unknown>;
};

export type CreateLogResponse = {
  id: string;
  hash: string;
  previousHash: string | null;
  merkleRoot: string | null;
  createdAt: string;
  performedBy: string | null;
};

export function createServiceLog(input: CreateLogInput) {
  return apiFetch<CreateLogResponse>(`/api/vehicles/${input.vehicleId}/logs`, {
    method: "POST",
    body: {
      summary: input.summary,
      parts: input.parts,
      mileage: input.mileage,
      docCid: input.docCid,
      performedBy: input.performedBy,
      metadata: input.metadata,
    },
  });
}

export type VerifyLogResponse = {
  logId: string;
  leafHash: string;
  merkleRoot: string;
  proof: Array<{ pos: "L" | "R"; hash: string }>;
  verified: boolean;
};

export function verifyLog(vehicleId: string, logId: string) {
  const params = new URLSearchParams({ logId });
  return apiFetch<VerifyLogResponse>(`/api/vehicles/${vehicleId}/verify?${params.toString()}`);
}

export type VehicleLog = {
  id: string;
  summary: string;
  parts: string[];
  mileage: number;
  docCid: string | null;
  performedBy: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  previousHash: string | null;
  hash: string;
  status: string;
};

export type VehicleDetailResponse = {
  vehicle: {
    id: string;
    vin: string;
    metadata: Record<string, unknown>;
    createdAt: string;
    merkleRoot: string | null;
    merkleUpdatedAt: string | null;
  };
  logs: VehicleLog[];
};

export function getVehicleDetail(vehicleId: string) {
  return apiFetch<VehicleDetailResponse>(`/api/vehicles/${vehicleId}`);
}

export type ActivityItem = {
  id: string;
  summary: string;
  mileage: number;
  createdAt: string;
  status: string;
  hash: string;
  docCid: string | null;
  performedBy: string | null;
  metadata: Record<string, unknown>;
  vehicle: {
    id: string;
    vin: string;
    metadata: Record<string, unknown>;
  };
};

export type ActivityQuery = {
  page?: number;
  perPage?: number;
  status?: string;
  search?: string;
  vin?: string;
  vehicleId?: string;
};

export type ActivityResponse = {
  items: ActivityItem[];
  pagination: Pagination;
};

export function getRecentActivity(params?: ActivityQuery) {
  return apiFetch<ActivityResponse>(`/api/activity${buildQuery(params)}`);
}
