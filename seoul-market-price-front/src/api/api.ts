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
  preferredDistrict: string;
  myGu: string | null;
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
  // 헤더가 로그인 상태로 남는 문제가 생긴다.
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
  commentId: number,
  data: CommentUpdateRequest,
): Promise<void> {
  await apiMiddleware.patch(`/api/boards/comments/${commentId}`, data);
}

/**
 * 게시글 댓글 삭제 API (DELETE /api/boards/comments/:commentId)
 */
export async function deleteBoardCommentApi(commentId: number): Promise<void> {
  await apiMiddleware.delete(`/api/boards/comments/${commentId}`);
}

/* ==========================================
 게시판 첨부파일 API (추가 요청용)
========================================== */

import type {
  AttachmentResponse,
  AttachmentDownloadResponse,
} from "@/features/board/types/board.types";

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
  const response = await apiMiddleware.get<FaqPublicResponse[]>("/api/faqs", {
    params: {
      category: category && category !== "전체" ? category : undefined,
    },
  });

  return response.data || [];
}

/**
 * 공개 FAQ 상세 조회 API (GET /api/faqs/:id)
 */
export async function getPublicFaqApi(id: number): Promise<FaqPublicResponse> {
  const response = await apiMiddleware.get<FaqPublicResponse>(
    `/api/faqs/${id}`,
  );
  return response.data;
}
