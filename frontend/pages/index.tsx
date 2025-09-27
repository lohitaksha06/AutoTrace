import Link from "next/link";

export default function Dashboard() {
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
        <aside className="bg-[#0f0f12] border border-[#2a2a2f] rounded-xl p-4 bg-gradient-to-b from-red-900/40 to-transparent">
          <div className="text-base font-semibold mb-2">Quick Actions</div>
          <div className="grid gap-2">
            <button className="bg-accent text-white px-3 py-2 rounded-lg hover:bg-red-500/90">Add Service Log</button>
            <button className="border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg hover:bg-red-500/10">Register Vehicle</button>
            <button className="border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg hover:bg-red-500/10">Transfer Ownership</button>
            <button className="border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg hover:bg-red-500/10">Open Dispute</button>
          </div>
          <div className="text-muted text-sm mt-2">
            These are placeholders. Hook them to your API or contracts later.
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
