// Expo Router static rendering runs without browser frame APIs. Reanimated's
// reduced-motion and CSS transition helpers still probe them during SSR.
if (typeof globalThis.requestAnimationFrame === "undefined") {
  globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 16) as unknown as number;
  globalThis.cancelAnimationFrame = (handle?: number | null) => { if (typeof handle === "number") clearTimeout(handle); };
}
