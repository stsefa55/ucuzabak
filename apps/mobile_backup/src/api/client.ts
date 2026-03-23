export type ApiDelayOptions = {
  minMs?: number;
  maxMs?: number;
};

export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function withMockDelay<T>(fn: () => T, delay: ApiDelayOptions = { minMs: 250, maxMs: 650 }): Promise<T> {
  const minMs = delay.minMs ?? 250;
  const maxMs = delay.maxMs ?? 650;
  const ms = Math.floor(minMs + Math.random() * Math.max(0, maxMs - minMs));
  await sleep(ms);
  return fn();
}

