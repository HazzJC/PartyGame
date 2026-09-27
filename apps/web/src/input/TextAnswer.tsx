import { useEffect, useRef, useState, type FormEvent } from 'react';

/**
 * Short text answers. On phones the native keyboard pushes the layout up (visualViewport-aware
 * via `interactive-widget=resizes-content`), and the field scrolls into view when focused.
 */
export function TextAnswer({
  onSubmit,
  placeholder = 'Your answer',
  maxLength = 40,
  locked = false,
  submitted,
  autoFocus = true,
}: {
  onSubmit: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
  locked?: boolean;
  /** The answer already sent, shown as a sticker when locked. */
  submitted?: string | null;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = input.current;
    if (!el) return;
    const onFocus = () => setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250);
    el.addEventListener('focus', onFocus);
    return () => el.removeEventListener('focus', onFocus);
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t || locked) return;
    onSubmit(t);
    setText('');
  }

  if (locked && submitted)
    return (
      <div className="text-sent sticker">
        <span className="muted">You said</span>
        <b>{submitted}</b>
      </div>
    );

  return (
    <form className="text-answer" onSubmit={submit}>
      <input
        ref={input}
        className="field"
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, maxLength))}
        placeholder={placeholder}
        maxLength={maxLength}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCorrect="on"
        enterKeyHint="send"
        disabled={locked}
      />
      <button className="btn blue" disabled={!text.trim() || locked}>
        Send
      </button>
    </form>
  );
}
