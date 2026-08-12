import type {
  ReportItem,
  ReportCategory,
  ReportStatus,
  ReportCreateRequest,
} from "../types/report.types";

const REPORT_STORAGE_KEY = "ssabu_real_estate_reports_v1";
const REPORT_COOLDOWN_KEY = "ssabu_report_last_submitted_at";

export const REPORT_CATEGORY_MAP: Record<ReportCategory, string> = {
  ALL: "전체",
  FAKE_LISTING: "허위/미끼 매물",
  PRICE_DISTORTION: "시세 왜곡",
  DUPLICATE: "중복/도배 등록",
  UNFAIR_BROKERAGE: "부당 중개 행위",
  OTHER: "기타 정보 오류",
};

export const REPORT_STATUS_MAP: Record<
  ReportStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  RECEIVED: {
    label: "접수대기",
    bg: "bg-[#fff8e6]",
    text: "text-[#b47500]",
    border: "border-[#fae3a8]",
  },
  IN_PROGRESS: {
    label: "처리중",
    bg: "bg-[#edf6ff]",
    text: "text-[#1d6fd8]",
    border: "border-[#c4e0ff]",
  },
  RESOLVED: {
    label: "답변완료",
    bg: "bg-[#eaf7ed]",
    text: "text-[#2e8540]",
    border: "border-[#bce5c5]",
  },
  REJECTED: {
    label: "반려",
    bg: "bg-[#f3f4f6]",
    text: "text-[#6b7280]",
    border: "border-[#e5e7eb]",
  },
};

// =================================================================
// 🛡️ 보안 기능 1: 개인정보 마스킹 헬퍼
// =================================================================
export function maskName(name?: string): string {
  if (!name) return "익명";
  const trimmed = name.trim();
  if (trimmed.length <= 1) return trimmed;
  if (trimmed.length === 2) return `${trimmed[0]}*`;
  return `${trimmed[0]}*${trimmed.slice(2)}`;
}

export function maskUserId(userId?: string): string {
  if (!userId) return "";
  if (userId.length <= 3) return `${userId[0]}**`;
  return `${userId.slice(0, 3)}****`;
}

// =================================================================
// 🛡️ 보안 기능 2: 안전한 첨부파일 확장자 및 용량 검증
// =================================================================
export const ALLOWED_FILE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "pdf",
  "hwp",
  "zip",
];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_TOTAL_FILE_SIZE_BYTES = 30 * 1024 * 1024; // 30MB

export function validateFileSecurity(file: File): {
  valid: boolean;
  message?: string;
} {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_FILE_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      message: `[${file.name}] 허용되지 않는 파일 형식입니다. 안전을 위해 이미지(jpg, png, webp) 및 문서(pdf, hwp, zip)만 업로드할 수 있습니다.`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      message: `[${file.name}] 파일 용량이 초과되었습니다. (최대 10MB 이하)`,
    };
  }

  return { valid: true };
}

// =================================================================
// 🛡️ 보안 기능 3: 도배 방지 쿨다운 (Rate Limiting)
// =================================================================
const REPORT_COOLDOWN_SECONDS = 60; // 1분 쿨다운

export function checkReportCooldown(): {
  canSubmit: boolean;
  remainingSeconds: number;
} {
  try {
    const lastTimeStr = localStorage.getItem(REPORT_COOLDOWN_KEY);
    if (!lastTimeStr) return { canSubmit: true, remainingSeconds: 0 };

    const lastTime = Number(lastTimeStr);
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - lastTime) / 1000);

    if (elapsedSeconds < REPORT_COOLDOWN_SECONDS) {
      return {
        canSubmit: false,
        remainingSeconds: REPORT_COOLDOWN_SECONDS - elapsedSeconds,
      };
    }
    return { canSubmit: true, remainingSeconds: 0 };
  } catch {
    return { canSubmit: true, remainingSeconds: 0 };
  }
}

export function recordReportSubmitTimestamp(): void {
  try {
    localStorage.setItem(REPORT_COOLDOWN_KEY, Date.now().toString());
  } catch {
    // ignore
  }
}

// =================================================================
// 🛡️ 보안 기능 4: 비공개 글 열람 권한 검증
// =================================================================
export interface UserAuthContext {
  id?: number | string;
  userId?: string;
  role?: string;
  name?: string;
}

export function canUserViewReport(
  report: ReportItem,
  user?: UserAuthContext | null,
): boolean {
  // 1. 공개 글은 비로그인 사용자 포함 누구나 열람 가능
  if (!report.isSecret) return true;

  // 2. 비공개 글인데 로그인하지 않은 경우 열람 불가
  if (!user) return false;

  // 3. 관리자(ADMIN) 권한이면 모든 비공개 글 열람 가능
  if (
    user.role === "ADMIN" ||
    user.role === "ROLE_ADMIN" ||
    user.userId === "admin"
  ) {
    return true;
  }

  // 4. 작성자 본인이면 비공개 글 열람 가능
  if (report.authorUserId && user.userId && report.authorUserId === user.userId) {
    return true;
  }

  return false;
}

export function canUserDeleteReport(
  report: ReportItem,
  user?: UserAuthContext | null,
): boolean {
  // 1. 비로그인 사용자는 삭제 불가 (버튼 미노출)
  if (!user) return false;

  // 2. 관리자는 모든 신고글 삭제 가능
  if (
    user.role === "ADMIN" ||
    user.role === "ROLE_ADMIN" ||
    user.userId === "admin"
  ) {
    return true;
  }

  // 3. 일반 사용자는 본인이 작성한 글만 삭제 가능
  if (report.authorUserId && user.userId && report.authorUserId === user.userId) {
    return true;
  }

  return false;
}

// =================================================================
// 더미 데이터 및 CRUD 저장소
// =================================================================
const INITIAL_DUMMY_REPORTS: ReportItem[] = [
  {
    id: 15,
    category: "FAKE_LISTING",
    status: "RESOLVED",
    targetProperty: "송파구 가락동 헬리오시티 105동 84㎡",
    title: "송파구 헬리오시티 84㎡ 전세 계약 완료 후 2주째 미삭제 허위 매물 신고",
    content:
      "포털 사이트에 전세 8억 5천만 원으로 올라와 있어 방문 문의하였으나, 이미 2주 전에 계약이 완료된 물건이라며 더 비싼 다른 매물을 유도했습니다. 의도적인 미끼 매물로 판단되어 신고합니다.",
    authorName: "김*수",
    authorUserId: "user_kims",
    createdAt: "2026.08.12",
    isSecret: false,
    attachments: [
      { id: 1, fileName: "포털_매물_캡처화면.png", fileSize: 245100 },
      { id: 2, fileName: "중개사_문자내역.jpg", fileSize: 184200 },
    ],
    adminReply: {
      adminName: "싸부 클린매물 모니터링팀",
      repliedAt: "2026.08.12 11:30",
      replyContent:
        "접수해 주신 내용을 바탕으로 해당 중개업소에 사실 확인을 진행하였습니다. 이미 거래가 체결된 매물임이 확인되어 즉시 매물 노출 차단 조치 및 1차 경고 처리를 완료하였습니다. 깨끗한 부동산 거래 환경 조성에 기여해 주셔서 감사드립니다.",
    },
  },
  {
    id: 14,
    category: "PRICE_DISTORTION",
    status: "IN_PROGRESS",
    targetProperty: "마포구 아현동 마포래미안푸르지오 59㎡",
    title: "마포래미안푸르지오 59㎡ 국토부 실거래가 표기 오류 및 호가 왜곡 건",
    content:
      "실제 국토교통부 실거래가는 14억 2천만 원으로 신고되었으나, 특정 사이트에서 12억 5천만 원으로 시세가 잘못 표기되어 혼선을 빚고 있습니다. 빠른 데이터 검증 및 시정 조치 요청드립니다.",
    authorName: "이*진",
    authorUserId: "user_leej",
    createdAt: "2026.08.11",
    isSecret: true,
    attachments: [{ id: 3, fileName: "실거래가_대조자료.pdf", fileSize: 520400 }],
  },
  {
    id: 13,
    category: "DUPLICATE",
    status: "RECEIVED",
    targetProperty: "강동구 고덕동 고덕그라시움 84㎡",
    title: "고덕그라시움 84㎡ 동일 동호수 가격 상이 다중 도배 등록",
    content:
      "동일한 아파트 동호수로 추정되는 매물이 가격을 15억, 15억 5천, 16억 원으로 각각 다르게 10건 이상 도배 등록되어 있습니다. 허위 호가 조작 의심됩니다.",
    authorName: "박*우",
    authorUserId: "user_parkw",
    createdAt: "2026.08.11",
    isSecret: false,
  },
  {
    id: 12,
    category: "UNFAIR_BROKERAGE",
    status: "RESOLVED",
    targetProperty: "서초구 반포동 반포자이 84㎡",
    title: "서초구 반포자이 84㎡ 단지 호가 담합 및 허위 매물 유도 의심",
    content:
      "특정 중개업소들이 연합하여 일정 가격 이하 매물을 고의로 노출하지 않고 허위 가격으로 등록하여 거래를 방해하고 있습니다.",
    authorName: "정*훈",
    authorUserId: "user_jungh",
    createdAt: "2026.08.10",
    isSecret: true,
    adminReply: {
      adminName: "싸부 클린매물 모니터링팀",
      repliedAt: "2026.08.11 09:40",
      replyContent:
        "해당 단지 매물 등록 현황을 전수 점검하여 비정상적으로 등록된 매물 4건을 일괄 삭제 조치하였습니다. 지속적인 모니터링을 유지하겠습니다.",
    },
  },
  {
    id: 11,
    category: "FAKE_LISTING",
    status: "REJECTED",
    targetProperty: "노원구 상계동 상계주공 5단지 37㎡",
    title: "노원구 상계주공 5단지 37㎡ 초급매 시세 확인 요청 건",
    content:
      "주변 시세보다 지나치게 저렴한 4억 원 급매물이 올라와 있어 미끼 매물이 아닌지 확인 부탁드립니다.",
    authorName: "최*영",
    authorUserId: "user_choiy",
    createdAt: "2026.08.09",
    isSecret: false,
    adminReply: {
      adminName: "싸부 클린매물 모니터링팀",
      repliedAt: "2026.08.09 17:15",
      replyContent:
        "해당 건은 집주인의 사정으로 인한 정상 급매물로 확인되어 허위 매물에 해당하지 않으므로 반려 처리되었습니다.",
    },
  },
  {
    id: 10,
    category: "OTHER",
    status: "RESOLVED",
    targetProperty: "영등포구 여의도동 시범아파트 79㎡",
    title: "재건축 추진 현황 정보 및 동호수 정보 오기재 정정 요청",
    content:
      "단지 상세 정보란에 재건축 단계가 이전 단계로 잘못 표기되어 있습니다. 최신 정비구역 변경 인가 내용으로 업데이트 바랍니다.",
    authorName: "강*민",
    authorUserId: "user_kangm",
    createdAt: "2026.08.08",
    isSecret: false,
    adminReply: {
      adminName: "싸부 데이터 관리팀",
      repliedAt: "2026.08.08 14:00",
      replyContent:
        "최신 서울시 정비사업 정보와 대조하여 단지 재건축 정보 업데이트를 완료하였습니다. 소중한 제보 감사합니다.",
    },
  },
];

export function getStoredReports(): ReportItem[] {
  try {
    const raw = localStorage.getItem(REPORT_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(
        REPORT_STORAGE_KEY,
        JSON.stringify(INITIAL_DUMMY_REPORTS),
      );
      return INITIAL_DUMMY_REPORTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DUMMY_REPORTS;
  }
}

export function saveReports(items: ReportItem[]): void {
  try {
    localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error("신고 목록 저장 실패:", err);
  }
}

export function getReportById(id: number): ReportItem | undefined {
  const reports = getStoredReports();
  return reports.find((r) => r.id === id);
}

export function createReport(data: ReportCreateRequest): ReportItem {
  const reports = getStoredReports();
  const nextId =
    reports.length > 0 ? Math.max(...reports.map((r) => r.id)) + 1 : 1;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const createdAt = `${year}.${month}.${day}`;

  const attachments: ReportItem["attachments"] = (data.files || []).map(
    (file, idx) => ({
      id: idx + 1,
      fileName: file.name,
      fileSize: file.size,
    }),
  );

  const newReport: ReportItem = {
    id: nextId,
    category: data.category === "ALL" ? "OTHER" : data.category,
    status: "RECEIVED",
    targetProperty: data.targetProperty.trim(),
    title: data.title.trim(),
    content: data.content.trim(),
    authorName: maskName(data.authorName),
    authorUserId: data.authorUserId,
    authorMemberId: data.authorMemberId,
    createdAt,
    isSecret: data.isSecret,
    attachments: attachments.length > 0 ? attachments : undefined,
  };

  const updated = [newReport, ...reports];
  saveReports(updated);
  recordReportSubmitTimestamp();
  return newReport;
}

export function deleteReport(id: number): boolean {
  const reports = getStoredReports();
  const filtered = reports.filter((r) => r.id !== id);
  if (filtered.length !== reports.length) {
    saveReports(filtered);
    return true;
  }
  return false;
}
