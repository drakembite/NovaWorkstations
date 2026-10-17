// Pending state of the buy link. Pure logic (no React, no DOM) so it can be unit tested:
// the link shows a short, non-blocking "Abriendo…" state after a click and then goes back to
// "Comprar". It never touches the href, the navigation or the click beacon.

export const BUY_LABEL = 'Comprar';
export const BUY_PENDING_LABEL = 'Abriendo…';
/** How long the pending state lasts after a click. */
export const BUY_PENDING_MS = 1500;

/** Visible label for the buy link. Server-rendered HTML always uses `pending = false`. */
export function buyLabel(pending: boolean): string {
  return pending ? BUY_PENDING_LABEL : BUY_LABEL;
}

export interface PendingTimerOptions {
  duration?: number;
  schedule?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  cancel?: (id: ReturnType<typeof setTimeout>) => void;
}

export interface PendingTimer {
  /** Turns the pending flag on and schedules its reset. Restarts the window on repeated clicks. */
  start(): void;
  /** Cancels a scheduled reset (unmount). Safe to call more than once. */
  dispose(): void;
}

export function createPendingTimer(
  setPending: (pending: boolean) => void,
  options: PendingTimerOptions = {}
): PendingTimer {
  const duration = options.duration ?? BUY_PENDING_MS;
  // Resolve the globals at call time so tests can substitute them.
  const schedule = options.schedule ?? ((fn, ms) => setTimeout(fn, ms));
  const cancel = options.cancel ?? ((id) => clearTimeout(id));
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clear = () => {
    if (timer !== null) {
      cancel(timer);
      timer = null;
    }
  };

  return {
    start() {
      clear();
      setPending(true);
      timer = schedule(() => {
        timer = null;
        setPending(false);
      }, duration);
    },
    dispose: clear,
  };
}
