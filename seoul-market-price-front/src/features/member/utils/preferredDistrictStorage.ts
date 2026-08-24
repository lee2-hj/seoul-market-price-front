interface StoredMyPageSettings {
  preferredDistrict?: string;
  preferredDong?: string;
}

function getMyPageStorageKey(userId?: string) {
  const cleanId = (userId ?? "").trim().toLowerCase();
  return cleanId ? `myPageSettings_${cleanId}` : "myPageSettings_guest";
}

export function getLocalPreferredLocation(userId?: string):
  | { district: string; dong: string }
  | undefined {
  if (typeof window === "undefined") return undefined;

  const saved = localStorage.getItem(getMyPageStorageKey(userId));
  if (!saved) return undefined;

  try {
    const settings = JSON.parse(saved) as StoredMyPageSettings;
    return {
      district:
        typeof settings.preferredDistrict === "string"
          ? settings.preferredDistrict.trim()
          : "",
      dong:
        typeof settings.preferredDong === "string"
          ? settings.preferredDong.trim()
          : "",
    };
  } catch {
    return undefined;
  }
}

export function getLocalPreferredDistrict(userId?: string): string | undefined {
  return getLocalPreferredLocation(userId)?.district;
}
