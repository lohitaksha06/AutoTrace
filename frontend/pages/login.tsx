export default function LoginPage() {
  return (
    <main style={{ padding: "2rem", maxWidth: 480, margin: "0 auto" }}>
      <h1>Login</h1>
      <form style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <label>
          Email
          <input name="email" type="email" required style={{ width: "100%", padding: 8, marginTop: 4 }} />
        </label>
        <label>
          Password
          <input name="password" type="password" required style={{ width: "100%", padding: 8, marginTop: 4 }} />
        </label>
        <button type="submit" style={{ padding: "8px 12px" }}>Sign in</button>
      </form>
    </main>
  );
}
