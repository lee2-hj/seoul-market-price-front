/**
 * 게시글 종류 (공지사항 vs 일반 게시글)
 */
export type BoardPostType = "NOTICE" | "GENERAL";

/**
 * 공지사항 중요도 (중요 공지 vs 일반 공지)
 */
export type NoticeLevel = "IMPORTANT" | "NORMAL";

/**
 * 게시글 검색 옵션 (제목 vs 작성자)
 */
export type BoardSearchType = "title" | "author";

/**
 * 백엔드 게시글 목록 API의 개별 응답 항목 타입
 */
export interface BackendBoardListItem {
  id: number;
  postType: BoardPostType;
  noticeLevel?: NoticeLevel;
  title: string;
  userId?: number | null;
  memberId?: number | null;
  authorName?: string;
  viewCount: number;
  pinned: boolean;
  createdAt: string;
}

/**
 * 백엔드 게시글 상세 API 응답 타입
 */
export interface BackendBoardDetail {
  id: number;
  postType: BoardPostType;
  noticeLevel?: NoticeLevel;
  title: string;
  content: string;
  userId?: number | null;
  memberId?: number | null;
  authorName?: string;
  viewCount: number;
  visible?: boolean;
  pinned: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

/**
 * 백엔드 Spring Data Page 목록 응답 타입
 */
export interface BackendBoardPageResponse {
  content: BackendBoardListItem[];
  page: number; // 0-indexed
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

/**
 * 프론트엔드 내부 목록 표시용 게시글 항목 타입
 */
export interface BoardListItem {
  boardId: number;
  postType: BoardPostType;
  noticeLevel?: NoticeLevel;
  pinned: boolean;
  title: string;
  authorName: string;
  createdAt: string;
  viewCount: number;
  userId?: number | null;
}

/**
 * 프론트엔드 내부 상세 조회용 게시글 타입
 */
export interface BoardDetail {
  boardId: number;
  postType: BoardPostType;
  noticeLevel?: NoticeLevel;
  pinned: boolean;
  title: string;
  content: string;
  userId?: number | null;
  authorName: string;
  createdAt: string;
  updatedAt: string | null;
  viewCount: number;
}

/**
 * 게시글 목록 조회 요청 파라미터 타입 (프론트 기준 1-indexed page)
 */
export interface BoardListRequest {
  searchType: BoardSearchType;
  keyword: string;
  page: number; // 1부터 시작하는 페이지 번호
  size: number; // 페이지당 표시할 일반 게시글 수 (10개)
}

/**
 * 프론트엔드 화면 전달용 게시글 목록 페이징 응답 타입
 */
export interface BoardPageResponse {
  notices: BoardListItem[]; // 상단 고정 공지 2개
  items: BoardListItem[]; // 페이지에 해당되는 일반 및 기타 게시글 목록
  totalElements: number;
  totalPages: number;
  page: number; // 1부터 시작
  size: number;
}

/**
 * 게시글 작성 요청 데이터 타입
 */
export interface BoardCreateRequest {
  title: string;
  content: string;
}

/**
 * 게시글 수정 요청 데이터 타입
 */
export interface BoardUpdateRequest {
  title: string;
  content: string;
}

/**
 * CUD 처리 완료 응답 타입
 */
export interface BoardCommandResponse {
  boardId: number;
}

/**
 * 게시글 삭제 결과 응답 타입
 */
export interface BoardDeleteResponse {
  boardId: number;
  deleted: boolean;
}