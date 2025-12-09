import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import {
  ActivityItem,
  Pagination,
  VehicleLog,
  VehicleSummary,
  createServiceLog,
  createVehicle,
  getRecentActivity,
  getVehicleDetail,
  listVehicles,
  verifyLog,
} from "../services/api";

const RTF = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

const RELATIVE_UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
  { unit: "year", seconds: 60 * 60 * 24 * 365 },
  { unit: "month", seconds: 60 * 60 * 24 * 30 },
  { unit: "week", seconds: 60 * 60 * 24 * 7 },
  { unit: "day", seconds: 60 * 60 * 24 },
  { unit: "hour", seconds: 60 * 60 },
  { unit: "minute", seconds: 60 },
  { unit: "second", seconds: 1 },
];

const numberFormatter = new Intl.NumberFormat();

function formatNumber(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "0";
  return numberFormatter.format(value);
}

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  let diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  for (const { unit, seconds } of RELATIVE_UNITS) {
    if (Math.abs(diffSeconds) >= seconds || unit === "second") {
      const value = Math.round(diffSeconds / seconds);
      return RTF.format(value, unit);
    }
  }
  return "just now";
}

function truncateVin(vin: string): string {
  if (!vin) return "—";
  return vin.length > 12 ? `${vin.slice(0, 12)}…` : vin;
}

function metadataString(metadata: Record<string, unknown> | undefined, key: string): string | undefined {
  if (!metadata) return undefined;
  const value = metadata[key];
  return typeof value === "string" ? value : undefined;
}

function describeVehicle(metadata: Record<string, unknown> | undefined): string {
  if (!metadata) return "Vehicle";
  const make = metadataString(metadata, "make");
  const model = metadataString(metadata, "model");
  const yearValue = metadata["year"];
  const year =
    typeof yearValue === "number"
      ? String(yearValue)
      : typeof yearValue === "string"
      ? yearValue
      : undefined;
  const name = [make, model].filter(Boolean).join(" ");
  return [year, name].filter(Boolean).join(" ") || make || "Vehicle";
}

function statusBadge(status: string | null | undefined) {
  const normalized = (status ?? "").toUpperCase();
  switch (normalized) {
    case "ON_CHAIN":
      return {
        label: "On-chain",
        className:
          "text-emerald-500 text-xs px-2 py-1 rounded border border-emerald-500/30 bg-emerald-500/10",
      };
    case "PENDING":
    case "LOCAL":
      return {
        label: "Pending",
        className:
          "text-amber-500 text-xs px-2 py-1 rounded border border-amber-500/30 bg-amber-500/10",
      };
    case "FAILED":
      return {
        label: "Failed",
        className:
          "text-red-500 text-xs px-2 py-1 rounded border border-red-500/30 bg-red-500/10",
      };
    default:
      return {
        label: status ?? "Unknown",
        className:
          "text-muted text-xs px-2 py-1 rounded border border-[#2a2a2f] bg-[#16161a]",
      };
  }
}

const VEHICLES_PER_PAGE = 5;
const ACTIVITY_PER_PAGE = 10;
const ACTIVITY_STATUS_OPTIONS = ["all", "ON_CHAIN", "PENDING", "LOCAL", "FAILED"] as const;
type ActivityStatusFilter = (typeof ACTIVITY_STATUS_OPTIONS)[number];

export default function Dashboard() {
  const [vehicleVin, setVehicleVin] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleMessage, setVehicleMessage] = useState<string | null>(null);
  const [vehicleLoading, setVehicleLoading] = useState(false);

  const [logVehicleId, setLogVehicleId] = useState("");
  const [logSummary, setLogSummary] = useState("");
  const [logMileage, setLogMileage] = useState("");
  const [logParts, setLogParts] = useState("");
  const [logDocCid, setLogDocCid] = useState("");
  const [logPerformedBy, setLogPerformedBy] = useState("");
  const [logMessage, setLogMessage] = useState<string | null>(null);
  const [logLoading, setLogLoading] = useState(false);

  const [verifyVehicleId, setVerifyVehicleId] = useState("");
  const [verifyLogId, setVerifyLogId] = useState("");
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [verifyProof, setVerifyProof] = useState<Array<{ pos: "L" | "R"; hash: string }> | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const [vehicles, setVehicles] = useState<VehicleSummary[]>([]);
  const [vehiclePage, setVehiclePage] = useState(1);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehiclePagination, setVehiclePagination] = useState<Pagination | null>(null);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);
  const [vehiclesRefreshKey, setVehiclesRefreshKey] = useState(0);

  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activitySearch, setActivitySearch] = useState("");
  const [activityStatus, setActivityStatus] = useState<ActivityStatusFilter>("all");
  const [activityPagination, setActivityPagination] = useState<Pagination | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);

  const [verifyLogs, setVerifyLogs] = useState<VehicleLog[]>([]);
  const [verifyLogsLoading, setVerifyLogsLoading] = useState(false);
  const [verifyLogsError, setVerifyLogsError] = useState<string | null>(null);
  const [verifyRefreshKey, setVerifyRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setVehiclesLoading(true);
    listVehicles({
      page: vehiclePage,
      perPage: VEHICLES_PER_PAGE,
      search: vehicleSearch || undefined,
    })
      .then((response) => {
        if (cancelled) return;
        setVehicles(response.items);
        setVehiclePagination(response.pagination);
        setVehiclesError(null);
        if (response.pagination.page !== vehiclePage) {
          setVehiclePage(response.pagination.page);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setVehicles([]);
        setVehiclePagination(null);
        setVehiclesError((err as Error).message);
      })
      .finally(() => {
        if (!cancelled) {
          setVehiclesLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [vehiclePage, vehicleSearch, vehiclesRefreshKey]);

  useEffect(() => {
    let cancelled = false;
    setActivityLoading(true);
    getRecentActivity({
      page: activityPage,
      perPage: ACTIVITY_PER_PAGE,
      search: activitySearch || undefined,
      status: activityStatus === "all" ? undefined : activityStatus,
    })
      .then((response) => {
        if (cancelled) return;
        setRecentActivity(response.items);
        setActivityPagination(response.pagination);
        setActivityError(null);
        if (response.pagination.page !== activityPage) {
          setActivityPage(response.pagination.page);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setRecentActivity([]);
        setActivityPagination(null);
        setActivityError((err as Error).message);
      })
      .finally(() => {
        if (!cancelled) {
          setActivityLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activityPage, activitySearch, activityStatus, activityRefreshKey]);

  useEffect(() => {
    if (vehicles.length === 0) {
      setLogVehicleId("");
      setVerifyVehicleId("");
      setVerifyLogs([]);
      setVerifyLogId("");
      return;
    }
    setLogVehicleId((current) => current || vehicles[0].id);
    setVerifyVehicleId((current) => current || vehicles[0].id);
  }, [vehicles]);

  useEffect(() => {
    if (!verifyVehicleId) {
      setVerifyLogs([]);
      setVerifyLogId("");
      setVerifyLogsError(null);
      return;
    }
    let cancelled = false;
    setVerifyLogsLoading(true);
    setVerifyLogsError(null);
    getVehicleDetail(verifyVehicleId)
      .then((detail) => {
        if (cancelled) return;
        setVerifyLogs(detail.logs);
        if (detail.logs.length > 0) {
          setVerifyLogId((prev) =>
            prev && detail.logs.some((log) => log.id === prev) ? prev : detail.logs[0].id
          );
        } else {
          setVerifyLogId("");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setVerifyLogs([]);
        setVerifyLogId("");
        setVerifyLogsError((err as Error).message);
      })
      .finally(() => {
        if (!cancelled) setVerifyLogsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [verifyVehicleId, verifyRefreshKey]);

  const totalVehicles = vehiclePagination?.total ?? vehicles.length;
  const totalLogs = activityPagination?.total ?? vehicles.reduce((sum, vehicle) => sum + (vehicle.logCount ?? 0), 0);

  const handleActivitySearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setActivitySearch(event.target.value);
    setActivityPage(1);
  };

  const handleActivityStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setActivityStatus(event.target.value as ActivityStatusFilter);
    setActivityPage(1);
  };

  const handleVehicleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setVehicleSearch(event.target.value);
    setVehiclePage(1);
  };

  const currentVehiclePage = vehiclePagination?.page ?? vehiclePage;
  const vehicleTotalPages = vehiclePagination?.totalPages ?? 0;
  const canPreviousVehiclePage = currentVehiclePage > 1;
  const canNextVehiclePage = vehicleTotalPages > 0 && currentVehiclePage < vehicleTotalPages;

  const currentActivityPage = activityPagination?.page ?? activityPage;
  const activityTotalPages = activityPagination?.totalPages ?? 0;
  const canPreviousActivityPage = currentActivityPage > 1;
  const canNextActivityPage = activityTotalPages > 0 && currentActivityPage < activityTotalPages;

  const handleVehicleSubmit = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    if (!vehicleVin.trim()) {
      setVehicleMessage("VIN is required");
      return;
    }
    setVehicleLoading(true);
    setVehicleMessage(null);
    try {
      const res = await createVehicle({
        vin: vehicleVin.trim(),
        metadata: vehicleMake ? { make: vehicleMake.trim() } : undefined,
      });
      setVehicleMessage(`Vehicle created. ID: ${res.id}`);
      setVehicleVin("");
      setVehicleMake("");
      setVehiclePage(1);
      setVehiclesRefreshKey((key) => key + 1);
    } catch (err) {
      setVehicleMessage((err as Error).message);
    } finally {
      setVehicleLoading(false);
    }
  };

  const handleLogSubmit = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    if (!logVehicleId.trim()) {
      setLogMessage("Vehicle ID is required");
      return;
    }
    if (!logSummary.trim()) {
      setLogMessage("Summary is required");
      return;
    }
    if (!logMileage.trim() || Number.isNaN(Number(logMileage))) {
      setLogMessage("Mileage must be a number");
      return;
    }
    setLogLoading(true);
    setLogMessage(null);
    try {
      const parts = logParts
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);

      const performedBy = logPerformedBy.trim();
      const res = await createServiceLog({
        vehicleId: logVehicleId.trim(),
        summary: logSummary.trim(),
        mileage: Number(logMileage),
        parts: parts.length ? parts : undefined,
        docCid: logDocCid.trim() || undefined,
        performedBy: performedBy || undefined,
      });
      const actorLabel = res.performedBy ? ` • by ${res.performedBy}` : "";
      setLogMessage(
        `Log added. Hash: ${res.hash.slice(0, 12)}… Merkle root: ${res.merkleRoot ?? "(pending)"}${actorLabel}`
      );
      setLogSummary("");
      setLogMileage("");
      setLogParts("");
      setLogDocCid("");
      setLogPerformedBy("");
      setVehiclesRefreshKey((key) => key + 1);
      setActivityPage(1);
      setActivityRefreshKey((key) => key + 1);
      if (logVehicleId.trim() && logVehicleId.trim() === verifyVehicleId.trim()) {
        setVerifyRefreshKey((key) => key + 1);
      }
    } catch (err) {
      setLogMessage((err as Error).message);
    } finally {
      setLogLoading(false);
    }
  };

  const handleVerifySubmit = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    if (!verifyVehicleId.trim() || !verifyLogId.trim()) {
      setVerifyMessage("Vehicle ID and Log ID are required");
      return;
    }
    setVerifyLoading(true);
    setVerifyMessage(null);
    setVerifyProof(null);
    try {
      const res = await verifyLog(verifyVehicleId.trim(), verifyLogId.trim());
      setVerifyMessage(res.verified ? "Proof verified ✅" : "Verification failed ❌");
      setVerifyProof(res.proof);
    } catch (err) {
      setVerifyMessage((err as Error).message);
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <main className="max-w-[1200px] mx-auto p-8">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl shadow-[0_8px_20px_rgba(239,68,68,0.35)] bg-gradient-to-br from-accent to-red-900" />
          <Link href="/" className="text-xl font-bold hover:text-red-400">AutoTrace</Link>
        </div>
        <nav className="flex items-center gap-3">
          <Link className="border border-neutral-800 text-fg px-3 py-2 rounded-lg" href="/">Home</Link>
          <Link className="border border-neutral-800 text-fg px-3 py-2 rounded-lg" href="/login">Login</Link>
          <Link className="bg-accent text-white px-3 py-2 rounded-lg hover:bg-red-500/90" href="/signup">Create account</Link>
        </nav>
      </header>

      {vehiclesError && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Failed to load vehicles: {vehiclesError}
        </div>
      )}
      {activityError && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Failed to load activity: {activityError}
        </div>
      )}

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="bg-[#0f0f12] border border-[#2a2a2f] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted text-sm">Vehicles Tracked</span>
            <span className="text-emerald-500 text-xs px-2 py-1 rounded border border-emerald-500/30 bg-emerald-500/10">+18%</span>
          </div>
          <div className="text-2xl font-bold">{vehiclesLoading ? "…" : formatNumber(totalVehicles)}</div>
        </article>
        <article className="bg-[#0f0f12] border border-[#2a2a2f] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted text-sm">Verified Service Logs</span>
            <span className="text-emerald-500 text-xs px-2 py-1 rounded border border-emerald-500/30 bg-emerald-500/10">+6%</span>
          </div>
          <div className="text-2xl font-bold">{activityLoading ? "…" : formatNumber(totalLogs)}</div>
        </article>
        <article className="bg-[#0f0f12] border border-[#2a2a2f] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted text-sm">Open Disputes</span>
            <span className="text-red-500 text-xs px-2 py-1 rounded border border-red-500/30 bg-red-500/10">+2</span>
          </div>
          <div className="text-2xl font-bold">14</div>
        </article>
        <article className="bg-[#0f0f12] border border-[#2a2a2f] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted text-sm">IPFS Storage</span>
          </div>
          <div className="text-2xl font-bold">128.6 GB</div>
        </article>
      </section>

      <div className="h-4" />

      {/* Split: Activity + Quick Actions */}
      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        {/* Recent Activity */}
        <article className="bg-[#0f0f12] border border-[#2a2a2f] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-base font-semibold">Recent Activity</div>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>Page {currentActivityPage}</span>
              {activityTotalPages > 0 && <span>of {activityTotalPages}</span>}
            </div>
          </div>
          <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <input
                className="w-full sm:w-64 bg-[#0b0c10] border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg placeholder:text-muted"
                placeholder="Search summary, VIN, performer…"
                value={activitySearch}
                onChange={handleActivitySearchChange}
              />
              <select
                className="bg-[#0b0c10] border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg"
                value={activityStatus}
                onChange={handleActivityStatusChange}
              >
                {ACTIVITY_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option === "all" ? "All statuses" : option}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                className="border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg hover:bg-red-500/10 disabled:opacity-50"
                onClick={() => canPreviousActivityPage && setActivityPage((page) => Math.max(page - 1, 1))}
                disabled={!canPreviousActivityPage || activityLoading}
                type="button"
              >
                Prev
              </button>
              <button
                className="border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg hover:bg-red-500/10 disabled:opacity-50"
                onClick={() => canNextActivityPage && setActivityPage((page) => page + 1)}
                disabled={!canNextActivityPage || activityLoading}
                type="button"
              >
                Next
              </button>
              <button
                className="border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg hover:bg-red-500/10 disabled:opacity-50"
                onClick={() => setActivityRefreshKey((key) => key + 1)}
                disabled={activityLoading}
                type="button"
              >
                Refresh
              </button>
            </div>
          </div>
          <div className="overflow-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-muted text-sm">
                  <th className="text-left font-semibold px-3 py-2">Time</th>
                  <th className="text-left font-semibold px-3 py-2">VIN</th>
                  <th className="text-left font-semibold px-3 py-2">Event</th>
                  <th className="text-left font-semibold px-3 py-2">Performed By</th>
                  <th className="text-left font-semibold px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {activityLoading && recentActivity.length === 0 && (
                  <tr className="border-t border-[#2a2a2f]">
                    <td colSpan={5} className="px-3 py-6 text-center text-muted text-sm">
                      Loading activity…
                    </td>
                  </tr>
                )}
                {!activityLoading && recentActivity.length === 0 && (
                  <tr className="border-t border-[#2a2a2f]">
                    <td colSpan={5} className="px-3 py-6 text-center text-muted text-sm">
                      No service events yet. Log your first maintenance record to populate this feed.
                    </td>
                  </tr>
                )}
                {recentActivity.map((item) => {
                  const badge = statusBadge(item.status);
                  const actor =
                    item.performedBy ??
                    metadataString(item.metadata, "performedBy") ??
                    metadataString(item.vehicle.metadata, "serviceCenter") ??
                    metadataString(item.vehicle.metadata, "actor") ??
                    metadataString(item.vehicle.metadata, "garage") ??
                    "—";
                  return (
                    <tr key={item.id ?? item.hash} className="border-t border-[#2a2a2f]">
                      <td className="px-3 py-3">{formatRelativeTime(item.createdAt)}</td>
                      <td className="px-3 py-3">{truncateVin(item.vehicle.vin)}</td>
                      <td className="px-3 py-3">{item.summary}</td>
                      <td className="px-3 py-3">{actor}</td>
                      <td className="px-3 py-3">
                        <span className={badge.className}>{badge.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>

        {/* Quick Actions */}
        <aside className="bg-[#0f0f12] border border-[#2a2a2f] rounded-xl p-4 space-y-6 bg-gradient-to-b from-red-900/40 to-transparent">
          <div>
            <div className="text-base font-semibold mb-3">Register Vehicle</div>
            <form className="grid gap-2" onSubmit={handleVehicleSubmit}>
              <label className="grid gap-1 text-sm">
                <span className="text-muted">VIN</span>
                <input
                  className="bg-[#0b0c10] border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg"
                  value={vehicleVin}
                  onChange={(e) => setVehicleVin(e.target.value)}
                  required
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted">Make (optional)</span>
                <input
                  className="bg-[#0b0c10] border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg"
                  value={vehicleMake}
                  onChange={(e) => setVehicleMake(e.target.value)}
                />
              </label>
              <button
                className="bg-accent text-white px-3 py-2 rounded-lg hover:bg-red-500/90 disabled:opacity-50"
                type="submit"
                disabled={vehicleLoading}
              >
                {vehicleLoading ? "Registering…" : "Register"}
              </button>
            </form>
            {vehicleMessage && (
              <div className="text-sm mt-2 text-muted leading-snug">{vehicleMessage}</div>
            )}
          </div>

          <div>
            <div className="text-base font-semibold mb-3">Add Service Log</div>
            <form className="grid gap-2" onSubmit={handleLogSubmit}>
              <label className="grid gap-1 text-sm">
                <span className="text-muted">Vehicle</span>
                {vehicles.length > 0 ? (
                  <select
                    className="bg-[#0b0c10] border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg"
                    value={logVehicleId}
                    onChange={(e) => setLogVehicleId(e.target.value)}
                    required
                  >
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {truncateVin(vehicle.vin)} · {describeVehicle(vehicle.metadata)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="bg-[#0b0c10] border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg"
                    value={logVehicleId}
                    onChange={(e) => setLogVehicleId(e.target.value)}
                    placeholder="Vehicle ID"
                    required
                  />
                )}
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted">Summary</span>
                <input
                  className="bg-[#0b0c10] border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg"
                  value={logSummary}
                  onChange={(e) => setLogSummary(e.target.value)}
                  required
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted">Mileage</span>
                <input
                  type="number"
                  min="0"
                  className="bg-[#0b0c10] border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg"
                  value={logMileage}
                  onChange={(e) => setLogMileage(e.target.value)}
                  required
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted">Parts (comma separated)</span>
                <input
                  className="bg-[#0b0c10] border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg"
                  value={logParts}
                  onChange={(e) => setLogParts(e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted">Document CID (optional)</span>
                <input
                  className="bg-[#0b0c10] border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg"
                  value={logDocCid}
                  onChange={(e) => setLogDocCid(e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted">Performed by (optional)</span>
                <input
                  className="bg-[#0b0c10] border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg"
                  value={logPerformedBy}
                  onChange={(e) => setLogPerformedBy(e.target.value)}
                  placeholder="Garage or technician name"
                />
              </label>
              <button
                className="bg-accent text-white px-3 py-2 rounded-lg hover:bg-red-500/90 disabled:opacity-50"
                type="submit"
                disabled={logLoading || !logVehicleId.trim()}
              >
                {logLoading ? "Submitting…" : "Submit Log"}
              </button>
            </form>
            {logMessage && (
              <div className="text-sm mt-2 text-muted leading-snug">{logMessage}</div>
            )}
            {!logVehicleId && vehicles.length === 0 && (
              <div className="text-xs text-muted mt-2">Register a vehicle first to enable logging.</div>
            )}
          </div>

          <div>
            <div className="text-base font-semibold mb-3">Verify Log</div>
            <form className="grid gap-2" onSubmit={handleVerifySubmit}>
              <label className="grid gap-1 text-sm">
                <span className="text-muted">Vehicle</span>
                {vehicles.length > 0 ? (
                  <select
                    className="bg-[#0b0c10] border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg"
                    value={verifyVehicleId}
                    onChange={(e) => setVerifyVehicleId(e.target.value)}
                    required
                  >
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {truncateVin(vehicle.vin)} · {describeVehicle(vehicle.metadata)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="bg-[#0b0c10] border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg"
                    value={verifyVehicleId}
                    onChange={(e) => setVerifyVehicleId(e.target.value)}
                    placeholder="Vehicle ID"
                    required
                  />
                )}
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted">Log</span>
                {verifyLogs.length > 0 ? (
                  <select
                    className="bg-[#0b0c10] border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg"
                    value={verifyLogId}
                    onChange={(e) => setVerifyLogId(e.target.value)}
                    required
                  >
                    {verifyLogs.map((log) => (
                      <option key={log.id} value={log.id}>
                        {new Date(log.createdAt).toLocaleString()} · {log.summary}
                        {log.performedBy ? ` (${log.performedBy})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="bg-[#0b0c10] border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg"
                    value={verifyLogId}
                    onChange={(e) => setVerifyLogId(e.target.value)}
                    placeholder="Log ID"
                    required
                    disabled={verifyLogsLoading}
                  />
                )}
              </label>
              {verifyLogsLoading && (
                <div className="text-xs text-muted">Loading logs…</div>
              )}
              {verifyLogsError && (
                <div className="text-xs text-red-400">{verifyLogsError}</div>
              )}
              <button
                className="border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg hover:bg-red-500/10 disabled:opacity-50"
                type="submit"
                disabled={verifyLoading || !verifyVehicleId || !verifyLogId}
              >
                {verifyLoading ? "Verifying…" : "Verify"}
              </button>
            </form>
            {verifyMessage && (
              <div className="text-sm mt-2 text-muted leading-snug">{verifyMessage}</div>
            )}
            {verifyProof && verifyProof.length > 0 && (
              <div className="mt-2 text-xs text-muted">
                <div className="font-semibold text-sm mb-1">Proof path:</div>
                <ul className="space-y-1">
                  {verifyProof.map((item, idx) => (
                    <li key={`${item.pos}-${idx}`}>
                      {item.pos} → {item.hash}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {verifyLogs.length === 0 && !verifyLogsLoading && verifyVehicleId && (
              <div className="mt-2 text-xs text-muted">
                No logs found for this vehicle yet.
              </div>
            )}
          </div>
        </aside>
      </section>

      <div className="h-4" />

      {/* My Garage (sample list) */}
      <section className="bg-[#0f0f12] border border-[#2a2a2f] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-base font-semibold">My Garage</div>
          <div className="flex items-center gap-2 text-xs text-muted">
            {vehiclePagination && vehiclePagination.total > 0 ? (
              <span>
                Page {currentVehiclePage} of {vehicleTotalPages || 1}
              </span>
            ) : (
              <span>{formatNumber(totalVehicles)} vehicles</span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
          <input
            className="w-full sm:w-64 bg-[#0b0c10] border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg placeholder:text-muted"
            placeholder="Search VIN, make, owner…"
            value={vehicleSearch}
            onChange={handleVehicleSearchChange}
          />
          <div className="flex items-center gap-2 text-xs">
            <button
              className="border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg hover:bg-red-500/10 disabled:opacity-50"
              onClick={() => canPreviousVehiclePage && setVehiclePage((page) => Math.max(page - 1, 1))}
              disabled={!canPreviousVehiclePage || vehiclesLoading}
              type="button"
            >
              Prev
            </button>
            <button
              className="border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg hover:bg-red-500/10 disabled:opacity-50"
              onClick={() => canNextVehiclePage && setVehiclePage((page) => page + 1)}
              disabled={!canNextVehiclePage || vehiclesLoading}
              type="button"
            >
              Next
            </button>
            <button
              className="border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg hover:bg-red-500/10 disabled:opacity-50"
              onClick={() => setVehiclesRefreshKey((key) => key + 1)}
              disabled={vehiclesLoading}
              type="button"
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="grid gap-2">
          {vehiclesLoading && vehicles.length === 0 && (
            <div className="text-sm text-muted">Loading vehicles…</div>
          )}
          {!vehiclesLoading && vehicles.length === 0 && (
            <div className="text-sm text-muted">
              No vehicles registered yet. Use the form above to create one.
            </div>
          )}
          {vehicles.map((vehicle) => {
            const lastLogText = vehicle.lastLog
              ? formatRelativeTime(vehicle.lastLog.createdAt)
              : "—";
            const performer = vehicle.lastLog?.performedBy ?? metadataString(vehicle.lastLog?.metadata, "performedBy");
            return (
              <div key={vehicle.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm gap-1 sm:gap-0">
                <span>
                  VIN {truncateVin(vehicle.vin)} • {describeVehicle(vehicle.metadata)}
                </span>
                <span className="text-muted">
                  {formatNumber(vehicle.logCount)} logs • last: {lastLogText}
                  {performer ? ` • by ${performer}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
