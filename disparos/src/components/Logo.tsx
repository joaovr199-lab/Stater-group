/* eslint-disable @next/next/no-img-element */
export function Logo({ height = 18 }: { height?: number }) {
  return <img src="/brand/stater-group.png" alt="Stater Group" style={{ height: Math.round(height * 1.35) }} className="block w-auto" />;
}
