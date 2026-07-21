import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!offlineReady && !needRefresh) return null;

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <div className="update-toast">
      <span>
        {needRefresh ? 'A new version is available.' : 'App ready to work offline.'}
      </span>
      <div className="update-toast-actions">
        {needRefresh && (
          <button type="button" className="button-primary" onClick={() => updateServiceWorker(true)}>
            Reload
          </button>
        )}
        <button type="button" onClick={close}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
