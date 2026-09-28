import type { HostView } from '@partygame/engine';
import { DRAW_PALETTE, MAX_PLAYERS, strokePath, type Stroke } from '@partygame/shared';
import { useState } from 'react';
import type { Connection } from '../net/connection.ts';
import { joinLink } from '../net/storage.ts';
import { Avatar } from '../ui/Avatar.tsx';
import { Qr } from '../ui/Qr.tsx';
import { PlayHere, useHostSeat } from './PlayHere.tsx';
import { GameOptions } from '../ui/GameSettings.tsx';

const LENGTHS = [
  { id: 'quick', label: 'Quick', detail: '8 rounds · ~25 min' },
  { id: 'standard', label: 'Standard', detail: '12 rounds · ~40 min' },
  { id: 'long', label: 'Long', detail: '20 rounds · ~70 min' },
] as const;

export function HostLobby({ conn, view }: { conn: Connection<HostView>; view: HostView }) {
  const [playOpen, setPlayOpen] = useState(false);
  const hostSeat = useHostSeat(view.code, view);
  const url = joinLink(view.code);
  const humans = view.seats.filter((s) => !s.isBot).length;
  const length = LENGTHS.find((l) => l.id === view.settings.length) ?? LENGTHS[1];
  const doodles = (view.phase.doodles ?? {}) as Record<string, Stroke[]>;
  const nudges = (view.phase.nudges ?? {}) as Record<string, { x: number; y: number }>;

  return (
    <div className="hl">
      <div className="hl-left">
        <h1 className="hl-title">Party Board</h1>
        <div className="sticker hl-join">
          <div className="stack" style={{ gap: 8 }}>
            <div className="hl-join-url">Join at {url.replace(/^https?:\/\//, '').replace(/\/[A-Z]{4}$/, '')}</div>
            <div className="hl-code" aria-label="Room code">
              {view.code}
            </div>
          </div>
          <div className="hl-qr">
            <Qr text={url} size={210} />
          </div>
        </div>

        <div className="sticker hl-settings">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="display">Game length</span>
            <span className="muted" style={{ fontSize: 24 }}>
              {length.detail}
            </span>
          </div>
          <div className="seg" role="group" aria-label="Game length">
            {LENGTHS.map((l) => (
              <button
                key={l.id}
                aria-pressed={view.settings.length === l.id}
                onClick={() => conn.host({ action: 'settings', settings: { length: l.id } })}
              >
                {l.label}
              </button>
            ))}
          </div>
          <GameOptions conn={conn} view={view} />
        </div>

        <button className={`btn big ${hostSeat ? 'white' : 'purple'}`} onClick={() => setPlayOpen(true)} style={{ alignSelf: 'flex-start' }}>
          {hostSeat ? (
            <>
              <Avatar avatar={hostSeat.avatar} size={44} /> You're playing as {hostSeat.name}
            </>
          ) : (
            'Play from this computer or your phone'
          )}
        </button>
      </div>

      <div className="hl-right">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 56 }}>
            Players <span className="muted">{view.seats.length}/{MAX_PLAYERS}</span>
          </h2>
          <div className="row">
            <button className="btn white" onClick={() => conn.host({ action: 'addBot' })} disabled={view.seats.length >= MAX_PLAYERS}>
              + Bot
            </button>
            {view.seats.some((s) => s.isBot) && (
              <button className="btn white" onClick={() => conn.host({ action: 'removeBots' })}>
                Clear bots
              </button>
            )}
          </div>
        </div>
        <div className="hl-players">
          {Array.from({ length: MAX_PLAYERS }, (_, i) => {
            const s = view.seats[i];
            if (!s) return <div key={`empty${i}`} className="hl-slot empty">{i === view.seats.length ? 'Waiting…' : ''}</div>;
            return (
              <div key={s.id} className="hl-slot filled" data-seat={s.id}>
                {doodles[s.id]?.length ? <Doodle strokes={doodles[s.id]!} /> : null}
                <div className="hl-av" style={{ transform: `translate(${(nudges[s.id]?.x ?? 0) * 34}px, ${(nudges[s.id]?.y ?? 0) * 22}px)` }}>
                  <Avatar avatar={s.avatar} size={104} dim={!s.connected} />
                </div>
                <span className="name">{s.name}</span>
                {s.vip && <span className="hl-badge">VIP</span>}
                {s.isBot && <span className="hl-badge bot">BOT</span>}
                {!s.connected && <span className="hl-badge away">away</span>}
                {s.connected && s.device && !s.isBot && <span className="hl-device" title={s.device}>{s.device === 'touch' ? '📱' : '💻'}</span>}
              </div>
            );
          })}
        </div>
        <div className="hl-actions">
          <button className="btn green big" onClick={() => conn.host({ action: 'start' })} disabled={view.seats.length < 2}>
            Start game
          </button>
          <button className="btn white" onClick={() => conn.host({ action: 'toy', toy: 'calibrate' })}>
            Stream check
          </button>
          <button className="btn white" onClick={() => conn.host({ action: 'toy', toy: 'reaction' })}>
            Reaction test
          </button>
          {view.phase.notice ? (
            <div className="sticker hl-notice">{view.phase.notice}</div>
          ) : (
            <span className="muted" style={{ fontSize: 28 }}>
              {humans === 0 ? 'Scan the code to join. Everyone plays on their own device.' : 'The VIP can start the game from their phone too.'}
            </span>
          )}
        </div>
      </div>

      {playOpen && <PlayHere view={view} onClose={() => setPlayOpen(false)} />}
    </div>
  );
}

function Doodle({ strokes }: { strokes: Stroke[] }) {
  return (
    <svg className="hl-doodle" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {strokes.map((st, i) => (
        <path key={i} d={strokePath(st)} stroke={DRAW_PALETTE[st.c]} strokeWidth={st.w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}
