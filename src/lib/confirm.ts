/**
 * Thin wrapper around `window.confirm`.
 *
 * This indirection makes confirmation prompts easier to mock in tests.
 */
export function confirm(message: string): boolean {
  return window.confirm(message);
}
