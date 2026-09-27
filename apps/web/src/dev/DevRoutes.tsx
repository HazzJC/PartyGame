import { lazy } from 'react';

const InputLab = lazy(() => import('./InputLab.tsx'));
const MinigameHarness = lazy(() => import('./MinigameHarness.tsx'));

export default function DevRoutes({ path }: { path: string[] }) {
  if (path[0] === 'input-lab') return <InputLab />;
  if (path[0] === 'minigame' && path[1]) return <MinigameHarness gameId={path[1]} />;
  if (path[0] === 'board') return <MinigameHarness gameId={null} />;
  return (
    <div className="center" style={{ minHeight: '100%', padding: 24 }}>
      <div className="panel stack">
        <h2>Dev tools</h2>
        <a href="/dev/input-lab">Input Lab</a>
        <a href="/dev/board?n=4&dev=items,duel,shop">Board with items, a duel and the shop</a>
        <a href="/dev/minigame/lowest-unique">Lowest Unique Number</a>
        <a href="/dev/minigame/stopwatch-chicken">Stopwatch Chicken</a>
        <a href="/dev/minigame/count-to">Count Together</a>
        <a href="/dev/minigame/tug-of-war">Tug of War</a>
        <a href="/dev/minigame/hunter-vs-hiders">Hunter vs Hiders</a>
        <a href="/dev/minigame/quick-draw">Quick Draw</a>
        <a href="/dev/minigame/silent-trample">Silent Trample</a>
        <a href="/dev/minigame/pick-a-door">Pick a Door</a>
        <a href="/dev/minigame/pick-a-door-setter">Pick a Door: Trap-setter</a>
        <a href="/dev/minigame/deep-sea-sonar">Deep Sea Sonar</a>
        <a href="/dev/minigame/raft-gamble">Raft Gamble</a>
        <a href="/dev/minigame/crumble-tower">Crumble Tower</a>
        <a href="/dev/minigame/herd-mentality">Herd Mentality</a>
        <a href="/dev/minigame/odd-one-out">Odd One Out</a>
        <a href="/dev/minigame/who-wrote-that">Who Wrote That?</a>
        <a href="/dev/minigame/predict-the-crowd">Predict the Crowd</a>
        <a href="/dev/minigame/sumo-programming">Sumo Programming</a>
        <a href="/dev/minigame/artillery">Artillery Trajectory</a>
        <a href="/dev/minigame/artillery-fortress">Artillery: Fortress</a>
        <a href="/dev/minigame/heist">Planned Movement Heist</a>
        <a href="/dev/minigame/heist-guard">Heist: Guard</a>
        <a href="/dev/minigame/land-grab">Land Grab</a>
        <a href="/dev/minigame/synchronised-pulse">Synchronised Pulse</a>
        <a href="/dev/minigame/mirror-maze">Mirror Maze Optics</a>
        <a href="/dev/minigame/radar-beacon">Radar Beacon</a>
        <a href="/dev/minigame/blind-architect">Blind Architect</a>
        <a href="/dev/minigame/recipe-assembly">Recipe Assembly Line</a>
        <a href="/dev/minigame/runaway-switchboard">Runaway Switchboard</a>
        <a href="/dev/minigame/pressure-valve">Pressure Valve Balancer</a>
        <a href="/dev/minigame/the-mind">The Mind</a>
        <a href="/dev/minigame/collaborative-quilt">Collaborative Quilt</a>
        <a href="/dev/minigame/defuse-circuit">Defuse the Circuit</a>
        <a href="/dev/minigame/meteor-shield">Meteor Shield Array</a>
        <p className="muted">Unknown dev page: {path.join('/') || '(none)'}</p>
      </div>
    </div>
  );
}
