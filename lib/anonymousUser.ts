const ANONYMOUS_USER_STORAGE_KEY = "kb_ai_anonymous_user_id";

function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function generateUUID(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  // Fallback UUID v4 generator
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Retrieves the anonymous user ID from localStorage or creates and persists a new stable UUID.
 * This provides a stable identifier per browser/device without requiring authentication.
 * When real authentication is added later, this can be seamlessly swapped or linked.
 */
export function getOrCreateAnonymousUserId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const existingId = window.localStorage.getItem(ANONYMOUS_USER_STORAGE_KEY);
    if (existingId && isValidUUID(existingId)) {
      return existingId;
    }

    const newId = generateUUID();
    window.localStorage.setItem(ANONYMOUS_USER_STORAGE_KEY, newId);
    return newId;
  } catch (error) {
    return generateUUID();
  }
}

/**
 * Returns the current stored anonymous user ID if present, or null.
 */
export function getAnonymousUserId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const existingId = window.localStorage.getItem(ANONYMOUS_USER_STORAGE_KEY);
    if (existingId && isValidUUID(existingId)) {
      return existingId;
    }
  } catch (error) {
    // Ignore localStorage access errors.
  }

  return null;
}
