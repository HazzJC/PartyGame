import { lazy } from 'react';

const InputLab = lazy(() => import('./InputLab.tsx'));
const MinigameHarness = lazy(() => import('./MinigameHarness.tsx'));

export default function DevRoutes({ path }: { path: string[] }) {
  if (path[0] === 'input-lab') return <InputLab />;
  if (path[0] === 'minigame' && path[1]) return <MinigameHarness gameId={path[1]} />;
  return (
    <div className="center" style={{ minHeight: '100%', padding: 24 }}>
      <div className="panel stack">
        <h2>Dev tools</h2>
        <a href="/dev/input-lab">Input Lab</a>
        <a href="/dev/minigame/lowest-unique">Lowest Unique Number</a>
        <a href="/dev/minigame/stopwatch-chicken">Stopwatch Chicken</a>
        <a href="/dev/minigame/count-to">Count Together</a>
        <a href="/dev/minigame/tug-of-war">Tug of War</a>
        <a href="/dev/minigame/hunter-vs-hiders">Hunter vs Hiders</a>
        <p className="muted">Unknown dev page: {path.join('/') || '(none)'}</p>
      </div>
    </div>
  );
}
