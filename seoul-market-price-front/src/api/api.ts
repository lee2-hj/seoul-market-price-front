import axios from "axios";

import apiMiddleware, { BACKEND_URL } from "./middleware";

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
// 로그아웃 API
// ===============================

// HttpOnly인 refreshToken 쿠키는 프론트에서 지울 수 없어
// 서버가 로그아웃 시 Set-Cookie로 만료시켜줘야 한다.

export async function logoutApi() {
  const response = await apiMiddleware.post("/api/auth/logout");

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

export async function findIdApi(phone: string) {
  const response = await apiMiddleware.post("/api/users/find-id", {
    phone,
  });

  return response.data;
}

// ===============================
// 비밀번호 찾기
// ===============================

export async function findPasswordApi(userId: string, phone: string) {
  const response = await apiMiddleware.post("/api/users/find-password", {
    userId,
    phone,
  });

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
  isduplicated: boolean;
}

export async function checkMemberApi(name: string, phone: string) {
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

import type {
  BoardListRequest,
  BoardPageResponse,
  BoardListItem,
  BoardDetail,
  BoardCreateRequest,
  BoardUpdateRequest,
  BackendBoardPageResponse,
  BoardComment,
  CommentCreateRequest,
  CommentUpdateRequest,
} from "@/features/board/types/board.types";

/**
 * 게시글 목록 조회 API (GET /api/boards)
 */
export async function getBoardPostsApi(
  params: BoardListRequest = {}
): Promise<BoardPageResponse> {
  const { page = 1, size = 10, searchType, keyword } = params;

  const response = await apiMiddleware.get<BackendBoardPageResponse>("/api/boards", {
    params: {
      page: page - 1,
      size,
      searchType,
      keyword,
    },
  });

  const backendData: any = response.data || {};
  const contentArray = backendData.content || backendData.items || [];

  const allItems: BoardListItem[] = contentArray.map((item: any) => ({
    boardId: item.boardId || item.id,
    title: item.title || item.boardTitle || item.subject || "게시글 제목",
    authorName: item.authorName || item.writerName || item.writer || "작성자",
    createdAt: item.createdAt || item.createDate || item.regDate || "",
    viewCount: item.viewCount ?? item.hit ?? item.readCount ?? 0,
    postType: item.postType || item.type || "GENERAL",
    noticeLevel: item.noticeLevel,
  }));

  const notices = allItems
    .filter((i) => i.postType === "NOTICE")
    .sort((a, b) => (b.noticeLevel === "IMPORTANT" ? 1 : 0) - (a.noticeLevel === "IMPORTANT" ? 1 : 0));

  const pinnedNotices = notices.slice(0, 2);
  const items = allItems.filter((i) => !pinnedNotices.some((p) => p.boardId === i.boardId));

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
  const response = await apiMiddleware.get<any>(`/api/boards/${boardId}`);
  const data = response.data || {};

  return {
    boardId: data.boardId || data.id || boardId,
    title: data.title || data.boardTitle || data.subject || "",
    content: data.content || data.boardContent || data.body || "",
    authorName: data.authorName || data.writerName || data.writer || data.userName || "",
    authorId: data.authorId || data.writerId || data.userId || "user",
    createdAt: data.createdAt || data.createDate || data.regDate || "",
    viewCount: data.viewCount ?? data.hit ?? data.readCount ?? 0,
    postType: data.postType || data.type || "GENERAL",
  };
}

/**
 * 게시글 등록 API (POST /api/boards)
 */
export async function createBoardPostApi(
  data: BoardCreateRequest
): Promise<{ boardId: number }> {
  const response = await apiMiddleware.post<{ boardId: number }>("/api/boards", data);
  return response.data;
}

/**
 * 게시글 수정 API (PUT /api/boards/:boardId)
 */
export async function updateBoardPostApi(
  boardId: number,
  data: BoardUpdateRequest
): Promise<void> {
  await apiMiddleware.put(`/api/boards/${boardId}`, data);
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
export async function getBoardCommentsApi(boardId: number): Promise<BoardComment[]> {
  const response = await apiMiddleware.get<BoardComment[]>(`/api/boards/${boardId}/comments`);
  return response.data;
}

/**
 * 게시글 댓글 작성 API (POST /api/boards/:boardId/comments)
 */
export async function createBoardCommentApi(
  boardId: number,
  data: CommentCreateRequest,
  _authorInfo: { name: string; userId: string }
): Promise<BoardComment> {
  const response = await apiMiddleware.post<BoardComment>(`/api/boards/${boardId}/comments`, data);
  return response.data;
}

/**
 * 게시글 댓글 수정 API (PUT /api/boards/comments/:commentId)
 */
export async function updateBoardCommentApi(
  commentId: number,
  data: CommentUpdateRequest
): Promise<void> {
  await apiMiddleware.put(`/api/boards/comments/${commentId}`, data);
}

/**
 * 게시글 댓글 삭제 API (DELETE /api/boards/comments/:commentId)
 */
export async function deleteBoardCommentApi(commentId: number): Promise<void> {
  await apiMiddleware.delete(`/api/boards/comments/${commentId}`);
}

