// Decision logic of the navigation progress bar. Pure (no React, no DOM) so it can be unit tested.
// The bar is client-only: it starts when an internal link is clicked and stops when the route
// changes or after a safety timeout. It never touches server rendering.

/** If the route never changes (failed navigation, same page), the bar hides itself after this long. */
export const NAV_PROGRESS_TIMEOUT_MS = 8000;

/** The parts of a click event the filter reads (a DOM MouseEvent satisfies it). */
export interface ClickLike {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
}

/** The parts of the clicked anchor the filter reads. `href` is the RESOLVED absolute URL (`a.href`). */
export interface AnchorLike {
  href: string;
  target: string | null;
  download: boolean;
}

/**
 * True when the click is a plain, same-origin, in-tab navigation to another page. Ignored:
 * modified or non-primary clicks, prevented clicks, new tabs/windows, downloads, other origins,
 * non-http(s) schemes, hash-only changes and links to the page you are already on.
 */
export function shouldStartProgress(
  click: ClickLike,
  anchor: AnchorLike | null,
  currentHref: string
): boolean {
  if (!anchor || !anchor.href) return false;
  if (click.button !== 0) return false;
  if (click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) return false;
  if (click.defaultPrevented) return false;
  if (anchor.download) return false;
  if (anchor.target && anchor.target !== '_self') return false;

  let target: URL;
  let current: URL;
  try {
    current = new URL(currentHref);
    target = new URL(anchor.href, current);
  } catch {
    return false;
  }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') return false;
  if (target.origin !== current.origin) return false;
  // Same path and query: only the hash differs (or nothing), so the route does not change.
  if (target.pathname === current.pathname && target.search === current.search) return false;
  return true;
}

export interface ProgressControllerOptions {
  timeoutMs?: number;
  schedule?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  cancel?: (id: ReturnType<typeof setTimeout>) => void;
}

export interface ProgressController {
  /** Shows the bar and (re)starts the safety timeout. */
  start(): void;
  /** Hides the bar and cancels the timeout (the route changed). No-op while hidden. */
  finish(): void;
  /** Cancels a scheduled timeout (unmount). Safe to call more than once. */
  dispose(): void;
}

export function createProgressController(
  setVisible: (visible: boolean) => void,
  options: ProgressControllerOptions = {}
): ProgressController {
  const timeoutMs = options.timeoutMs ?? NAV_PROGRESS_TIMEOUT_MS;
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
      setVisible(true);
      timer = schedule(() => {
        timer = null;
        setVisible(false);
      }, timeoutMs);
    },
    finish() {
      if (timer === null) return;
      clear();
      setVisible(false);
    },
    dispose: clear,
  };
}
