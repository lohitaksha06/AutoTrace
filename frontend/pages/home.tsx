import Link from "next/link";

export default function HomePage() {
  return (
    <main className="max-w-[900px] mx-auto p-8">
      <header className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl shadow-[0_8px_20px_rgba(239,68,68,0.35)] bg-gradient-to-br from-accent to-red-900" />
          <Link href="/" className="text-xl font-bold hover:text-red-400">AutoTrace</Link>
        </div>
        <nav className="flex items-center gap-3">
          <Link className="border border-neutral-800 text-fg px-3 py-2 rounded-lg" href="/login">Login</Link>
          <Link className="bg-accent text-white px-3 py-2 rounded-lg hover:bg-red-500/90" href="/signup">Create account</Link>
        </nav>
      </header>

      <section className="grid gap-4">
        <h1 className="text-3xl font-extrabold">Welcome to AutoTrace</h1>
        <p className="text-muted max-w-prose">
          A tamper-evident vehicle lifecycle registry powered by blockchain.
          Track service logs, ownership transfers, and documents with transparency.
        </p>
        <div className="flex gap-3 mt-2">
          <Link href="/" className="bg-accent text-white px-4 py-2 rounded-lg hover:bg-red-500/90">Go to Dashboard</Link>
          <Link href="/login" className="border border-[#2a2a2f] text-fg px-4 py-2 rounded-lg hover:bg-red-500/10">Login</Link>
        </div>
      </section>
    </main>
  );
}
