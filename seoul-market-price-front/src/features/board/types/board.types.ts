/**
 * 게시글 종류이다.
 *
 * NOTICE는 관리자 공지사항,
 * GENERAL은 일반 사용자의 게시글이다.
 */
export type BoardPostType =
    | "NOTICE"
    | "GENERAL";

/**
 * 공지사항 중요도이다.
 *
 * IMPORTANT는 중요 공지,
 * NORMAL은 일반 공지이다.
 *
 * 일반 게시글은 화면 데이터 통일을 위해
 * NORMAL 값을 사용한다.
 */
export type NoticeLevel =
    | "IMPORTANT"
    | "NORMAL";

/**
 * 게시글 검색 종류이다.
 */
export type BoardSearchType =
    | "title"
    | "author";

/**
 * 게시글 목록 한 건의 응답 타입이다.
 *
 * 게시글 목록에서는 본문과 첨부파일 전체가 필요하지 않으므로
 * 목록 화면에 필요한 정보만 정의한다.
 */
export interface BoardListItem {
    /**
     * 게시글 고유번호이다.
     */
    boardId: number;

    /**
 * NOTICE 또는 GENERAL 게시글 구분이다.
 */
    postType: BoardPostType;

    /**
     * IMPORTANT 또는 NORMAL 공지 중요도이다.
     */
    noticeLevel: NoticeLevel;

    /**
     * 게시글을 상단 고정 영역에 표시할지 여부이다.
     */
    pinned: boolean;

    /**
     * 게시글 제목이다.
     */
    title: string;

    /**
     * 작성자 이름이다.
     */
    authorName: string;

    /**
     * 게시글 작성 시각이다.
     *
     * 백엔드에서는 ISO-8601 문자열로 전달하는 것을 가정한다.
     *
     * 예:
     * 2026-08-04T14:30:00
     */
    createdAt: string;

    /**
     * 게시글 조회수이다.
     */
    viewCount: number;
}

/**
 * 게시글 첨부파일 응답 타입이다.
 *
 * 실제 파일은 MinIO에 저장하고,
 * DB에는 파일 정보와 저장 위치를 관리하는 구조를 가정한다.
 */
export interface BoardAttachment {
    /**
     * 첨부파일 고유번호이다.
     */
    attachmentId: number;

    /**
     * 사용자가 업로드한 원본 파일 이름이다.
     */
    fileName: string;

    /**
     * 첨부파일 크기(Byte)이다.
     */
    fileSize: number;

    /**
     * 첨부파일 다운로드 API 주소이다.
     *
     * MinIO의 실제 저장 주소를 프론트에 직접 노출하지 않고,
     * 백엔드 다운로드 API 주소를 전달하는 구조를 가정한다.
     */
    downloadUrl: string;
}

/**
 * 게시글 상세 조회 응답 타입이다.
 */
export interface BoardDetail {
    /**
     * 게시글 고유번호이다.
     */
    boardId: number;

    /**
    * NOTICE 또는 GENERAL 게시글 구분이다.
    */
    postType: BoardPostType;

    /**
     * IMPORTANT 또는 NORMAL 공지 중요도이다.
     */
    noticeLevel: NoticeLevel;

    /**
     * 게시글을 상단 고정 영역에 표시할지 여부이다.
     */
    pinned: boolean;

    /**
     * 게시글 제목이다.
     */
    title: string;

    /**
     * 게시글 본문이다.
     */
    content: string;

    /**
     * 게시글 작성자의 회원 고유번호이다.
     *
     * 본인이 작성한 게시글인지 확인할 때 사용할 수 있다.
     * 실제 수정·삭제 권한은 반드시 백엔드에서도 검사해야 한다.
     */
    authorId: number | null;

    /**
     * 작성자 이름이다.
     */
    authorName: string;

    /**
     * 게시글 작성 시각이다.
     */
    createdAt: string;

    /**
     * 게시글 최종 수정 시각이다.
     *
     * 한 번도 수정되지 않은 게시글이라면 null일 수 있다.
     */
    updatedAt: string | null;

    /**
     * 게시글 조회수이다.
     */
    viewCount: number;

    /**
     * 게시글 첨부파일 목록이다.
     */
    attachments: BoardAttachment[];
}

/**
 * 게시글 목록 조회 요청이다.
 *
 * 프론트 화면에서는 페이지 번호를 1부터 사용한다.
 * Spring Data Pageable은 0부터 사용하므로
 * boardApi.ts에서 page - 1로 변환한다.
 */
export interface BoardListRequest {
    /**
     * 제목 또는 작성자 검색 종류이다.
     */
    searchType: BoardSearchType;

    /**
     * 검색어이다.
     *
     * 전체 조회라면 빈 문자열을 전달한다.
     */
    keyword: string;

    /**
     * 현재 페이지 번호이다.
     *
     * 프론트 기준으로 1부터 시작한다.
     */
    page: number;

    /**
 * 상단 공지를 제외한 목록에 표시할 게시글 개수이다.
 *
 * 남은 공지사항과 일반 게시글을 합쳐
 * 페이지당 size개씩 표시한다.
 */
    size: number;
}

/**
 * 게시글 목록의 페이징 응답이다.
 *
 * 백엔드의 Spring Page 응답을 boardApi.ts에서
 * 이 구조로 변환하여 페이지 컴포넌트에 전달한다.
 */
export interface BoardPageResponse {
    /**
 * 상단 공지를 제외한 목록이다.
 *
 * 남은 공지사항과 일반 게시글이 최신순으로 섞여 있으며,
 * 페이지당 size개씩 포함한다.
 */
    items: BoardListItem[];

    /**
 * 목록 상단에 별도로 표시할 공지사항이다.
 *
 * 중요 공지 1개와 일반 공지 1개를 포함한다.
 */
    notices: BoardListItem[];

    /**
 * 상단 공지를 제외한 게시글 전체 개수이다.
 */
    totalElements: number;

    /**
 * 상단 공지를 제외한 목록 기준 전체 페이지 개수이다.
 */
    totalPages: number;

    /**
     * 현재 페이지 번호이다.
     *
     * 프론트 기준으로 1부터 시작한다.
     */
    page: number;

    /**
 * 상단 공지를 제외한 목록에 한 페이지당 표시하는 개수이다.
 */
    size: number;
}

/**
 * 일반 게시글 등록 요청이다.
 *
 * 작성자 정보는 Access Token의 인증 정보에서 확인해야 하므로
 * 프론트 요청 Body에 memberId나 작성자 이름을 포함하지 않는다.
 */
export interface BoardCreateRequest {
    /**
     * 게시글 제목이다.
     *
     * 프론트와 백엔드 모두 최대 20자를 검증해야 한다.
     */
    title: string;

    /**
     * 게시글 본문이다.
     */
    content: string;
}

/**
 * 일반 게시글 수정 요청이다.
 *
 * 수정할 게시글 번호는 URL Path Variable로 전달하며
 * 요청 Body에는 변경할 제목과 본문만 포함한다.
 */
export interface BoardUpdateRequest {
    /**
     * 수정할 제목이다.
     */
    title: string;

    /**
     * 수정할 본문이다.
     */
    content: string;
}

/**
 * 게시글 등록 또는 수정 완료 응답이다.
 *
 * 처리 완료 후 상세 화면으로 이동할 수 있도록
 * 게시글 번호를 반환받는 구조를 가정한다.
 */
export interface BoardCommandResponse {
    /**
     * 등록 또는 수정된 게시글 번호이다.
     */
    boardId: number;
}

/**
 * 게시글 삭제 완료 응답이다.
 *
 * 백엔드가 DELETE 요청에 204 No Content를 반환한다면
 * 이 타입은 사용하지 않아도 된다.
 */
export interface BoardDeleteResponse {
    /**
     * 삭제된 게시글 번호이다.
     */
    boardId: number;

    /**
     * 삭제 처리 결과이다.
     */
    deleted: boolean;
}