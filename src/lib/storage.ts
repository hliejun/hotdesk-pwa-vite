export type StorageResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/**
 * Parses JSON with a typed result wrapper.
 *
 * @param raw JSON string.
 */
export function safeJsonParse<T>(raw: string): StorageResult<T> {
  try {
    return { ok: true, value: JSON.parse(raw) as T };
  } catch {
    return { ok: false, error: "Invalid JSON in storage" };
  }
}

/**
 * Reads from `localStorage`, returning `null` if access is blocked.
 */
export function getLocalStorageItem(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Writes to `localStorage`, returning an error object on failure.
 */
export function setLocalStorageItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Failed to write to localStorage" };
  }
}

/**
 * Removes a `localStorage` key, returning an error object on failure.
 */
export function removeLocalStorageItem(key: string) {
  try {
    localStorage.removeItem(key);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Failed to remove from localStorage" };
  }
}
