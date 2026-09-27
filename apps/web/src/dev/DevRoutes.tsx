import { lazy } from 'react';

const InputLab = lazy(() => import('./InputLab.tsx'));

export default function DevRoutes({ path }: { path: string[] }) {
  if (path[0] === 'input-lab') return <InputLab />;
  return (
    <div className="center" style={{ minHeight: '100%', padding: 24 }}>
      <div className="panel stack">
        <h2>Dev tools</h2>
        <a href="/dev/input-lab">Input Lab</a>
        <p className="muted">Unknown dev page: {path.join('/') || '(none)'}</p>
      </div>
    </div>
  );
}
