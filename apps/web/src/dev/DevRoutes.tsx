export default function DevRoutes({ path }: { path: string[] }) {
  return (
    <div className="center" style={{ minHeight: '100%', padding: 24 }}>
      <div className="panel stack">
        <h2>Dev tools</h2>
        <p className="muted">Unknown dev page: {path.join('/') || '(none)'}</p>
      </div>
    </div>
  );
}
