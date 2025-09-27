export default function LoginPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
      <section className="w-full max-w-md bg-[#0f0f12] border border-[#2a2a2f] rounded-xl p-6 shadow-[0_8px_30px_rgba(239,68,68,0.10)]">
        <h1 className="text-2xl font-bold mb-4">Login</h1>
        <form className="grid gap-4">
          <label className="grid gap-1 text-sm">
            <span className="text-muted">Email</span>
            <input name="email" type="email" required className="w-full bg-[#0b0c10] border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted">Password</span>
            <input name="password" type="password" required className="w-full bg-[#0b0c10] border border-[#2a2a2f] text-fg px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50" />
          </label>
          <button type="submit" className="mt-2 bg-accent hover:bg-red-500/90 text-white px-4 py-2 rounded-lg">Sign in</button>
        </form>
      </section>
    </main>
  );
}
