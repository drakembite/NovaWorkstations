// A tiny injectable clock so time-dependent copy (promotion event statuses) can be tested at
// fixed instants. Production code calls `now()`; tests call `setClock()` / `resetClock()`.

let provider: () => Date = () => new Date();

export function now(): Date {
  return provider();
}

export function setClock(fn: () => Date): void {
  provider = fn;
}

export function resetClock(): void {
  provider = () => new Date();
}
