export default function HomePage() {
  return (
    <main style={{ padding: "2rem", maxWidth: 960, margin: "0 auto" }}>
      <h1>Dashboard</h1>
      <p>Welcome to AutoTrace.</p>
      <nav style={{ marginTop: "1rem" }}>
        <a href="/login" style={{ marginRight: 16 }}>Login</a>
        <a href="/signup">Sign up</a>
      </nav>
    </main>
  );
}
