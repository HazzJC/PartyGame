import type { HostView } from '@partygame/engine';
import { DRAW_PALETTE, MAX_PLAYERS, strokePath, type Stroke } from '@partygame/shared';
import { useState, useSyncExternalStore } from 'react';
import type { Connection } from '../net/connection.ts';
import { joinLink } from '../net/storage.ts';
import { Avatar } from '../ui/Avatar.tsx';
import { Qr } from '../ui/Qr.tsx';
import { PlayHere, useHostSeat } from './PlayHere.tsx';
import { GameOptions } from '../ui/GameSettings.tsx';
import { Logo } from '../ui/Logo.tsx';
import { sound } from '../audio/sound.ts';

const LENGTHS = [
  { id: 'quick', label: 'Quick', detail: '8 rounds · ~25 min' },
  { id: 'standard', label: 'Standard', detail: '12 rounds · ~40 min' },
  { id: 'long', label: 'Long', detail: '20 rounds · ~70 min' },
] as const;

export function HostLobby({ conn, view }: { conn: Connection<HostView>; view: HostView }) {
  const [playOpen, setPlayOpen] = useState(false);
  const [optsOpen, setOptsOpen] = useState(false);
  const [soundMessage, setSoundMessage] = useState('');
  const audioState = useSyncExternalStore((fn) => sound.subscribe(fn), () =>
    !sound.running ? 'Click to enable audio' : sound.settings.muted || sound.settings.volume === 0 || sound.settings.sfx === 0 ? 'Muted' : 'Audio ready');
  const hostSeat = useHostSeat(view.code, view);
  const url = joinLink(view.code);
  const site = url.replace(/^https?:\/\//, '').replace(/\/[A-Z]{4}$/, '');
  const humans = view.seats.filter((s) => !s.isBot).length;
  const length = LENGTHS.find((l) => l.id === view.settings.length) ?? LENGTHS[1];
  const doodles = (view.phase.doodles ?? {}) as Record<string, Stroke[]>;
  const nudges = (view.phase.nudges ?? {}) as Record<string, { x: number; y: number }>;

  return (
    <div className="hl">
      <div className="hl-left">
        <h1 className="hl-title">
          <Logo height={168} />
        </h1>
        <div className="sticker hl-join">
          {/* The address gets its own full-width line, sized to stay on one line however long the domain. */}
          <div className="hl-join-url" style={{ fontSize: joinFont(site) }}>
            Join at <b>{site}</b>
          </div>
          <div className="hl-code" aria-label="Room code">
            {view.code}
          </div>
          <div className="hl-qr">
            {/* Upper case fits QR's denser alphanumeric mode: fewer, bigger squares that scan better off a stream. */}
            <Qr text={url.toUpperCase()} size={190} label={`Join ${view.code}`} />
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
          <div className="hl-opts-row">
            <span className="muted">{optionSummary(view.settings, (view.phase.catalogue as unknown[] | undefined)?.length ?? 0)}</span>
            <button className="btn white small" onClick={() => setOptsOpen(true)}>
              Options
            </button>
          </div>
        </div>

        {/* Compact, so the column still fits the stage: one row of status, then a hint (or the test result). */}
        <div className="hl-sound sticker">
          <div className="hl-sound-head">
            <b>Host audio</b>
            <span className="chip" role="status">
              {audioState}
            </span>
            <button type="button" className="btn white small" onClick={async () => setSoundMessage((await sound.testSound()) ? 'Sound check played on this host.' : 'Unmute and raise volume, then try again.')}>
              Test sound
            </button>
          </div>
          <p>{soundMessage || 'Share this tab with audio in Discord so remote players can hear music and effects.'}</p>
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
      {optsOpen && (
        <div className="modal-back" onClick={() => setOptsOpen(false)}>
          <div className="panel modal hl-opts" role="dialog" aria-label="Game options" onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2>Game options</h2>
              <button className="btn green" onClick={() => setOptsOpen(false)}>
                Done
              </button>
            </div>
            <GameOptions conn={conn} view={view} />
          </div>
        </div>
      )}
    </div>
  );
}

/** One line under the game length: the other options at a glance. */
/** Font size (px) for "Join at <site>" to fit the join card's width on one line. */
function joinFont(site: string): number {
  const chars = site.length + 8;
  // Fredoka averages about 0.56 em per character; the card's text width is about 560 px.
  return Math.max(18, Math.min(34, Math.floor(560 / (chars * 0.56))));
}

function optionSummary(s: HostView['settings'], total: number): string {
  const parts = [`Movement: ${s.movement === 'cards' ? 'cards' : 'dice'}`];
  if (s.teamBoard) parts.push('Team board');
  if (s.tutorial) parts.push('Intro on');
  const off = s.removedGames.length;
  if (total) parts.push(`${total - Math.min(off, total)}/${total} games`);
  return parts.join(' · ');
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
