import Link from "next/link";

export default function Dashboard() {
  return (
    <main style={{ padding: "2rem", maxWidth: 960, margin: "0 auto" }}>
      <h1>Dashboard</h1>
      <p>Welcome to AutoTrace.</p>
      <nav style={{ marginTop: "1rem" }}>
        <Link href="/login" style={{ marginRight: 16 }}>Login</Link>
        <Link href="/signup">Sign up</Link>
      </nav>
    </main>
  );
}
