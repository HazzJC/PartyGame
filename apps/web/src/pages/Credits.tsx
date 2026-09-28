import { GAME_NAME, Logo } from '../ui/Logo.tsx';
import './landing.css';

const CREDITS: { what: string; who: string; licence: string; url: string }[] = [
  { what: 'Fredoka (display font)', who: 'Milena Brandão', licence: 'SIL Open Font License 1.1', url: 'https://fonts.google.com/specimen/Fredoka' },
  { what: 'Nunito (body font)', who: 'Vernon Adams, Cyreal, Jacques Le Bailly', licence: 'SIL Open Font License 1.1', url: 'https://fonts.google.com/specimen/Nunito' },
  { what: 'Font packaging', who: 'Fontsource', licence: 'MIT', url: 'https://fontsource.org' },
  { what: 'React', who: 'Meta and contributors', licence: 'MIT', url: 'https://react.dev' },
  { what: 'Valibot (message validation)', who: 'Fabian Hiller and contributors', licence: 'MIT', url: 'https://valibot.dev' },
  { what: 'node-qrcode', who: 'Ryan Day and contributors', licence: 'MIT', url: 'https://github.com/soldair/node-qrcode' },
  { what: 'Hosting: Workers and Durable Objects', who: 'Cloudflare (free plan)', licence: 'Service', url: 'https://workers.cloudflare.com' },
];

export default function Credits() {
  return (
    <div className="landing credits">
      <a href="/" aria-label={`${GAME_NAME} home`}>
        <Logo height={130} />
      </a>
      <section className="sticker credits-card">
        <h1>Credits</h1>
        <p>
          {GAME_NAME} is a party board game for up to 16 friends: one shared screen, and everyone plays on their own phone or laptop.
        </p>
        <p>
          <b>Art:</b> every animal, board piece, item and icon is hand-drawn SVG made for this game. <b>Sound:</b> every sound effect and music loop is synthesised live in your browser with WebAudio, so there are no audio files.
        </p>
        <h2>Open source and services</h2>
        <ul className="credits-list">
          {CREDITS.map((c) => (
            <li key={c.what}>
              <a href={c.url} target="_blank" rel="noreferrer">
                {c.what}
              </a>
              <span className="muted">
                {' '}
                · {c.who} · {c.licence}
              </span>
            </li>
          ))}
        </ul>
        <p className="muted">
          Some mini games are affectionate riffs on games we love: The Mind (Wolfgang Warsch), Herd Mentality (Big Potato Games), and Keep Talking and Nobody Explodes (Steel Crate Games). Go and play the originals.
        </p>
        <a className="btn white" href="/">
          Back
        </a>
      </section>
    </div>
  );
}
