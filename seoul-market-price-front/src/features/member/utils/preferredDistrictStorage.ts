interface StoredMyPageSettings {
  preferredDistrict?: string;
}

function getMyPageStorageKey(userId?: string) {
  const cleanId = (userId ?? "").trim().toLowerCase();
  return cleanId ? `myPageSettings_${cleanId}` : "myPageSettings_guest";
}

export function getLocalPreferredDistrict(userId?: string): string | undefined {
  if (typeof window === "undefined") return undefined;

  const saved = localStorage.getItem(getMyPageStorageKey(userId));
  if (!saved) return undefined;

  try {
    const settings = JSON.parse(saved) as StoredMyPageSettings;
    return typeof settings.preferredDistrict === "string"
      ? settings.preferredDistrict.trim()
      : "";
  } catch {
    return undefined;
  }
}
