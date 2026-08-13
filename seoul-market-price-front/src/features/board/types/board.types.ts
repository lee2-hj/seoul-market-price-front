/**
  * 게시글 유형 (NOTICE: 공지사항, GENERAL: 일반게시글)
  */
export type PostType = "NOTICE" | "GENERAL";

/**
 * 공지사항 우대 레벨 (IMPORTANT: 중요공지 상단고정, NORMAL: 일반공지)
 */
export type NoticeLevel = "IMPORTANT" | "NORMAL";

/**
 * 게시판 검색 타입 (title: 제목, author: 작성자)
 */
export type BoardSearchType = "TITLE" | "WRITER";

/**
 * 게시글 목록용 프론트엔드 모델
 */
export interface BoardListItem {
  boardId: number;
  title: string;
  authorName: string;
  createdAt: string;
  viewCount: number;
  postType: PostType;
  noticeLevel?: NoticeLevel;
}

/**
 * 게시글 상세 정보 모델
 */
export interface BoardDetail {
  boardId: number;
  title: string;
  content: string;
  authorName: string;
  authorId?: string;
  createdAt: string;
  viewCount: number;
  postType: PostType;
}

/**
 * 게시글 댓글 모델
 */
export interface BoardComment {
  commentId: number;
  boardId: number;
  authorName: string;
  authorId: string;
  content: string;
  createdAt: string;
}

/**
 * 댓글 등록 요청 DTO
 */
export interface CommentCreateRequest {
  content: string;
}

/**
 * 댓글 수정 요청 DTO
 */
export interface CommentUpdateRequest {
  content: string;
}

/**
 * 프론트엔드 페이징 응답 모델
 */
export interface BoardPageResponse {
  notices: BoardListItem[];
  items: BoardListItem[];
  totalPages: number;
  totalElements: number;
  currentPage: number;
}

/**
 * 게시글 목록 요청 쿼리 파라미터 DTO
 */
export interface BoardListRequest {
  page?: number;
  size?: number;
  searchType?: BoardSearchType;
  keyword?: string;
}

/**
 * 게시글 생성 요청 DTO
 */
export interface BoardCreateRequest {
  title: string;
  content: string;
  postType?: PostType;
  file?: File | null;
}

/**
 * 게시글 수정 요청 DTO
 */
export interface BoardUpdateRequest {
  title?: string;
  content?: string;
  file?: File | null;
}

/**
 * 첨부파일 응답 모델 / DTO
 */
export interface AttachmentResponse {
  attachmentId?: number;
  id?: number;
  boardId?: number;
  fileName?: string;
  originalFilename?: string;
  fileSize?: number;
  size?: number;
  contentType?: string;
  uploadedAt?: string;
  createdAt?: string;
}

/**
 * 첨부파일 다운로드 URL 응답 모델 / DTO
 */
export interface AttachmentDownloadResponse {
  downloadUrl: string;
  fileName?: string;
  originalFilename?: string;
  expiresAt?: string;
  expiresInSeconds?: number;
}
