import { CODE_LENGTH, normaliseCode } from '@partygame/shared';
import { useState, type FormEvent } from 'react';
import { navigate } from '../router.ts';
import { Avatar } from '../ui/Avatar.tsx';
import { Logo } from '../ui/Logo.tsx';
import './landing.css';

export function Landing({ notFound = false }: { notFound?: boolean }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(notFound ? 'That page does not exist. Enter a room code instead.' : null);

  function join(e: FormEvent) {
    e.preventDefault();
    const c = normaliseCode(code);
    if (!c) return setError(`Room codes are ${CODE_LENGTH} letters.`);
    navigate(`/${c}`);
  }

  return (
    <main className="landing">
      <header className="landing-hero">
        <div className="landing-avatars" aria-hidden>
          {[0, 2, 4, 11, 1, 9].map((a, i) => (
            <Avatar key={a} avatar={a} size={64} className="pop-in" />
          ))}
        </div>
        <h1 className="landing-title">
          <Logo height={170} />
        </h1>
        <p className="landing-tag">A board game for 2 to 16 friends. One shared screen, everyone plays on their own phone or laptop.</p>
      </header>

      <section className="landing-cards">
        <form className="panel stack landing-card" onSubmit={join}>
          <h2>Join a game</h2>
          <p className="muted">Type the 4 letters shown on the shared screen.</p>
          <input
            className="field code-field"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, CODE_LENGTH));
              setError(null);
            }}
            placeholder="ABCD"
            aria-label="Room code"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            enterKeyHint="go"
          />
          {error && <p className="error-text">{error}</p>}
          <button className="btn blue big block" type="submit" disabled={code.length !== CODE_LENGTH}>
            Join
          </button>
        </form>

        <div className="panel stack landing-card">
          <h2>Host a game</h2>
          <p className="muted">
            Open this on the computer you will screen-share on Discord (or plug into the TV). You can play too, from a second window or your phone.
          </p>
          <button className="btn big block" onClick={() => navigate('/host')}>
            Host a game
          </button>
        </div>
      </section>
      <footer className="landing-foot muted">
        <a href="/dev/input-lab">Try your device</a> · Nothing to install · Free
      </footer>
      <footer className="landing-foot">
        <a href="/credits">Credits</a>
      </footer>
    </main>
  );
}
