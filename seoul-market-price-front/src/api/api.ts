import axios from "axios";

import apiMiddleware, {
  BACKEND_URL,
  type RetryableRequestConfig,
} from "./middleware";

import type {
  BoardListRequest,
  BoardPageResponse,
  BoardListItem,
  BoardDetail,
  BoardCreateRequest,
  BoardUpdateRequest,
  BoardComment,
  CommentCreateRequest,
  CommentUpdateRequest,
  PostType,
  NoticeLevel,
  AttachmentResponse,
  AttachmentDownloadResponse,
} from "@/features/board/types/board.types";

// ===============================
// 로그인 응답
// ===============================

// 백엔드 LoginResponse DTO(record)가 평평한 구조로 내려주므로 그대로 맞춘다.
// refreshToken은 HttpOnly 쿠키로만 전달되어 응답 바디에 없다.
export interface LoginResponse {
  accessToken: string;

  memberId: number;

  userId: string;

  name: string;
}

// ===============================
// 로그인
// ===============================

export async function loginApi(
  userId: string,
  password: string,
): Promise<LoginResponse> {
  const response = await apiMiddleware.post<LoginResponse>("/api/auth/login", {
    userId,
    password,
  });

  return response.data;
}

// ===============================
// 내 정보 조회
// ===============================

// accessToken이 HttpOnly 쿠키라 프론트에서 파싱할 수 없으므로,
// 새로고침 등으로 zustand의 로그인 정보가 비어있을 때
// 이 API로 로그인 여부와 유저 정보를 다시 확인한다.
export interface MemberMeResponse {
  memberId: number;
  userId: string;
  name: string;
  preferredDistrict: string | null;
  myGu: string | null;
  myGuCode: string | null;
  myDong: string | null;
  latitude: number | null;
  longitude: number | null;
}

export async function getMemberMeApi(): Promise<MemberMeResponse> {
  // 비로그인 상태에서 401이 나는 것은 정상 상황이므로,
  // 세션 만료 alert이 뜨지 않도록 silent 요청으로 표시한다.
  //
  // 매번 다른 쿼리스트링(_t)을 붙여 브라우저가 로그아웃 이전에
  // 로그인 상태로 캐시해둔 응답을 재사용하지 않고, 새로고침 시에도
  // 항상 서버에 다시 물어보도록 강제한다. 그렇지 않으면 로그아웃 후
  // 새로고침해도 캐시된 "로그인됨" 응답이 그대로 재사용되어
  // 헤더가 로그인 상태로 남는 문제가 생긴다..
  const response = await apiMiddleware.get<MemberMeResponse>(
    "/api/members/me",
    {
      silentAuthCheck: true,
      params: { _t: Date.now() },
    } as RetryableRequestConfig,
  );

  return response.data;
}

// ===============================
// 로그아웃 API
// ===============================

// HttpOnly인 refreshToken 쿠키는 프론트에서 지울 수 없어
// 서버가 로그아웃 시 Set-Cookie로 만료시켜줘야 한다.

export async function logoutApi() {
  const response = await apiMiddleware.post("/api/auth/logout");

  return response.data;
}

// ===============================
// 현재 위치의 서울 자치구 조회
// ===============================

export interface CurrentDistrictResponse {
  district: string;
  sggCd: string;
}

export async function getCurrentDistrictApi(
  latitude: number,
  longitude: number,
): Promise<CurrentDistrictResponse> {
  const response = await apiMiddleware.get<CurrentDistrictResponse>(
    "/api/location/current-district",
    { params: { latitude, longitude } },
  );

  return response.data;
}

// ===============================
// OAuth
// ===============================

// 백엔드가 로그인용(kakao, google)과 회원가입용(kakao-signup, google-signup)
// client 등록을 분리했으므로 registrationId도 mode에 맞게 골라야 한다.

export function getKakaoLoginUrl(mode: "login" | "signup" = "login") {
  const registrationId = mode === "signup" ? "kakao-signup" : "kakao";

  return `${BACKEND_URL}/oauth2/authorization/${registrationId}`;
}

export function getGoogleLoginUrl(mode: "login" | "signup" = "login") {
  const registrationId = mode === "signup" ? "google-signup" : "google";

  return `${BACKEND_URL}/oauth2/authorization/${registrationId}`;
}

// ===============================
// 회원가입 요청
// ===============================

export interface SignupRequest {
  name: string;

  userId: string;

  identityVerificationId: string;

  password: string;

  phone: string;

  address?: string;

  addressDetail?: string;

  zipcode?: string;

  email?: string;

  is_terms_agreed: number;

  is_location_agreed: number;

  is_privacy_agreed: number;

  myLocation?: string;
}

export interface SignupResponse {
  msg: string;
}

export async function signupApi(signupData: SignupRequest) {
  const response = await apiMiddleware.post<SignupResponse>(
    "/api/members/signup",
    signupData,
  );

  return response.data;
}

// ===============================
// 아이디 찾기
// ===============================
export interface FindIdResponse {
  found: boolean;
  maskedUserIds: string[];
}

export async function findIdApi(
  identityVerificationId: string,
  name?: string,
  phone?: string,
): Promise<FindIdResponse> {
  const response = await apiMiddleware.post<FindIdResponse>(
    "/api/members/find-id",
    {
      identityVerificationId,
      ...(name && { name }),
      ...(phone && { phone, phoneNumber: phone }),
    },
  );
  return response.data;
}

// ===============================
// 비밀번호 재설정
// ===============================

export interface PasswordResetVerifyResponse {
  verified: boolean;
  resetToken: string;
  expiresInSeconds: number;
}

export async function verifyPasswordResetApi(
  identityVerificationId: string,
  userId: string,
): Promise<PasswordResetVerifyResponse> {
  const response = await apiMiddleware.post<PasswordResetVerifyResponse>(
    "/api/members/password-reset/verify",
    { identityVerificationId, userId },
  );

  return response.data;
}

export interface PasswordResetCompleteResponse {
  message: string;
}

export async function completePasswordResetApi(
  resetToken: string,
  newPassword: string,
  newPasswordConfirm: string,
): Promise<PasswordResetCompleteResponse> {
  const response = await apiMiddleware.post<PasswordResetCompleteResponse>(
    "/api/members/password-reset/complete",
    { resetToken, newPassword, newPasswordConfirm },
  );

  return response.data;
}

// ===============================
// PASS 인증 요청
// ===============================

export interface PassResponse {
  passUrl: string;
}

export async function requestPassApi(phone: string): Promise<PassResponse> {
  const response = await apiMiddleware.post<PassResponse>("/api/pass/request", {
    phone,
  });

  return response.data;
}

// ===============================
// 휴대폰 SMS 인증 요청
// ===============================

export async function sendPhoneAuthApi(phone: string) {
  const response = await apiMiddleware.post("/api/sms/send", {
    phone,
  });

  return response.data;
}

// ===============================
// 휴대폰 SMS 인증 확인
// ===============================

export async function verifyPhoneAuthApi(phone: string, code: string) {
  const response = await apiMiddleware.post("/api/sms/verify", {
    phone,
    code,
  });

  return response.data;
}

// ===============================
// 아이디 중복 확인
// ===============================

export async function checkUserIdApi(userId: string) {
  const response = await apiMiddleware.get("/api/members/check-id", {
    params: {
      userId,
    },
  });

  return response.data;
}

// ===============================
// 가입 여부 확인 (이름 + 휴대폰 번호)
// ===============================

export interface CheckMemberResponse {
  isduplicated?: boolean;
  verified?: boolean;
  name?: string;
  phoneNumber?: string;
  membershipStatus?: "NEW" | "ACTIVE" | "WITHDRAWN";
  signupAllowed?: boolean;
}

export async function checkMemberApi(
  name: string,
  phone: string,
): Promise<CheckMemberResponse> {
  const response = await apiMiddleware.get<CheckMemberResponse>(
    "/api/members/check-member",
    {
      params: {
        name,
        phone,
      },
    },
  );

  return response.data;
}

// ===============================
// 인증 에러 확인
// ===============================

export function isAuthError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

// ===============================
// 게시판 (Board) API
// ===============================

interface RawBoardListItem {
  boardId?: number;
  id?: number;
  title?: string;
  boardTitle?: string;
  subject?: string;
  authorName?: string;
  writerName?: string;
  writer?: string;
  userName?: string;
  memberName?: string;
  writerLoginId?: string;
  author?: string;
  userId?: string;
  createdAt?: string;
  createDate?: string;
  regDate?: string;
  viewCount?: number;
  hit?: number;
  readCount?: number;
  postType?: PostType;
  type?: string;
  noticeLevel?: NoticeLevel;
}

interface RawBoardPageResponse {
  content?: RawBoardListItem[];
  items?: RawBoardListItem[];
  totalPages?: number;
  totalElements?: number;
  number?: number;
}

interface RawBoardDetail {
  boardId?: number;
  id?: number;
  title?: string;
  boardTitle?: string;
  subject?: string;
  content?: string;
  boardContent?: string;
  body?: string;
  authorName?: string;
  writerName?: string;
  writer?: string;
  userName?: string;
  authorId?: string;
  writerId?: string;
  userId?: string;
  createdAt?: string;
  createDate?: string;
  regDate?: string;
  viewCount?: number;
  hit?: number;
  readCount?: number;
  postType?: PostType;
  type?: string;
}

/**
 * 게시글 목록 조회 API (GET /api/boards)
 */
export async function getBoardPostsApi(
  params: BoardListRequest = {},
): Promise<BoardPageResponse> {
  const { page = 1, size = 10, searchType, keyword } = params;

  const response = await apiMiddleware.get<RawBoardPageResponse>(
    "/api/boards",
    {
      params: {
        page: page - 1,
        size,
        searchType: searchType ? searchType.toUpperCase() : undefined,
        keyword: keyword || undefined,
      },
    },
  );

  const backendData = response.data || {};
  const contentArray = Array.isArray(backendData)
    ? backendData
    : backendData.content || backendData.items || [];

  const allItems: BoardListItem[] = contentArray.map((item) => ({
    boardId: item.boardId || item.id || 0,
    title: item.title || item.boardTitle || item.subject || "게시글 제목",
    authorName:
      item.authorName ||
      item.writerName ||
      item.writer ||
      item.userName ||
      item.memberName ||
      item.writerLoginId ||
      item.author ||
      item.userId ||
      "작성자",
    createdAt: item.createdAt || item.createDate || item.regDate || "",
    viewCount: item.viewCount ?? item.hit ?? item.readCount ?? 0,
    postType: item.postType || (item.type as PostType) || "GENERAL",
    noticeLevel: item.noticeLevel,
  }));

  const notices = allItems
    .filter((i) => i.postType === "NOTICE")
    .sort(
      (a, b) =>
        (b.noticeLevel === "IMPORTANT" ? 1 : 0) -
        (a.noticeLevel === "IMPORTANT" ? 1 : 0),
    );

  const pinnedNotices = notices.slice(0, 2);
  const items = allItems.filter(
    (i) => !pinnedNotices.some((p) => p.boardId === i.boardId),
  );

  return {
    notices: pinnedNotices,
    items,
    totalPages: backendData.totalPages || 1,
    totalElements: backendData.totalElements || allItems.length,
    currentPage: (backendData.number ?? 0) + 1,
  };
}

/**
 * 게시글 단건 상세 조회 API (GET /api/boards/:boardId)
 */
export async function getBoardPostApi(boardId: number): Promise<BoardDetail> {
  const response = await apiMiddleware.get<RawBoardDetail>(
    `/api/boards/${boardId}`,
  );
  const data = response.data || {};

  return {
    boardId: data.boardId || data.id || boardId,
    title: data.title || data.boardTitle || data.subject || "",
    content: data.content || data.boardContent || data.body || "",
    authorName:
      data.authorName || data.writerName || data.writer || data.userName || "",
    authorId: data.authorId || data.writerId || data.userId || "user",
    createdAt: data.createdAt || data.createDate || data.regDate || "",
    viewCount: data.viewCount ?? data.hit ?? data.readCount ?? 0,
    postType: data.postType || (data.type as PostType) || "GENERAL",
  };
}

export interface BoardFullDetailResponse {
  detail: BoardDetail;
  comments: BoardComment[];
  attachments: AttachmentResponse[];
}

// 겟
export async function getBoardFullDetailApi(
  boardId: number,
): Promise<BoardFullDetailResponse> {
  const response = await apiMiddleware.get<{
    detail: RawBoardDetail;
    comments: BoardComment[];
    attachments: AttachmentResponse[];
  }>(`/api/boards/${boardId}/full`);
  const data = response.data.detail || {};

  return {
    detail: {
      boardId: data.boardId || data.id || boardId,
      title: data.title || data.boardTitle || data.subject || "",
      content: data.content || data.boardContent || data.body || "",
      authorName:
        data.authorName ||
        data.writerName ||
        data.writer ||
        data.userName ||
        "",
      authorId: data.authorId || data.writerId || data.userId || "user",
      createdAt: data.createdAt || data.createDate || data.regDate || "",
      viewCount: data.viewCount ?? data.hit ?? data.readCount ?? 0,
      postType: data.postType || (data.type as PostType) || "GENERAL",
    },
    comments: response.data.comments || [],
    attachments: response.data.attachments || [],
  };
}

/**
 * 게시글 등록 API (POST /api/boards)
 */
export async function createBoardPostApi(
  data: BoardCreateRequest,
): Promise<{ boardId: number }> {
  const response = await apiMiddleware.post<{ boardId: number }>(
    "/api/boards",
    data,
  );
  return response.data;
}

/**
 * 게시글 수정 API (PATCH /api/boards/:boardId)
 */
export async function updateBoardPostApi(
  boardId: number,
  data: BoardUpdateRequest,
): Promise<void> {
  await apiMiddleware.patch(`/api/boards/${boardId}`, data);
}

/**
 * 게시글 삭제 API (DELETE /api/boards/:boardId)
 */
export async function deleteBoardPostApi(boardId: number): Promise<void> {
  await apiMiddleware.delete(`/api/boards/${boardId}`);
}

/**
 * 게시글 댓글 목록 조회 API (GET /api/boards/:boardId/comments)
 */
export async function getBoardCommentsApi(
  boardId: number,
): Promise<BoardComment[]> {
  const response = await apiMiddleware.get<BoardComment[]>(
    `/api/boards/${boardId}/comments`,
  );
  return response.data;
}

/**
 * 게시글 댓글 작성 API (POST /api/boards/:boardId/comments)
 */
export async function createBoardCommentApi(
  boardId: number,
  data: CommentCreateRequest,
): Promise<BoardComment> {
  const response = await apiMiddleware.post<BoardComment>(
    `/api/boards/${boardId}/comments`,
    data,
  );
  return response.data;
}

/**
 * 게시글 댓글 수정 API (PATCH /api/boards/comments/:commentId)
 */
export async function updateBoardCommentApi(
  boardId: number,
  commentId: number,
  data: CommentUpdateRequest,
): Promise<void> {
  await apiMiddleware.patch(
    `/api/boards/${boardId}/comments/${commentId}`,
    data,
  );
}

/**
 * 게시글 댓글 삭제 API (DELETE /api/boards/comments/:commentId)
 */
export async function deleteBoardCommentApi(
  boardId: number,
  commentId: number,
): Promise<void> {
  await apiMiddleware.delete(`/api/boards/${boardId}/comments/${commentId}`);
}

/** 마이페이지 내 댓글 단건 응답 */
export interface MyCommentResponse {
  id: number;
  parentId: number | null;
  boardType: string;
  postId: number;
  postTitle: string;
  name: string;
  content: string;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
}
/** 마이페이지 내 댓글 페이징 응답 */
export interface MyCommentPageResponse {
  content: MyCommentResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}
/** 내가 작성한 댓글 목록 조회 API (GET /api/comments/me) */
export async function getMyCommentsApi(
  params: { page?: number; size?: number } = { page: 0, size: 100 },
): Promise<MyCommentPageResponse> {
  const { data } = await apiMiddleware.get<MyCommentPageResponse>(
    "/api/comments/me",
    {
      params,
    },
  );
  return data;
}

/**
 * 게시글 첨부파일 다중/단일 업로드 API (POST /api/boards/:boardId/attachments)
 */
export async function uploadBoardAttachmentsApi(
  boardId: number,
  files: File[],
): Promise<AttachmentResponse[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await apiMiddleware.post<AttachmentResponse[]>(
    `/api/boards/${boardId}/attachments`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data;
}

/**
 * 게시글 첨부파일 목록 조회 API (GET /api/boards/:boardId/attachments)
 */
export async function getBoardAttachmentsApi(
  boardId: number,
): Promise<AttachmentResponse[]> {
  const response = await apiMiddleware.get<AttachmentResponse[]>(
    `/api/boards/${boardId}/attachments`,
  );
  return response.data || [];
}

/**
 * 게시글 첨부파일 다운로드 URL 발급 API (GET /api/boards/:boardId/attachments/:attachmentId/download)
 */
export async function downloadBoardAttachmentApi(
  boardId: number,
  attachmentId: number,
): Promise<AttachmentDownloadResponse> {
  const response = await apiMiddleware.get<AttachmentDownloadResponse>(
    `/api/boards/${boardId}/attachments/${attachmentId}/download`,
  );
  return response.data;
}

/**
 * 게시글 첨부파일 삭제 API (DELETE /api/boards/:boardId/attachments/:attachmentId)
 */
export async function deleteBoardAttachmentApi(
  boardId: number,
  attachmentId: number,
): Promise<void> {
  await apiMiddleware.delete(
    `/api/boards/${boardId}/attachments/${attachmentId}`,
  );
}

/* Q&A 목록 응답 */

export interface QnaListResponse {
  id: number;
  title: string;
  writerLoginId: string;
  writerName: string;
  answerStatus: string;
  viewCount: number;
  publicQuestion: boolean;
  attachmentAvailable: boolean;
  createdAt: string;
  answeredAt: string | null;
}

/* Q&A 페이지 응답 */

export interface QnaPageResponse {
  content: QnaListResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

/*  Q&A 목록 조회 */

export async function getQnasApi(
  page: number = 0,
  size: number = 5,
  keyword?: string,
) {
  const response = await apiMiddleware.get<QnaPageResponse>("/api/qnas", {
    params: {
      page,
      size,
      keyword: keyword?.trim() || undefined,
    },
  });

  return response.data;
}

/* ==========================================
   자주 묻는 질문 (FAQ) API
========================================== */

export interface FaqPublicResponse {
  id: number;
  question: string;
  answer: string;
  category: string;
  writerName?: string;
  displayOrder?: number;
  viewCount?: number;
  createdAt?: string;
}

/**
 * 공개 FAQ 목록 조회 API (GET /api/faqs)
 */
export async function getPublicFaqsApi(
  category?: string,
): Promise<FaqPublicResponse[]> {
  try {
    const response = await apiMiddleware.get<FaqPublicResponse[]>("/api/faqs", {
      params: {
        category: category && category !== "전체" ? category : undefined,
      },
      silentAuthCheck: true,
    } as RetryableRequestConfig);

    return response.data || [];
  } catch (error) {
    console.warn("Failed to fetch public FAQs:", error);
    return [];
  }
}

/**
 * 공개 FAQ 상세 조회 API (GET /api/faqs/:id)
 */
export async function getPublicFaqApi(id: number): Promise<FaqPublicResponse> {
  const response = await apiMiddleware.get<FaqPublicResponse>(
    `/api/faqs/${id}`,
    { silentAuthCheck: true } as RetryableRequestConfig,
  );
  return response.data;
}

/* ==========================================
   위치 / 자치구 / 자치동 API
========================================== */

export interface SggItem {
  sggCd: string;
  sggNm: string;
}

export interface DongItem {
  dongCd: string;
  dongNm: string;
  sggCd?: string;
}

/**
 * 서울 자치구 목록 조회 API (GET /api/location/sggs)
 */
export async function getSggsApi(): Promise<SggItem[]> {
  try {
    const response = await apiMiddleware.get<any>("/api/location/sggs", {
      silentAuthCheck: true,
    } as RetryableRequestConfig);
    const data = response.data;
    if (Array.isArray(data)) {
      return data.map((item: any) => {
        if (typeof item === "string") {
          return { sggCd: item, sggNm: item };
        }
        return {
          sggCd: String(
            item.sggCd || item.code || item.sggNm || item.name || "",
          ),
          sggNm: String(item.sggNm || item.name || item.sggCd || ""),
        };
      });
    }
    if (data && Array.isArray(data.items)) {
      return data.items.map((item: any) => ({
        sggCd: String(item.sggCd || item.code || item.sggNm || item.name || ""),
        sggNm: String(item.sggNm || item.name || item.sggCd || ""),
      }));
    }
    return [];
  } catch (error) {
    console.warn("Failed to fetch SGGs from DB API:", error);
    return [];
  }
}

/**
 * 서울 자치동 목록 조회 API (GET /api/location/dongs?sggCd=11680)
 */
export async function getDongsApi(sggCd: string): Promise<DongItem[]> {
  if (!sggCd) return [];
  try {
    const response = await apiMiddleware.get<any>("/api/location/dongs", {
      params: { sggCd },
      silentAuthCheck: true,
    } as RetryableRequestConfig);
    const data = response.data;
    if (Array.isArray(data)) {
      return data.map((item: any) => {
        if (typeof item === "string") {
          return { dongCd: item, dongNm: item, sggCd };
        }
        return {
          dongCd: String(
            item.dongCd || item.code || item.dongNm || item.name || "",
          ),
          dongNm: String(item.dongNm || item.name || item.dongCd || ""),
          sggCd: String(item.sggCd || sggCd),
        };
      });
    }
    if (data && Array.isArray(data.items)) {
      return data.items.map((item: any) => ({
        dongCd: String(
          item.dongCd || item.code || item.dongNm || item.name || "",
        ),
        dongNm: String(item.dongNm || item.name || item.dongCd || ""),
        sggCd: String(item.sggCd || sggCd),
      }));
    }
    return [];
  } catch (error) {
    console.warn("Failed to fetch Dongs from DB API:", error);
    return [];
  }
}

/* ==========================================
   아파트 단지 시세 및 실거래가 API
========================================== */

export interface PyungDetail {
  name: string;
  area: number;
  salePrice: number;
  rentPrice: number;
  recentTradeDate: string;
  recentFloor: number;
  pricePerPyung: number;
}

export interface TradeHistoryItem {
  date: string;
  floor: string;
  type: string;
  price: number;
  change: string;
  isUp: boolean | null;
}

export interface PriceTrendPoint {
  month: string;
  sale: number;
  rent: number;
}

export interface ComplexDetailItem {
  id: string;
  name: string;
  sggNm: string;
  dongNm: string;
  buildYear: number;
  totalHouseholds: number;
  totalBuildings: number;
  address: string;
  baseSalePrice: number;
  baseRentPrice: number;
  pyungs: PyungDetail[];
  recentTrades?: TradeHistoryItem[];
  chartPoints?: PriceTrendPoint[];
}

/**
 * 동별 아파트 단지 목록 조회 API (GET /api/location/complexes)
 */
export async function getComplexesApi(
  sggNm: string,
  dongNm: string,
): Promise<ComplexDetailItem[]> {
  if (!sggNm || !dongNm) return [];
  try {
    const response = await apiMiddleware.get<any>("/api/location/complexes", {
      params: { sggNm, dongNm },
      silentAuthCheck: true,
    } as RetryableRequestConfig);
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.items)) return data.items;
    return [];
  } catch (error) {
    console.warn("Failed to fetch complexes from DB:", error);
    return [];
  }
}

/* ===============================
   가격정보 및 아파트별 비교 API
================================== */

/* 서울 자치구 항목 */
export interface SggLocationItem {
  sggCd: string;
  sggNm: string;
}

/* 서울 자치동 항목 */
export interface DongLocationItem {
  dongCd?: string;
  dongNm: string;
  sggCd?: string;
}

/* 아파트 단지 기본 정보 */
export interface ApartmentComplexItem {
  complexNo: string | number;
  complexName: string;
  sggNm: string;
  dongNm: string;
  address?: string;
  totalHouseholds?: number;
  buildYear?: number;
  imageUrl?: string;
}

/* 단지 핵심 시세 및 스펙 지표 */
export interface ApartmentCompareMetrics {
  avgPrice: number;
  recentPrice: number;
  recent3MonthVolume: number;
  totalHouseholds: number;
  buildYear: number;
  pricePerPyeong: number;
}

/* 아파트 단지 상세 정보 */
export interface ApartmentDetailData {
  name: string;
  district: string;
  dong: string;
  address: string;
  totalHouseholds: number;
  buildYear: number;
  floorInfo: string;
  parkingPerHousehold: number;
  imageUrl: string;
  metrics: ApartmentCompareMetrics;
}

/* 최근 3년 매매가 추이 포인트 */
export interface ApartmentCompareTrendPoint {
  date: string;
  apt1Price: number;
  apt2Price: number;
}

/* 면적별 평균 매매가 항목 */
export interface ApartmentCompareAreaPrice {
  areaName: string;
  apt1Price: number;
  apt2Price: number;
}

/* 비교 대상 단지 파라미터 */
export interface ApartmentTargetParam {
  district: string;
  dong: string;
  complexName: string;
}

/* 아파트별 시세 비교 요청 DTO */
export interface ApartmentCompareRequest {
  apt1: ApartmentTargetParam;
  apt2: ApartmentTargetParam;
}

/* 아파트별 시세 비교 응답 DTO */
export interface ApartmentCompareApiResponse {
  apt1: ApartmentDetailData;
  apt2: ApartmentDetailData;
  yearlyTrends: ApartmentCompareTrendPoint[];
  areaPrices: ApartmentCompareAreaPrice[];
  baseDate: string;
}

/* 1. 서울 자치구 목록 조회 API (GET /api/location/sggs) */
export async function getLocationSggsApi(): Promise<SggLocationItem[]> {
  const response = await apiMiddleware.get<any>("/api/location/sggs");
  const raw = response.data;
  const list = Array.isArray(raw) ? raw : (raw?.data ?? []);

  return list.map((item: any) => ({
    sggCd: String(item.sggCd ?? item.code ?? item.sggNm ?? ""),
    sggNm: String(item.sggNm ?? item.name ?? item.sgg ?? ""),
  }));
}

/* 2. 서울 자치동 목록 조회 API (GET /api/location/dongs) */
export async function getLocationDongsApi(
  sggCd: string,
): Promise<DongLocationItem[]> {
  if (!sggCd) return [];
  const response = await apiMiddleware.get<any>("/api/location/dongs", {
    params: { sggCd },
  });
  const raw = response.data;
  const list = Array.isArray(raw) ? raw : (raw?.data ?? []);

  return list.map((item: any) => ({
    dongCd: item.dongCd ? String(item.dongCd) : undefined,
    dongNm: String(item.dongNm ?? item.name ?? item.dong ?? ""),
    sggCd: item.sggCd ? String(item.sggCd) : undefined,
  }));
}

/* 3. 아파트 단지 목록 조회 API (GET /api/location/apartments) */
export async function getApartmentComplexesApi(
  district: string,
  dong: string,
): Promise<ApartmentComplexItem[]> {
  if (!district) return [];
  const response = await apiMiddleware.get<ApartmentComplexItem[]>(
    "/api/location/apartments",
    {
      params: { district, dong },
    },
  );
  return response.data;
}

/* 4. 아파트별 시세 비교 조회 API (GET /api/v1/price/compare-apartment) */
export async function getApartmentCompareApi(
  payload: ApartmentCompareRequest,
): Promise<ApartmentCompareApiResponse> {
  const response = await apiMiddleware.get<ApartmentCompareApiResponse>(
    "/api/v1/price/compare-apartment",
    {
      params: {
        apt1District: payload.apt1.district,
        apt1Dong: payload.apt1.dong,
        apt1Name: payload.apt1.complexName,
        apt2District: payload.apt2.district,
        apt2Dong: payload.apt2.dong,
        apt2Name: payload.apt2.complexName,
      },
    },
  );
  return response.data;
}

/* Q&A 첨부파일 API  */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type AiSearchResponse = {
  summary: string;
  keyPoints: string[];
  cautions: string[];
  criteria?: RankingCriteria;
  interpretation?: SearchInterpretation;
};

export type SearchInterpretation = {
  originalConcept: string;
  appliedMetric: string;
  reason: string;
  confidence: number;
  proxy: boolean;
};

export type RankingCriteria = {
  metric: string;
  unit: string;
  period: string;
  minimumTradeCount: number;
  sortDirection: string;
};

export type TradeVolumeRankingResponse = {
  regionName: string;
  periodStart: string;
  periodEnd: string;
  totalDealCount: number;
  criteria: RankingCriteria;
  items: Array<{
    rank: number;
    regionName?: string;
    apartmentName: string;
    mainAddressNumber?: string;
    subAddressNumber?: string;
    dealCount: number;
    averageTradeAmount?: number;
  }>;
};

export type PriceRankingResponse = {
  regionName: string;
  metricType: "pyeong" | "thing_amt";
  baseDate?: string;
  criteria: RankingCriteria;
  items: Array<{
    rank: number;
    regionName?: string;
    apartmentName: string;
    metricValue?: number;
    dealCount: number;
  }>;
};

export type DistrictRankingResponse = {
  regionName: string;
  metricType: "district_pyeong";
  baseDate?: string;
  criteria: RankingCriteria;
  items: Array<{
    rank: number;
    districtName: string;
    averagePyeongAmount: number;
    dealCount: number;
  }>;
};

export type NaturalRegionCandidate = DongRegionResponse & { slot: number };
export type NaturalSearchResponse = {
  status: "SUCCESS" | "NEED_CLARIFICATION" | "ERROR";
  intent?:
  | "PRICE_COMPARISON"
  | "SINGLE_REGION"
  | "DISTRICT_SUMMARY"
  | "DISTRICT_RANKING"
  | "TOP_BOTTOM"
  | "RANKING_SEARCH"
  | "TRADE_TREND";
  message?: string;
  result?:
  | AiSearchResponse
  | TradeVolumeRankingResponse
  | PriceRankingResponse
  | DistrictRankingResponse;
  missingFields: string[];
  candidates: NaturalRegionCandidate[];
  errorCode?: string;
  interpretation?: SearchInterpretation;
};

export async function searchNaturalWithAiApi(
  question: string,
): Promise<NaturalSearchResponse> {
  const response = await apiMiddleware.post<NaturalSearchResponse>(
    "/api/ai/search-natural",
    { question },
    { timeout: 120000 },
  );
  return response.data;
}

/* ==========================================
   메인페이지 API
========================================== */

export type MainPageRequest = {
  guCode?: string;
};

export type MainPageDistrict = {
  cgg_nm: string;
  avg_deal_price: number;
  avg_pyeong_price: number;
};

export type MainPageChangeRate = {
  bldg_nm: string;
  change_rate: number;
};

export type MainPagePriceChangeTop5 = {
  rising_top5: MainPageChangeRate[];
  falling_top5: MainPageChangeRate[];
};

export type MainPagePriceTrend = {
  period_label: string;
  start_date: string;
  end_date: string;
  avg_deal_price: number;
  avg_pyeong_price: number;
  deal_cnt: number;
};

export type MainPageTradingDong = {
  cgg_nm: string;
  stdg_nm: string;
  deal_cnt: number;
};

export type MainPagePopularDong = {
  cgg_nm: string;
  stdg_nm: string;
};

export type MainPageTradingApartment = {
  bldg_nm: string;
  recent_thing_amt: number;
  deal_cnt: number;
};

export type MainPageResponse = {
  cgg_cd: string;
  period_start: string;
  period_end: string;
  seoul_top5_districts: MainPageDistrict[];
  price_change_top5: MainPagePriceChangeTop5;
  preference_price_trend: MainPagePriceTrend[];
  preference_top_trading_dongs: MainPageTradingDong[];
  preference_popular_dong: MainPagePopularDong | null;
  preference_top_trading_apts: MainPageTradingApartment[];
};

export async function getMainPageApi(
  request: MainPageRequest = {},
): Promise<MainPageResponse> {
  const guCode = request.guCode?.trim();
  const response = await apiMiddleware.get<MainPageResponse>(
    "/fastApi/mainpage",
    guCode ? { params: { guCode } } : undefined,
  );
  return response.data;
}
// ===============================
// 내 정보 수정
// ===============================

// 전달된 필드만 선택적으로 변경한다.
// 휴대전화 번호를 변경할 때는 PASS 본인인증 결과인
// identityVerificationId를 phone과 함께 전달해야 한다.
export interface MemberUpdateRequest {
  password?: string;
  phone?: string;
  identityVerificationId?: string;
  email?: string;
  zipcode?: string;
  address?: string;
  addressDetail?: string;
  sgg_cd?: string;
}

// 현재 로그인한 회원의 비밀번호, 연락처 및 주소 정보를 수정한다.
// 인증 대상 회원은 요청 데이터가 아닌 Access Token을 기준으로 식별한다.
export async function updateMemberMeApi(
  request: MemberUpdateRequest,
): Promise<MemberMeResponse> {
  const response = await apiMiddleware.patch<MemberMeResponse>(
    "/api/members/me",
    request,
  );

  return response.data;
}

export async function deleteMyPreferredRegionApi(): Promise<void> {
  await apiMiddleware.delete("/api/members/me/preferred-region");
}

export type DongRegionResponse = {
  requestedName: string;
  dongName: string;
  dongCode: string;
  sggName: string;
  sggCode: string;
};
export async function resolveDongsApi(
  dong1: string,
  dong2: string,
): Promise<DongRegionResponse[]> {
  const response = await apiMiddleware.get<DongRegionResponse[]>(
    "/api/location/resolve-dongs",
    { params: { dong1, dong2 } },
  );
  return response.data;
}

export async function resolveDongApi(
  dong: string,
): Promise<DongRegionResponse[]> {
  const response = await apiMiddleware.get<DongRegionResponse[]>(
    "/api/location/resolve-dong",
    { params: { dong } },
  );
  return response.data;
}

export async function uploadQnaAttachmentsApi(
  qnaId: number,
  files: File[],
): Promise<AttachmentResponse[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await apiMiddleware.post<AttachmentResponse[]>(
    `/api/qnas/${qnaId}/attachments`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data;
}

export async function getQnaAttachmentsApi(
  qnaId: number,
): Promise<AttachmentResponse[]> {
  const response = await apiMiddleware.get<AttachmentResponse[]>(
    `/api/qnas/${qnaId}/attachments`,
  );
  return response.data || [];
}

export async function downloadQnaAttachmentApi(
  qnaId: number,
  attachmentId: number,
): Promise<AttachmentDownloadResponse> {
  const response = await apiMiddleware.get<AttachmentDownloadResponse>(
    `/api/qnas/${qnaId}/attachments/${attachmentId}/download`,
  );
  return response.data;
}

export async function deleteQnaAttachmentApi(
  qnaId: number,
  attachmentId: number,
): Promise<void> {
  await apiMiddleware.delete(`/api/qnas/${qnaId}/attachments/${attachmentId}`);
}

/* Q&A 첨부파일 커스텀 훅 */

export function useQnaAttachments(qnaId: number) {
  return useQuery<AttachmentResponse[]>({
    queryKey: ["qnaAttachments", qnaId],
    queryFn: () => getQnaAttachmentsApi(qnaId),
    enabled: Boolean(qnaId && qnaId > 0),
  });
}

export function useUploadQnaAttachments(qnaId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => uploadQnaAttachmentsApi(qnaId, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qnaAttachments", qnaId] });
    },
  });
}

export function useDeleteQnaAttachment(qnaId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: number) =>
      deleteQnaAttachmentApi(qnaId, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qnaAttachments", qnaId] });
    },
  });
}

export interface BoardFullDetailResponse {
  detail: BoardDetail;
  comments: BoardComment[];
  attachments: AttachmentResponse[];
}

/**
 * 쿼리 파라미터 방어 로직: null, undefined, 빈 문자열("") 항목을 제거하여 백엔드의 400 Bad Request / 500 오류 방지
 */
export interface ApartmentAutocompleteRequest {
  aptName?: string;
  sggCd?: string;
  dongCd?: string;
}

export interface ApartmentAutocompleteItem {
  aptName: string;
  mno: string;
  sno: string;
  dongCd: string;
  dongNm: string;
  sggCd: string;
  sggNm: string;
}

interface ApartmentAutocompleteApiItem {
  apt_name: string;
  mno: string;
  sno: string;
  dong_cd: string;
  dong_nm: string;
  sgg_cd: string;
  sgg_nm: string;
}

export async function searchApartmentAutocompleteApi(
  request: ApartmentAutocompleteRequest,
): Promise<ApartmentAutocompleteItem[]> {
  const response = await apiMiddleware.get<ApartmentAutocompleteApiItem[]>(
    "/elasticSearch/aptname",
    {
      params: {
        apt_name: request.aptName ?? "",
        sgg_cd: request.sggCd ?? "",
        dong_cd: request.dongCd ?? "",
      },
    },
  );

  return response.data.map((item) => ({
    aptName: item.apt_name,
    mno: item.mno,
    sno: item.sno,
    dongCd: item.dong_cd,
    dongNm: item.dong_nm,
    sggCd: item.sgg_cd,
    sggNm: item.sgg_nm,
  }));
}

export interface ApartmentMarketTrendRequest {
  guCode: string;
  dongCode: string;
  aptName: string;
  mno: string;
  sno: string;
}

export interface ApartmentMarketTrendItem {
  apt_name: string;
  cgg_cd: string;
  cgg_nm: string;
  stdg_cd: string;
  stdg_nm: string;
  total_deal_count: number;
  total_deal_amount: number;
  average_deal_price: number;
  max_deal_price: number;
  count_change_rate: number | null;
  biweekly_trend: Array<{
    biweekly_period: string;
    deal_count: number;
    avg_price: number;
  }>;
  area_ratio: Array<{
    exclusive_area: string;
    pyeong: number | null;
    share_percentage: number;
  }>;
  recent_deals: Array<{
    deal_date: string;
    exclusive_area: string;
    pyeong: number;
    floor: number;
    deal_amount: number;
  }>;
  area_deals: Array<{
    exclusive_area: string;
    pyeong: number;
    deal_count: number;
    avg_deal_price: number;
  }>;
}

export interface ApartmentMarketTrendResponse {
  status: string;
  search_period: {
    start_date: string;
    end_date: string;
  };
  count: number;
  data: ApartmentMarketTrendItem[];
}

export async function getApartmentMarketTrendApi(
  request: ApartmentMarketTrendRequest,
): Promise<ApartmentMarketTrendResponse> {
  const response = await apiMiddleware.get<ApartmentMarketTrendResponse>(
    "/fastApi/aptmkt",
    { params: request },
  );
  return response.data;
}

/** Elasticsearch 아파트 단지 목록 항목 */
export interface PriceDetailComplexItem {
  id: string;
  name: string;
  sggNm: string;
  dongNm: string;
  sggCd: string;
  dongCd: string;
  mno: string;
  sno: string;
  address: string;
  baseSalePrice?: number;
  pyungs: Array<{
    name: string;
    area?: number;
    salePrice?: number;
    rentPrice?: number;
    pricePerPyung?: number;
  }>;
}

/** Elasticsearch 아파트 단지 목록 조회 API (GET /elasticSearch/aptname) */
export async function getPriceDetailComplexesApi(
  sggCd: string,
  dongCd: string,
  sggNm = "",
  dongNm = "",
  aptName = "",
): Promise<PriceDetailComplexItem[]> {
  if (!sggCd || !dongCd) return [];

  const response = await apiMiddleware.get<unknown>("/elasticSearch/aptname", {
    params: { apt_name: aptName, sgg_cd: sggCd, dong_cd: dongCd },
    silentAuthCheck: true,
  } as RetryableRequestConfig);
  const payload = response.data as { data?: unknown } | unknown[];
  const rawList = Array.isArray(payload) ? payload : (payload.data ?? []);
  if (!Array.isArray(rawList)) return [];

  const complexes = new Map<string, PriceDetailComplexItem>();
  rawList.forEach((raw) => {
    if (!raw || typeof raw !== "object") return;
    const item = raw as Record<string, unknown>;
    const name = String(item.apt_name ?? item.aptName ?? "").trim();
    if (!name || complexes.has(name)) return;
    const itemSggCd = String(item.sgg_cd ?? sggCd);
    const itemDongCd = String(item.dong_cd ?? dongCd);
    const mno = String(item.mno ?? "");
    const sno = String(item.sno ?? "");
    complexes.set(name, {
      id: `${itemSggCd}-${itemDongCd}-${name}-${mno}-${sno}`,
      name,
      sggCd: itemSggCd,
      sggNm: String(item.sgg_nm ?? sggNm),
      dongCd: itemDongCd,
      dongNm: String(item.dong_nm ?? dongNm),
      mno,
      sno,
      address: String(item.address ?? item.roadNmAddr ?? item.jibunAddr ?? `${sggNm} ${dongNm}`),
      baseSalePrice: Number(item.baseSalePrice ?? 0) || undefined,
      pyungs: Array.isArray(item.pyungs) ? item.pyungs as PriceDetailComplexItem["pyungs"] : [],
    });
  });

  return Array.from(complexes.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "ko"),
  );
}

/** 아파트 유형 비교 요청 DTO (GET /fastApi/aptcompare) */
export interface AptCompareRequest {
  guCode: string;
  dongCode: string;
  aptName: string;
  mno: string;
  sno: string;
  queryType: "floor" | "pyeong";
  selectGroup1: string;
  selectGroup2: string;
}

export interface AptCompareGroup {
  pyeong_grp: string | null;
  flr_grp: string | null;
  deal_cnt: number | null;
  avg_thing_amt: number | null;
  avg_pyeong_amt: number | null;
  recent_thing_amt: number | null;
  recent_pyeong_amt: number | null;
  recent_deal_date: string | null;
  recent_supply_pyeong: number | null;
  recent_floor: number | null;
}

export interface AptCompareResponse {
  base_date: string;
  cgg_cd: string;
  cgg_nm: string;
  stdg_cd: string;
  stdg_nm: string;
  bldg_nm: string;
  grp: AptCompareGroup | null;
  grp2: AptCompareGroup | null;
}

/** 아파트 유형 비교 조회 API (GET /fastApi/aptcompare) */
export async function getAptCompareApi(
  request: AptCompareRequest,
): Promise<AptCompareResponse> {
  const response = await apiMiddleware.get<AptCompareResponse>(
    "/fastApi/aptcompare",
    { params: request },
  );

  return response.data;
}

/** 지역별 시세 비교 요청 DTO (GET /fastApi/compare) */
export interface RegionCompareRequest {
  guCode1: string;
  dongCode1: string;
  guCode2: string;
  dongCode2: string;
}

export interface RegionCompareSummary {
  cgg_cd: string;
  stdg_cd: string;
  total_count: number;
  avg_thing_amt: number;
  avg_pyeong_amt: number;
}

export interface RegionCompareResponse {
  base_date: string;
  region1: RegionCompareSummary;
  region2: RegionCompareSummary;
}

/** 지역별 시세 비교 조회 API (GET /fastApi/compare) */
export async function getRegionCompareApi(
  request: RegionCompareRequest,
): Promise<RegionCompareResponse> {
  const response = await apiMiddleware.get<RegionCompareResponse>(
    "/fastApi/compare",
    { params: request },
  );

  return response.data;
}

export function cleanParams<T extends Record<string, any>>(
  params: T,
): Record<string, any> {
  const cleaned: Record<string, any> = {};
  if (!params || typeof params !== "object") return cleaned;

  Object.keys(params).forEach((key) => {
    const val = params[key];
    if (val !== undefined && val !== null) {
      const strVal = String(val).trim();
      if (strVal !== "") {
        cleaned[key] = typeof val === "string" ? strVal : val;
      }
    }
  });

  return cleaned;
}
