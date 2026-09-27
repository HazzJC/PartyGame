import { useEffect, useState } from 'react';
import { api } from '../net/api.ts';
import { hostStore } from '../net/storage.ts';
import { navigate } from '../router.ts';

/** /host → creates a room, keeps the host token in this tab, then shows the host screen. */
export default function HostCreate() {
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    api
      .createRoom()
      .then(({ code, hostToken }) => {
        if (!live) return;
        hostStore.set(code, hostToken);
        navigate(`/host/${code}`, { replace: true });
      })
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, []);
  return (
    <div className="center" style={{ height: '100%', padding: 16 }}>
      <div className="panel stack" style={{ textAlign: 'center' }}>
        <h2>{error ? 'Could not create a room' : 'Setting up the table…'}</h2>
        {error && (
          <>
            <p className="muted">{error}</p>
            <button className="btn" onClick={() => location.reload()}>
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
