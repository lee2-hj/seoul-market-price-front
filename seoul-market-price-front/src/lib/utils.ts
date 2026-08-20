import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 작성자 이름 마스킹 처리 유틸리티
 * - 1글자: 그대로 반환 (예: "홍")
 * - 2글자: 뒤 1글자 마스킹 (예: "홍길" -> "홍*")
 * - 3글자 이상: 가운데 글자들을 '*'로 마스킹 (예: "홍길동" -> "홍*동", "남궁민수" -> "남**수")
 * - 이메일 형식: 로컬 파트 마스킹 (예: "user123@domain.com" -> "us***@domain.com")
 */
export function maskAuthorName(name?: string | null): string {
  if (!name || !name.trim()) return "-";
  const trimmed = name.trim();

  // 이메일 형식 마스킹
  if (trimmed.includes("@")) {
    const [local, domain] = trimmed.split("@");
    if (local.length <= 2) {
      return `${local[0]}*@${domain}`;
    }
    return `${local.slice(0, 2)}${"*".repeat(Math.max(1, local.length - 2))}@${domain}`;
  }

  const len = trimmed.length;
  if (len <= 1) return trimmed;
  if (len === 2) return `${trimmed[0]}*`;

  return `${trimmed[0]}${"*".repeat(len - 2)}${trimmed[len - 1]}`;
}
