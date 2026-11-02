import {createRoot} from 'react-dom/client';
import {installApiFetchInterceptor} from './utils/apiConfig';
import App from './App.tsx';
import './index.css';

// Stabilize ResizeObserver callbacks with requestAnimationFrame to prevent synchronous layout loops
// and suppress benign Chromium "ResizeObserver loop completed with undelivered notifications." warnings
if (typeof window !== 'undefined') {
  const isResizeObserverLoopMsg = (msg: unknown) =>
    typeof msg === 'string' &&
    (msg.includes('ResizeObserver loop completed with undelivered notifications') ||
      msg.includes('ResizeObserver loop limit exceeded'));

  window.addEventListener(
    'error',
    (event: ErrorEvent) => {
      if (isResizeObserverLoopMsg(event.message) || isResizeObserverLoopMsg(event.error?.message)) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    },
    true,
  );

  if (typeof window.ResizeObserver !== 'undefined') {
    const NativeResizeObserver = window.ResizeObserver;
    class SafeResizeObserver extends NativeResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        let rafId: number | null = null;
        super((entries, observer) => {
          if (rafId !== null) {
            window.cancelAnimationFrame(rafId);
          }
          rafId = window.requestAnimationFrame(() => {
            rafId = null;
            try {
              callback(entries, observer);
            } catch (err: any) {
              if (!isResizeObserverLoopMsg(err?.message)) {
                console.warn('[ResizeObserver] Callback warning:', err);
              }
            }
          });
        });
      }
    }
    try {
      window.ResizeObserver = SafeResizeObserver;
    } catch {
      // Ignore if environment defines ResizeObserver as read-only
    }
  }
}

installApiFetchInterceptor();

createRoot(document.getElementById('root')!).render(<App />);

