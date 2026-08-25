import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

/* ===============================
   인증 / 회원 / 로그인 API
================================== */

export interface LoginResponse {
  accessToken: string;
  memberId: number;
  userId: string;
  name: string;
}

export async function loginApi(userId: string, password: string): Promise<LoginResponse> {
  const res = await apiMiddleware.post<LoginResponse>("/api/auth/login", { userId, password });
  return res.data;
}

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
  const res = await apiMiddleware.get<MemberMeResponse>("/api/members/me", {
    silentAuthCheck: true,
    params: { _t: Date.now() },
  } as RetryableRequestConfig);
  return res.data;
}

export async function logoutApi() {
  const res = await apiMiddleware.post("/api/auth/logout");
  return res.data;
}

export interface CurrentDistrictResponse {
  district: string;
}

export async function getCurrentDistrictApi(latitude: number, longitude: number): Promise<CurrentDistrictResponse> {
  const res = await apiMiddleware.get<CurrentDistrictResponse>("/api/location/current-district", {
    params: { latitude, longitude },
  });
  return res.data;
}

export function getKakaoLoginUrl(mode: "login" | "signup" = "login") {
  return `${BACKEND_URL}/oauth2/authorization/${mode === "signup" ? "kakao-signup" : "kakao"}`;
}

export function getGoogleLoginUrl(mode: "login" | "signup" = "login") {
  return `${BACKEND_URL}/oauth2/authorization/${mode === "signup" ? "google-signup" : "google"}`;
}

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
  const res = await apiMiddleware.post<SignupResponse>("/api/members/signup", signupData);
  return res.data;
}

export interface FindIdResponse {
  found: boolean;
  maskedUserIds: string[];
}

export async function findIdApi(
  identityVerificationId: string,
  name?: string,
  phone?: string,
): Promise<FindIdResponse> {
  const res = await apiMiddleware.post<FindIdResponse>("/api/members/find-id", {
    identityVerificationId,
    ...(name && { name }),
    ...(phone && { phone, phoneNumber: phone }),
  });
  return res.data;
}

export interface PasswordResetVerifyResponse {
  verified: boolean;
  resetToken: string;
  expiresInSeconds: number;
}

export async function verifyPasswordResetApi(
  identityVerificationId: string,
  userId: string,
): Promise<PasswordResetVerifyResponse> {
  const res = await apiMiddleware.post<PasswordResetVerifyResponse>(
    "/api/members/password-reset/verify",
    { identityVerificationId, userId },
  );
  return res.data;
}

export interface PasswordResetCompleteResponse {
  message: string;
}

export async function completePasswordResetApi(
  resetToken: string,
  newPassword: string,
  newPasswordConfirm: string,
): Promise<PasswordResetCompleteResponse> {
  const res = await apiMiddleware.post<PasswordResetCompleteResponse>(
    "/api/members/password-reset/complete",
    { resetToken, newPassword, newPasswordConfirm },
  );
  return res.data;
}

export interface PassResponse {
  passUrl: string;
}

export async function requestPassApi(phone: string): Promise<PassResponse> {
  const res = await apiMiddleware.post<PassResponse>("/api/pass/request", { phone });
  return res.data;
}

export async function sendPhoneAuthApi(phone: string) {
  const res = await apiMiddleware.post("/api/sms/send", { phone });
  return res.data;
}

export async function verifyPhoneAuthApi(phone: string, code: string) {
  const res = await apiMiddleware.post("/api/sms/verify", { phone, code });
  return res.data;
}

export async function checkUserIdApi(userId: string) {
  const res = await apiMiddleware.get("/api/members/check-id", { params: { userId } });
  return res.data;
}

export interface CheckMemberResponse {
  isduplicated?: boolean;
  verified?: boolean;
  name?: string;
  phoneNumber?: string;
  membershipStatus?: "NEW" | "ACTIVE" | "WITHDRAWN";
  signupAllowed?: boolean;
}

export async function checkMemberApi(name: string, phone: string): Promise<CheckMemberResponse> {
  const res = await apiMiddleware.get<CheckMemberResponse>("/api/members/check-member", {
    params: { name, phone },
  });
  return res.data;
}

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
  const res = await apiMiddleware.get<RawBoardDetail>(`/api/boards/${boardId}`);
  const d = res.data || {};
  return {
    boardId: d.boardId || d.id || boardId,
    title: d.title || d.boardTitle || d.subject || "",
    content: d.content || d.boardContent || d.body || "",
    authorName: d.authorName || d.writerName || d.writer || d.userName || "",
    authorId: d.authorId || d.writerId || d.userId || "user",
    createdAt: d.createdAt || d.createDate || d.regDate || "",
    viewCount: d.viewCount ?? d.hit ?? d.readCount ?? 0,
    postType: d.postType || (d.type as PostType) || "GENERAL",
  };
}

export interface BoardFullDetailResponse {
  detail: BoardDetail;
  comments: BoardComment[];
  attachments: AttachmentResponse[];
}

export async function getBoardFullDetailApi(boardId: number): Promise<BoardFullDetailResponse> {
  const res = await apiMiddleware.get<{ detail: RawBoardDetail; comments: BoardComment[]; attachments: AttachmentResponse[] }>(`/api/boards/${boardId}/full`);
  const d = res.data.detail || {};
  return {
    detail: {
      boardId: d.boardId || d.id || boardId,
      title: d.title || d.boardTitle || d.subject || "",
      content: d.content || d.boardContent || d.body || "",
      authorName: d.authorName || d.writerName || d.writer || d.userName || "",
      authorId: d.authorId || d.writerId || d.userId || "user",
      createdAt: d.createdAt || d.createDate || d.regDate || "",
      viewCount: d.viewCount ?? d.hit ?? d.readCount ?? 0,
      postType: d.postType || (d.type as PostType) || "GENERAL",
    },
    comments: res.data.comments || [],
    attachments: res.data.attachments || [],
  };
}

export async function createBoardPostApi(data: BoardCreateRequest): Promise<{ boardId: number }> {
  const res = await apiMiddleware.post<{ boardId: number }>("/api/boards", data);
  return res.data;
}

export async function updateBoardPostApi(boardId: number, data: BoardUpdateRequest): Promise<void> {
  await apiMiddleware.patch(`/api/boards/${boardId}`, data);
}

export async function deleteBoardPostApi(boardId: number): Promise<void> {
  await apiMiddleware.delete(`/api/boards/${boardId}`);
}

export async function getBoardCommentsApi(boardId: number): Promise<BoardComment[]> {
  const res = await apiMiddleware.get<BoardComment[]>(`/api/boards/${boardId}/comments`);
  return res.data;
}

export async function createBoardCommentApi(boardId: number, data: CommentCreateRequest): Promise<BoardComment> {
  const res = await apiMiddleware.post<BoardComment>(`/api/boards/${boardId}/comments`, data);
  return res.data;
}

export async function updateBoardCommentApi(boardId: number, commentId: number, data: CommentUpdateRequest): Promise<void> {
  await apiMiddleware.patch(`/api/boards/${boardId}/comments/${commentId}`, data);
}

export async function deleteBoardCommentApi(boardId: number, commentId: number): Promise<void> {
  await apiMiddleware.delete(`/api/boards/${boardId}/comments/${commentId}`);
}

export async function uploadBoardAttachmentsApi(boardId: number, files: File[]): Promise<AttachmentResponse[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const res = await apiMiddleware.post<AttachmentResponse[]>(`/api/boards/${boardId}/attachments`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function getBoardAttachmentsApi(boardId: number): Promise<AttachmentResponse[]> {
  const res = await apiMiddleware.get<AttachmentResponse[]>(`/api/boards/${boardId}/attachments`);
  return res.data || [];
}

export async function downloadBoardAttachmentApi(boardId: number, attachmentId: number): Promise<AttachmentDownloadResponse> {
  const res = await apiMiddleware.get<AttachmentDownloadResponse>(`/api/boards/${boardId}/attachments/${attachmentId}/download`);
  return res.data;
}

export async function deleteBoardAttachmentApi(boardId: number, attachmentId: number): Promise<void> {
  await apiMiddleware.delete(`/api/boards/${boardId}/attachments/${attachmentId}`);
}

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

export interface QnaPageResponse {
  content: QnaListResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export async function getQnasApi(page: number = 0, size: number = 5, keyword?: string) {
  const res = await apiMiddleware.get<QnaPageResponse>("/api/qnas", {
    params: { page, size, keyword: keyword?.trim() || undefined },
  });
  return res.data;
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

export async function getPublicFaqsApi(category?: string): Promise<FaqPublicResponse[]> {
  try {
    const res = await apiMiddleware.get<FaqPublicResponse[]>("/api/faqs", {
      params: { category: category && category !== "전체" ? category : undefined },
      silentAuthCheck: true,
    } as RetryableRequestConfig);
    return res.data || [];
  } catch {
    return [];
  }
}

export async function getPublicFaqApi(id: number): Promise<FaqPublicResponse> {
  const res = await apiMiddleware.get<FaqPublicResponse>(`/api/faqs/${id}`, { silentAuthCheck: true } as RetryableRequestConfig);
  return res.data;
}

/* ==========================================
   위치 / 자치구 / 자치동 & 단지 목록 API
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

export interface ComplexDetailItem {
  id: string;
  name: string;
  sggNm: string;
  dongNm: string;
  sggCd?: string;
  dongCd?: string;
  mno?: string;
  sno?: string;
  buildYear: number;
  totalHouseholds: number;
  totalBuildings: number;
  address: string;
  baseSalePrice?: number;
  baseRentPrice?: number;
  pyungs: Array<{
    name: string;
    area?: number;
    salePrice?: number;
    rentPrice?: number;
    recentTradeDate?: string;
    recentFloor?: number;
    pricePerPyung?: number;
  }>;
}

export async function getSggsApi(): Promise<SggItem[]> {
  try {
    const res = await apiMiddleware.get<any>("/api/location/sggs", { silentAuthCheck: true } as RetryableRequestConfig);
    const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    return list
      .map((i: any) => ({ sggCd: String(i.sggCd ?? i.sgg_cd ?? i.code ?? "").trim(), sggNm: String(i.sggNm ?? i.sgg_nm ?? i.name ?? "").trim() }))
      .filter((i: SggItem) => Boolean(i.sggCd && i.sggNm));
  } catch {
    return [];
  }
}

export async function getDongsApi(sggCd: string): Promise<DongItem[]> {
  if (!sggCd) return [];
  try {
    const res = await apiMiddleware.get<any>("/api/location/dongs", { params: { sggCd }, silentAuthCheck: true } as RetryableRequestConfig);
    const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    return list
      .map((i: any) => ({
        dongCd: String(i.dongCd ?? i.dong_cd ?? i.code ?? "").trim(),
        dongNm: String(i.dongNm ?? i.dong_nm ?? i.name ?? "").trim(),
        sggCd: String(i.sggCd ?? i.sgg_cd ?? sggCd).trim(),
      }))
      .filter((i: DongItem) => Boolean(i.dongNm));
  } catch {
    return [];
  }
}

export async function getComplexesApi(
  sggCd: string,
  dongCd: string,
  sggNm: string = "",
  dongNm: string = "",
  aptName: string = "",
): Promise<ComplexDetailItem[]> {
  if (!sggCd || !dongCd) return [];
  try {
    const res = await apiMiddleware.get<any>("/elasticSearch/aptname", {
      params: { apt_name: aptName, sgg_cd: sggCd, dong_cd: dongCd },
      silentAuthCheck: true,
    } as RetryableRequestConfig);

    const rawList = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    const uniqueMap = new Map<string, ComplexDetailItem>();

    rawList.forEach((item: any) => {
      const name = String(item.apt_name || item.aptName || "").trim();
      if (!name || uniqueMap.has(name)) return;
      const mno = String(item.mno || "");
      const sno = String(item.sno || "");
      const itemSggCd = String(item.sgg_cd || sggCd);
      const itemDongCd = String(item.dong_cd || dongCd);

      uniqueMap.set(name, {
        id: `${itemSggCd}-${itemDongCd}-${name}-${mno}-${sno}`,
        name,
        sggCd: itemSggCd,
        sggNm: String(item.sgg_nm || sggNm),
        dongCd: itemDongCd,
        dongNm: String(item.dong_nm || dongNm),
        mno,
        sno,
        buildYear: Number(item.buildYear || item.build_year || (item.useAprvYmd ? String(item.useAprvYmd).slice(0, 4) : 0)),
        totalHouseholds: Number(item.totalHouseholds || item.total_households || item.totHsehldCnt || 0),
        totalBuildings: Number(item.totalBuildings || item.total_buildings || item.totDongCnt || 0),
        address: String(item.address || item.roadNmAddr || item.jibunAddr || `${sggNm} ${dongNm}`),
        pyungs: Array.isArray(item.pyungs) ? item.pyungs : [],
      });
    });

    return Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name, "ko"));
  } catch {
    return [];
  }
}

/* AI 자연어 검색 API */

export type AiSearchResponse = {
  summary: string;
  keyPoints: string[];
  cautions: string[];
  criteria?: RankingCriteria;
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
}

export async function updateMemberMeApi(request: MemberUpdateRequest): Promise<MemberMeResponse> {
  const res = await apiMiddleware.patch<MemberMeResponse>("/api/members/me", request);
  return res.data;
}

export type DongRegionResponse = {
  requestedName: string;
  dongName: string;
  dongCode: string;
  sggName: string;
  sggCode: string;
};

export async function resolveDongsApi(dong1: string, dong2: string): Promise<DongRegionResponse[]> {
  const res = await apiMiddleware.get<DongRegionResponse[]>("/api/location/resolve-dongs", { params: { dong1, dong2 } });
  return res.data;
}

export async function resolveDongApi(dong: string): Promise<DongRegionResponse[]> {
  const res = await apiMiddleware.get<DongRegionResponse[]>("/api/location/resolve-dong", { params: { dong } });
  return res.data;
}

export async function uploadQnaAttachmentsApi(qnaId: number, files: File[]): Promise<AttachmentResponse[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const res = await apiMiddleware.post<AttachmentResponse[]>(`/api/qnas/${qnaId}/attachments`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function getQnaAttachmentsApi(qnaId: number): Promise<AttachmentResponse[]> {
  const res = await apiMiddleware.get<AttachmentResponse[]>(`/api/qnas/${qnaId}/attachments`);
  return res.data || [];
}

export async function downloadQnaAttachmentApi(qnaId: number, attachmentId: number): Promise<AttachmentDownloadResponse> {
  const res = await apiMiddleware.get<AttachmentDownloadResponse>(`/api/qnas/${qnaId}/attachments/${attachmentId}/download`);
  return res.data;
}

export async function deleteQnaAttachmentApi(qnaId: number, attachmentId: number): Promise<void> {
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["qnaAttachments", qnaId] }),
  });
}

export function useDeleteQnaAttachment(qnaId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: number) => deleteQnaAttachmentApi(qnaId, attachmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["qnaAttachments", qnaId] }),
  });
}

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

export async function searchApartmentAutocompleteApi(
  request: ApartmentAutocompleteRequest,
): Promise<ApartmentAutocompleteItem[]> {
  const res = await apiMiddleware.get<any[]>("/elasticSearch/aptname", {
    params: {
      apt_name: request.aptName ?? "",
      sgg_cd: request.sggCd ?? "",
      dong_cd: request.dongCd ?? "",
    },
  });

  return (res.data || []).map((item) => ({
    aptName: item.apt_name,
    mno: item.mno,
    sno: item.sno,
    dongCd: item.dong_cd,
    dongNm: item.dong_nm,
    sggCd: item.sgg_cd,
    sggNm: item.sgg_nm,
  }));
}

/* ==========================================
   아파트 실거래 시장 트렌드 및 비교 분석 API (FastAPI)
========================================== */

export interface ApartmentMarketTrendRequest {
  guCode: string;
  dongCode: string;
  aptName: string;
  mno: string;
  sno: string;
}

export interface ApartmentMarketTrendResponse {
  status: string;
  search_period: { start_date: string; end_date: string };
  count: number;
  data: Array<{
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
    biweekly_trend: Array<{ biweekly_period: string; deal_count: number; avg_price: number }>;
    area_ratio: Array<{ exclusive_area: string; pyeong: number | null; share_percentage: number }>;
    recent_deals: Array<{ deal_date: string; exclusive_area: string; pyeong: number; floor: number; deal_amount: number }>;
    area_deals: Array<{ exclusive_area: string; pyeong: number; deal_count: number; avg_deal_price: number }>;
  }>;
}

export async function getApartmentMarketTrendApi(
  request: ApartmentMarketTrendRequest,
): Promise<ApartmentMarketTrendResponse> {
  const res = await apiMiddleware.get<ApartmentMarketTrendResponse>("/fastApi/aptmkt", { params: request });
  return res.data;
}

export interface AptCompareRequest {
  query_type: string;
  pyeong?: string | number;
  floor?: string;
  query_value?: string;
  guCode?: string;
  dongCode?: string;
  aptName?: string;
  mno?: string;
  sno?: string;
}

export interface AptCompareResponse {
  status?: string;
  count?: number;
  data?: any;
  [key: string]: any;
}

export async function getAptCompareApi(
  request: AptCompareRequest,
): Promise<AptCompareResponse> {
  const res = await apiMiddleware.get<AptCompareResponse>("/fastApi/aptcompare", { params: request });
  return res.data;
}
