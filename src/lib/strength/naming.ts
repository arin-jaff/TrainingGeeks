/**
 * Display names for strength exercises. For now: a camelCase → Title Case
 * splitter over the FIT category key, plus a small manual override map for the
 * cases the splitter gets wrong. A user-entered name always wins.
 *
 *   benchPress    -> "Bench Press"
 *   lateralRaise  -> "Lateral Raise"
 *   tricepsExtension -> "Triceps Extension"
 *   unknown       -> "Unnamed"
 */
const OVERRIDES: Record<string, string> = {
  unknown: "Unnamed",
  flye: "Fly",
  pullUp: "Pull-up",
  pushUp: "Push-up",
  latPulldown: "Lat Pulldown",
};

export function splitCamel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

/** Resolve a set's display name: user override → manual map → camel splitter. */
export function exerciseDisplayName(
  key: string,
  override?: string | null,
): string {
  if (override && override.trim()) return override.trim();
  if (OVERRIDES[key]) return OVERRIDES[key];
  return splitCamel(key);
}
