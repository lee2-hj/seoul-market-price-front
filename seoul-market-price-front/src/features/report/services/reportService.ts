import type {
  ReportItem,
  ReportCategory,
  ReportStatus,
  ReportCreateRequest,
  ReportUpdateRequest,
} from "../types/report.types";

const REPORT_STORAGE_KEY = "ssabu_real_estate_reports_v1";
const REPORT_DUMMY_VERSION_KEY = "ssabu_real_estate_reports_dummy_version";
const REPORT_DUMMY_VERSION = "apartment-price-inquiry-v1";
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
    category: "PRICE_DISTORTION",
    status: "RESOLVED",
    targetProperty: "송파구 잠실동 · 강동구 고덕동 84㎡ 아파트",
    title: "구별 평균 매매가격 비교 기준이 궁금합니다",
    content:
      "송파구와 강동구의 84㎡ 아파트 평균 매매가격을 비교하고 있습니다. 표시되는 평균가격이 선택한 전용면적 기준인지 궁금하며, 거래 건수가 적은 동의 평균값 계산 방식도 안내 부탁드립니다.",
    authorName: "김*수",
    authorUserId: "user_kims",
    createdAt: "2026.08.12",
    isSecret: false,
    attachments: [
      { id: 1, fileName: "구별_가격비교_화면.png", fileSize: 245100 },
    ],
    adminReply: {
      adminName: "싸부 데이터 운영팀",
      repliedAt: "2026.08.12 11:30",
      replyContent:
        "구·동 평균가격은 선택한 거래유형과 전용면적 구간에 해당하는 국토교통부 실거래가를 기준으로 계산합니다. 거래가 적은 지역에는 참고 안내를 추가하겠습니다.",
    },
  },
  {
    id: 14,
    category: "OTHER",
    status: "IN_PROGRESS",
    targetProperty: "마포구 아현동 마포래미안푸르지오 59㎡",
    title: "동별 비교에서 아현동 거래내역이 일부 누락된 것 같습니다",
    content:
      "아현동을 선택하면 지난달에 조회되던 마포래미안푸르지오 59㎡ 거래 두 건이 현재 목록에서 보이지 않습니다. 계약 해제 거래가 제외된 것인지 데이터 갱신 과정에서 누락된 것인지 확인 부탁드립니다.",
    authorName: "이*진",
    authorUserId: "user_leej",
    createdAt: "2026.08.11",
    isSecret: true,
    attachments: [{ id: 3, fileName: "아현동_실거래가_조회화면.pdf", fileSize: 520400 }],
  },
  {
    id: 13,
    category: "OTHER",
    status: "RECEIVED",
    targetProperty: "강동구 고덕동 · 상일동",
    title: "가격 추이 차트에 전세와 매매를 함께 비교할 수 있나요?",
    content:
      "고덕동과 상일동의 최근 3년 가격 흐름을 보고 있습니다. 동일 기간의 매매가와 전세가를 한 차트에서 비교하고 전세가율도 함께 확인할 수 있는지 궁금합니다.",
    authorName: "박*우",
    authorUserId: "user_parkw",
    createdAt: "2026.08.11",
    isSecret: false,
  },
  {
    id: 12,
    category: "OTHER",
    status: "RESOLVED",
    targetProperty: "서초구 반포동 반포자이 84㎡",
    title: "최신 실거래가는 언제 반영되나요?",
    content:
      "국토교통부 실거래가 공개시스템에는 이번 주 거래가 확인되는데 싸부의 반포동 가격 비교 화면에는 아직 반영되지 않았습니다. 데이터 갱신 주기와 계약 해제 건의 반영 시점을 알려주세요.",
    authorName: "정*훈",
    authorUserId: "user_jungh",
    createdAt: "2026.08.10",
    isSecret: true,
    adminReply: {
      adminName: "싸부 데이터 운영팀",
      repliedAt: "2026.08.11 09:40",
      replyContent:
        "실거래가 데이터는 매일 새벽 갱신하며 공개 시점에 따라 최대 1~2일 정도 차이가 날 수 있습니다. 계약 해제 신고도 원천 데이터에 반영되는 즉시 표시합니다.",
    },
  },
  {
    id: 11,
    category: "OTHER",
    status: "REJECTED",
    targetProperty: "노원구 상계동 59㎡ 아파트",
    title: "평형이 다른 아파트를 동일한 기준으로 비교하고 싶습니다",
    content:
      "단지마다 전용면적이 58㎡, 59㎡, 60㎡처럼 조금씩 달라 비교 결과가 나뉩니다. 비슷한 면적을 구간으로 묶어 ㎡당 가격이나 평당 가격으로 비교할 수 있는지 문의드립니다.",
    authorName: "최*영",
    authorUserId: "user_choiy",
    createdAt: "2026.08.09",
    isSecret: false,
    adminReply: {
      adminName: "싸부 서비스 운영팀",
      repliedAt: "2026.08.09 17:15",
      replyContent:
        "현재는 전용면적별 정확한 비교를 우선 제공하고 있습니다. 면적 구간 비교와 ㎡당 가격 기능은 개선 항목으로 검토하겠습니다.",
    },
  },
  {
    id: 10,
    category: "OTHER",
    status: "RESOLVED",
    targetProperty: "영등포구 여의도동 · 양천구 목동",
    title: "관심 지역 여러 곳을 한 번에 비교하는 기능을 추가해 주세요",
    content:
      "여의도동과 목동처럼 서로 다른 구·동을 저장하고 가격 변동률, 평균 매매가, 거래량을 한 화면에서 비교하고 싶습니다. 비교 결과를 이미지나 엑셀로 내려받는 기능도 있으면 좋겠습니다.",
    authorName: "강*민",
    authorUserId: "user_kangm",
    createdAt: "2026.08.08",
    isSecret: false,
    adminReply: {
      adminName: "싸부 서비스 운영팀",
      repliedAt: "2026.08.08 14:00",
      replyContent:
        "관심 지역 다중 비교 기능을 개선 과제로 등록했습니다. 우선 구·동별 평균가격과 변동률을 함께 비교할 수 있도록 준비하겠습니다.",
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
      localStorage.setItem(REPORT_DUMMY_VERSION_KEY, REPORT_DUMMY_VERSION);
      return INITIAL_DUMMY_REPORTS;
    }

    const storedReports = JSON.parse(raw) as ReportItem[];
    const storedVersion = localStorage.getItem(REPORT_DUMMY_VERSION_KEY);

    if (storedVersion !== REPORT_DUMMY_VERSION) {
      const dummyIds = new Set(INITIAL_DUMMY_REPORTS.map((item) => item.id));
      const userCreatedReports = storedReports.filter(
        (item) => !dummyIds.has(item.id),
      );
      const migratedReports = [...userCreatedReports, ...INITIAL_DUMMY_REPORTS].sort(
        (a, b) => b.id - a.id,
      );

      localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(migratedReports));
      localStorage.setItem(REPORT_DUMMY_VERSION_KEY, REPORT_DUMMY_VERSION);
      return migratedReports;
    }

    return storedReports;
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
    authorName: data.authorName.trim() || "-",
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

export function updateReport(
  id: number,
  data: ReportUpdateRequest,
  user?: UserAuthContext | null,
): ReportItem | null {
  const reports = getStoredReports();
  const target = reports.find((report) => report.id === id);

  if (!target || !canUserDeleteReport(target, user)) {
    return null;
  }

  const updatedReport: ReportItem = {
    ...target,
    targetProperty: data.targetProperty.trim() || "일반 문의",
    title: data.title.trim(),
    content: data.content.trim(),
    isSecret: data.isSecret,
  };

  saveReports(
    reports.map((report) => (report.id === id ? updatedReport : report)),
  );
  return updatedReport;
}
