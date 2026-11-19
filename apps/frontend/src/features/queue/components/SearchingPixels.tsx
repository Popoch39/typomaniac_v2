const PIXEL_DELAYS = ["0s", "0.2s", "0.4s", "0.6s", "0.8s"];

export function SearchingPixels() {
  return (
    <div aria-hidden="true" className="flex gap-1.5">
      {PIXEL_DELAYS.map((delay) => (
        <span
          key={delay}
          className="size-3.5 animate-pixel-blink border-2 border-key-outline bg-key-face motion-reduce:animate-none"
          style={{ animationDelay: delay }}
        />
      ))}
    </div>
  );
}
