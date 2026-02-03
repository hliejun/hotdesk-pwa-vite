/**
 * Joins className fragments, skipping falsy values.
 *
 * @example
 * cx('card', isActive && 'active')
 */
export function cx(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}
