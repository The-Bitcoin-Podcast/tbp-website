/**
 * Regular hosts carry the shows week to week; everyone else who has hosted
 * filled in for a stretch. The gap is wide (170+ episodes vs. 15 or fewer),
 * so a simple episode threshold separates them.
 */
export const REGULAR_HOST_MIN_EPISODES = 50;

export function isRegularHost(p: { host: boolean; count: number }): boolean {
  return p.host && p.count >= REGULAR_HOST_MIN_EPISODES;
}
