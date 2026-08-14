interface StoredMyPageSettings {
  preferredDistrict?: string;
}

function getMyPageStorageKey(userId?: string) {
  const cleanId = (userId ?? "").trim().toLowerCase();
  return cleanId ? `myPageSettings_${cleanId}` : "myPageSettings_guest";
}

export function getLocalPreferredDistrict(userId?: string) {
  if (typeof window === "undefined") return "";

  const saved = localStorage.getItem(getMyPageStorageKey(userId));
  if (!saved) return "";

  try {
    const settings = JSON.parse(saved) as StoredMyPageSettings;
    return typeof settings.preferredDistrict === "string"
      ? settings.preferredDistrict.trim()
      : "";
  } catch {
    return "";
  }
}
