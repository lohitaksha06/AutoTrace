import Link from "next/link";
import { FormEvent, useState } from "react";
import { createServiceLog, createVehicle, verifyLog } from "../services/api";

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
  const [logMessage, setLogMessage] = useState<string | null>(null);
  const [logLoading, setLogLoading] = useState(false);

  const [verifyVehicleId, setVerifyVehicleId] = useState("");
  const [verifyLogId, setVerifyLogId] = useState("");
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [verifyProof, setVerifyProof] = useState<Array<{ pos: "L" | "R"; hash: string }> | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

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

      const res = await createServiceLog({
        vehicleId: logVehicleId.trim(),
        summary: logSummary.trim(),
        mileage: Number(logMileage),
        parts: parts.length ? parts : undefined,
        docCid: logDocCid.trim() || undefined,
      });
      setLogMessage(
        `Log added. Hash: ${res.hash.slice(0, 12)}… Merkle root: ${res.merkleRoot ?? "(pending)"}`
      );
      setLogSummary("");
      setLogMileage("");
      setLogParts("");
      setLogDocCid("");
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

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="bg-[#0f0f12] border border-[#2a2a2f] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted text-sm">Vehicles Tracked</span>
            <span className="text-emerald-500 text-xs px-2 py-1 rounded border border-emerald-500/30 bg-emerald-500/10">+18%</span>
          </div>
          <div className="text-2xl font-bold">1,248</div>
        </article>
        <article className="bg-[#0f0f12] border border-[#2a2a2f] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted text-sm">Verified Service Logs</span>
            <span className="text-emerald-500 text-xs px-2 py-1 rounded border border-emerald-500/30 bg-emerald-500/10">+6%</span>
          </div>
          <div className="text-2xl font-bold">9,432</div>
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
            <div className="flex gap-2">
              <input className="flex-1 bg-[#0b0c10] border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg placeholder:text-muted" placeholder="Search VIN, owner, or service…" />
              <button className="border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg hover:bg-red-500/10">Filter</button>
            </div>
          </div>
          <div className="overflow-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-muted text-sm">
                  <th className="text-left font-semibold px-3 py-2">Time</th>
                  <th className="text-left font-semibold px-3 py-2">VIN</th>
                  <th className="text-left font-semibold px-3 py-2">Event</th>
                  <th className="text-left font-semibold px-3 py-2">By</th>
                  <th className="text-left font-semibold px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[#2a2a2f]">
                  <td className="px-3 py-3">2m ago</td>
                  <td className="px-3 py-3">1HGCM82633A0…</td>
                  <td className="px-3 py-3">Service log added (brake pads)</td>
                  <td className="px-3 py-3">Garage X</td>
                  <td className="px-3 py-3"><span className="text-emerald-500 text-xs px-2 py-1 rounded border border-emerald-500/30 bg-emerald-500/10">On-chain</span></td>
                </tr>
                <tr className="border-t border-[#2a2a2f]">
                  <td className="px-3 py-3">18m ago</td>
                  <td className="px-3 py-3">3CZRE38509G2…</td>
                  <td className="px-3 py-3">Ownership transferred</td>
                  <td className="px-3 py-3">Dealer Nova</td>
                  <td className="px-3 py-3"><span className="text-amber-500 text-xs px-2 py-1 rounded border border-amber-500/30 bg-amber-500/10">Pinning</span></td>
                </tr>
                <tr className="border-t border-[#2a2a2f]">
                  <td className="px-3 py-3">1h ago</td>
                  <td className="px-3 py-3">WAUZZZ8K6EA0…</td>
                  <td className="px-3 py-3">Document uploaded (invoice.pdf)</td>
                  <td className="px-3 py-3">Garage Prime</td>
                  <td className="px-3 py-3"><span className="text-amber-500 text-xs px-2 py-1 rounded border border-amber-500/30 bg-amber-500/10">Pinning</span></td>
                </tr>
                <tr className="border-t border-[#2a2a2f]">
                  <td className="px-3 py-3">3h ago</td>
                  <td className="px-3 py-3">JTDKB20U7933…</td>
                  <td className="px-3 py-3">Dispute opened (odometer)</td>
                  <td className="px-3 py-3">Buyer-42</td>
                  <td className="px-3 py-3"><span className="text-red-500 text-xs px-2 py-1 rounded border border-red-500/30 bg-red-500/10">Review</span></td>
                </tr>
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
                <span className="text-muted">Vehicle ID</span>
                <input
                  className="bg-[#0b0c10] border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg"
                  value={logVehicleId}
                  onChange={(e) => setLogVehicleId(e.target.value)}
                  required
                />
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
              <button
                className="bg-accent text-white px-3 py-2 rounded-lg hover:bg-red-500/90 disabled:opacity-50"
                type="submit"
                disabled={logLoading}
              >
                {logLoading ? "Submitting…" : "Submit Log"}
              </button>
            </form>
            {logMessage && (
              <div className="text-sm mt-2 text-muted leading-snug">{logMessage}</div>
            )}
          </div>

          <div>
            <div className="text-base font-semibold mb-3">Verify Log</div>
            <form className="grid gap-2" onSubmit={handleVerifySubmit}>
              <label className="grid gap-1 text-sm">
                <span className="text-muted">Vehicle ID</span>
                <input
                  className="bg-[#0b0c10] border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg"
                  value={verifyVehicleId}
                  onChange={(e) => setVerifyVehicleId(e.target.value)}
                  required
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted">Log ID</span>
                <input
                  className="bg-[#0b0c10] border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg"
                  value={verifyLogId}
                  onChange={(e) => setVerifyLogId(e.target.value)}
                  required
                />
              </label>
              <button
                className="border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg hover:bg-red-500/10 disabled:opacity-50"
                type="submit"
                disabled={verifyLoading}
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
          </div>
        </aside>
      </section>

      <div className="h-4" />

      {/* My Garage (sample list) */}
      <section className="bg-[#0f0f12] border border-[#2a2a2f] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-base font-semibold">My Garage</div>
          <Link className="text-accent font-semibold hover:text-red-400" href="#">View all →</Link>
        </div>
        <div className="grid gap-2">
          <div className="flex justify-between text-sm">
            <span>VIN 1HGCM82633A0… • Honda Accord • 2019</span>
            <span className="text-muted">9 logs • last: 2m</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>VIN WAUZZZ8K6EA0… • Audi A4 • 2014</span>
            <span className="text-muted">22 logs • last: 1h</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>VIN JTDKB20U7933… • Toyota Prius • 2009</span>
            <span className="text-muted">15 logs • last: 3h</span>
          </div>
        </div>
      </section>
    </main>
  );
}
