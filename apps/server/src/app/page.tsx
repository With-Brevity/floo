export default function Home() {
  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>Finance API Server</h1>
      <p>This server provides Plaid and Stripe proxy endpoints.</p>
      <p>
        API routes are available at <code>/api/*</code>
      </p>
    </div>
  );
}
