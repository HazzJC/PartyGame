import { GAME_NAME, Logo } from '../ui/Logo.tsx';
import './landing.css';

const MUSIC: { what: string; who: string; url: string; use: string }[] = [
  { what: 'Flowerbed Fields [Loop]', who: 'Zane Little Music', url: 'https://opengameart.org/content/flowerbed-fields-loop', use: 'lobby' },
  { what: 'Happy Clappy Loop', who: 'OwlishMedia', url: 'https://opengameart.org/content/happy-clappy-loop', use: 'board' },
  { what: 'Dance Field', who: 'Centurion_of_war', url: 'https://opengameart.org/content/dance-field', use: 'mini games' },
  { what: 'Joyfully', who: 'MintoDog', url: 'https://opengameart.org/content/joyfully', use: 'mini games and podium' },
  { what: 'Porkymon Battle Theme', who: 'Joth', url: 'https://opengameart.org/content/porkymon-battle-theme', use: 'duels' },
];

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
          <b>Art:</b> every animal, board piece, item and icon is hand-drawn SVG made for this game. <b>Sound effects</b> are synthesised live in your browser with WebAudio.
        </p>
        <h2>Music (CC0, via OpenGameArt)</h2>
        <ul className="credits-list">
          {MUSIC.map((m) => (
            <li key={m.what}>
              <a href={m.url} target="_blank" rel="noreferrer">
                {m.what}
              </a>
              <span className="muted">
                {' '}
                · {m.who} · {m.use}
              </span>
            </li>
          ))}
        </ul>
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
