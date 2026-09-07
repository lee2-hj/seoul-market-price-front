const AI_SEARCH_SESSION_STORAGE_KEY = "ai-price-search-session-id";

/** Returns a browser-scoped conversation id, reused across AI price-search requests. */
export function getAiSearchSessionId(): string | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const existing = window.localStorage.getItem(AI_SEARCH_SESSION_STORAGE_KEY);
    if (existing) return existing;

    const sessionId = window.crypto.randomUUID();
    window.localStorage.setItem(AI_SEARCH_SESSION_STORAGE_KEY, sessionId);
    return sessionId;
  } catch {
    return undefined;
  }
}

/** Reserved for the future "new conversation" control. */
export function clearAiSearchSessionId(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AI_SEARCH_SESSION_STORAGE_KEY);
  } catch {
    // Private browsing or disabled storage: the next request simply remains single-turn.
  }
}
