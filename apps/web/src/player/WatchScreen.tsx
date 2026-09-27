/** The player screen during reveals and other moments where the shared screen has the action. */
export function WatchScreen({ text = 'Watch the screen' }: { text?: string }) {
  return (
    <div className="ps-watch">
      <div className="ps-watch-icon" aria-hidden>
        👀
      </div>
      <h2>{text}</h2>
    </div>
  );
}
