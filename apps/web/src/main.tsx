import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/700.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import './styles/base.css';
import { normaliseCode } from '@partygame/shared';
import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { Landing } from './pages/Landing.tsx';
import { useLocation } from './router.ts';
import { applyDisplayPrefs } from './ui/prefs.ts';

const HostCreate = lazy(() => import('./pages/HostCreate.tsx'));
const HostPage = lazy(() => import('./host/HostPage.tsx'));
const PlayerPage = lazy(() => import('./player/PlayerPage.tsx'));
const DevRoutes = lazy(() => import('./dev/DevRoutes.tsx'));
const Credits = lazy(() => import('./pages/Credits.tsx'));

applyDisplayPrefs();
matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', applyDisplayPrefs);

function App() {
  const path = useLocation();
  const parts = path.split('/').filter(Boolean);
  let page;
  if (parts.length === 0) page = <Landing />;
  else if (parts[0] === 'host' && parts.length === 1) page = <HostCreate />;
  else if (parts[0] === 'host' && parts[1] && normaliseCode(parts[1])) page = <HostPage code={normaliseCode(parts[1])!} />;
  else if (parts[0] === 'dev') page = <DevRoutes path={parts.slice(1)} />;
  else if (parts[0] === 'credits' && parts.length === 1) page = <Credits />;
  else if (parts.length === 1 && normaliseCode(parts[0]!)) page = <PlayerPage code={normaliseCode(parts[0]!)!} />;
  else page = <Landing notFound />;
  return <Suspense fallback={<div className="center" style={{ height: '100%' }}><h2>Loading…</h2></div>}>{page}</Suspense>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
