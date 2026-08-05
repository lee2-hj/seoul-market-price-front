import apiMiddleware from "./middleware";

import {
    findMockBoardPost,
    MOCK_BOARD_POSTS,
} from "@/features/board/data/mockBoardPosts";

import type {
    BoardAttachment,
    BoardCommandResponse,
    BoardCreateRequest,
    BoardDeleteResponse,
    BoardDetail,
    BoardListItem,
    BoardListRequest,
    BoardPageResponse,
    BoardPostType,
    BoardUpdateRequest,
} from "@/features/board/types/board.types";

/**
 * .env.local의 설정값으로 Mock 데이터와 실제 API를 구분한다.
 *
 * VITE_BOARD_API_MODE=mock : 프론트 Mock 데이터 사용
 * VITE_BOARD_API_MODE=real : 백엔드 API 호출
 */
const BOARD_API_MODE =
    import.meta.env.VITE_BOARD_API_MODE ?? "mock";

/**
 * 백엔드가 목록 API에서 전달하는 게시글 형식이다.
 *
 * 백엔드는 id를 사용하고,
 * 프론트 내부 화면은 boardId를 사용하므로
 * 아래 변환 함수에서 한 번만 이름을 맞춘다.
 */
type BackendBoardListItem =
    Omit<BoardListItem, "boardId"> & {
        id: number;
    };

/**
 * 백엔드가 상세 API에서 전달하는 게시글 형식이다.
 */
type BackendBoardDetail =
    Omit<BoardDetail, "boardId"> & {
        id: number;
    };

/**
 * 백엔드 게시판 목록 응답 형식이다.
 *
 * Spring Data의 페이지 번호는 0부터 시작한다고 가정한다.
 */
type BackendBoardPageResponse =
    Omit<
        BoardPageResponse,
        | "items"
        | "notices"
        | "page"
    > & {
        items: BackendBoardListItem[];
        notices: BackendBoardListItem[];
        page: number;
    };

/**
 * 현재 Mock 모드인지 확인한다.
 */
function isMockMode(): boolean {
    return BOARD_API_MODE === "mock";
}

/**
 * 날짜 문자열을 비교 가능한 숫자로 변환한다.
 *
 * Mock의 2026-08-05 형식과
 * 백엔드의 ISO-8601 형식을 모두 처리한다.
 */
function getDateValue(
    date: string,
): number {
    return new Date(
        date.replace(/\./g, "-"),
    ).getTime();
}

/**
 * 게시글을 작성일 최신순으로 정렬한다.
 *
 * 작성일이 같다면 게시글 번호가 큰 항목을 먼저 표시한다.
 */
function sortByLatest(
    first: BoardListItem,
    second: BoardListItem,
): number {
    const dateDifference =
        getDateValue(second.createdAt) -
        getDateValue(first.createdAt);

    if (dateDifference !== 0) {
        return dateDifference;
    }

    return second.boardId - first.boardId;
}

/**
 * Mock 게시글을 프론트 목록 응답 형식으로 변환한다.
 */
function convertMockPostToListItem(
    post: (typeof MOCK_BOARD_POSTS)[number],
): BoardListItem {
    return {
        boardId: post.id,
        postType: post.postType,
        noticeLevel: post.noticeLevel,
        pinned: post.pinned,
        title: post.title,
        authorName: post.author,
        createdAt: post.createdAt,
        viewCount: post.viewCount,
    };
}

/**
 * Mock 게시글을 프론트 상세 응답 형식으로 변환한다.
 */
function convertMockPostToDetail(
    post: (typeof MOCK_BOARD_POSTS)[number],
): BoardDetail {
    const attachments: BoardAttachment[] =
        post.attachmentName
            ? [
                {
                    attachmentId: post.id,
                    fileName: post.attachmentName,
                    fileSize: 0,
                    downloadUrl: "",
                },
            ]
            : [];

    return {
        boardId: post.id,
        postType: post.postType,
        noticeLevel: post.noticeLevel,
        pinned: post.pinned,
        title: post.title,
        content: post.content,
        authorId:
            post.postType === "NOTICE"
                ? null
                : post.id,
        authorName: post.author,
        createdAt: post.createdAt,
        updatedAt: null,
        viewCount: post.viewCount,
        attachments,
    };
}

/**
 * 백엔드 목록 게시글을 프론트 내부 형식으로 변환한다.
 *
 * 백엔드 id를 화면에서 사용하는 boardId로 바꾼다.
 */
function convertBackendListItem(
    item: BackendBoardListItem,
): BoardListItem {
    return {
        boardId: item.id,
        postType: item.postType,
        noticeLevel: item.noticeLevel,
        pinned: item.pinned,
        title: item.title,
        authorName: item.authorName,
        createdAt: item.createdAt,
        viewCount: item.viewCount,
    };
}

/**
 * 백엔드 상세 게시글을 프론트 내부 형식으로 변환한다.
 */
function convertBackendDetail(
    item: BackendBoardDetail,
): BoardDetail {
    return {
        boardId: item.id,
        postType: item.postType,
        noticeLevel: item.noticeLevel,
        pinned: item.pinned,
        title: item.title,
        content: item.content,
        authorId: item.authorId,
        authorName: item.authorName,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        viewCount: item.viewCount,
        attachments: item.attachments,
    };
}

/**
 * 백엔드 목록 응답을 프론트 페이지 응답 형식으로 변환한다.
 *
 * Spring Data는 페이지 번호를 0부터 사용하므로,
 * 화면에서는 1부터 사용하도록 변환한다.
 */
function convertBackendPageResponse(
    response: BackendBoardPageResponse,
): BoardPageResponse {
    return {
        items: response.items.map(
            convertBackendListItem,
        ),
        notices: response.notices.map(
            convertBackendListItem,
        ),
        totalElements: response.totalElements,
        totalPages: response.totalPages,
        page: response.page + 1,
        size: response.size,
    };
}

/**
 * 검색 조건에 게시글이 포함되는지 확인한다.
 */
function matchesSearchCondition(
    item: BoardListItem,
    request: BoardListRequest,
): boolean {
    const keyword =
        request.keyword.trim().toLowerCase();

    if (!keyword) {
        return true;
    }

    if (request.searchType === "author") {
        return item.authorName
            .toLowerCase()
            .includes(keyword);
    }

    return item.title
        .toLowerCase()
        .includes(keyword);
}

/**
 * Mock 게시판 목록을 만든다.
 *
 * 표시 규칙
 *
 * 1. 중요 공지 중 최신 1개를 상단에 표시한다.
 * 2. 일반 공지 중 최신 1개를 상단에 표시한다.
 * 3. 상단 공지 2개를 제외한다.
 * 4. 남은 공지와 일반 게시글을 최신순으로 섞는다.
 * 5. 섞인 목록을 페이지당 size개씩 표시한다.
 */
function getMockBoardPosts(
    request: BoardListRequest,
): BoardPageResponse {
    const matchedPosts =
        MOCK_BOARD_POSTS
            .map(convertMockPostToListItem)
            .filter((item) =>
                matchesSearchCondition(
                    item,
                    request,
                ),
            );

    /**
     * IMPORTANT 공지 중 상단에 표시할 중요 공지 후보이다.
     */
    const importantNotices = matchedPosts
        .filter(
            (item) =>
                item.postType === "NOTICE" &&
                item.noticeLevel === "IMPORTANT" &&
                item.pinned,
        )
        .sort(sortByLatest);

    /**
     * NORMAL 공지 중 상단에 표시할 최근 공지 후보이다.
     */
    const normalNotices = matchedPosts
        .filter(
            (item) =>
                item.postType === "NOTICE" &&
                item.noticeLevel === "NORMAL" &&
                item.pinned,
        )
        .sort(sortByLatest);

    /*
     * 중요 공지 1개와 최근 일반 공지 1개를
     * 목록 상단에 별도로 표시한다.
     */
    const headerNotices = [
        importantNotices[0],
        normalNotices[0],
    ].filter(
        (
            notice,
        ): notice is BoardListItem =>
            notice !== undefined,
    );

    /*
     * 상단에 나온 공지는 아래 목록에서 제외한다.
     */
    const headerNoticeIds = new Set(
        headerNotices.map(
            (notice) => notice.boardId,
        ),
    );

    /*
     * 남은 공지사항과 일반 게시글을 합쳐
     * 최신순으로 정렬한다.
     */
    const timelineItems = matchedPosts
        .filter(
            (item) =>
                !headerNoticeIds.has(
                    item.boardId,
                ),
        )
        .sort(sortByLatest);

    const totalElements =
        timelineItems.length;

    const totalPages = Math.max(
        1,
        Math.ceil(
            totalElements / request.size,
        ),
    );

    /*
     * URL에 잘못된 페이지 번호가 있어도
     * 마지막 페이지 범위 안에서 조회한다.
     */
    const currentPage = Math.min(
        Math.max(request.page, 1),
        totalPages,
    );

    const startIndex =
        (currentPage - 1) * request.size;

    const items = timelineItems.slice(
        startIndex,
        startIndex + request.size,
    );

    return {
        notices: headerNotices,
        items,
        totalElements,
        totalPages,
        page: currentPage,
        size: request.size,
    };
}

/**
 * 게시판 목록을 조회한다.
 */
export async function getBoardPostsApi(
    request: BoardListRequest,
): Promise<BoardPageResponse> {
    if (isMockMode()) {
        return getMockBoardPosts(request);
    }

    const response =
        await apiMiddleware.get<BackendBoardPageResponse>(
            "/api/boards",
            {
                params: {
                    searchType: request.searchType,
                    keyword: request.keyword,
                    page: request.page - 1,
                    size: request.size,
                },
            },
        );

    return convertBackendPageResponse(
        response.data,
    );
}

/**
 * 게시글 상세 정보를 조회한다.
 */
export async function getBoardPostApi(
    boardId: number,
): Promise<BoardDetail> {
    if (isMockMode()) {
        const foundPost =
            findMockBoardPost(boardId);

        if (!foundPost) {
            throw new Error(
                "게시글을 찾을 수 없습니다.",
            );
        }

        return convertMockPostToDetail(
            foundPost,
        );
    }

    const response =
        await apiMiddleware.get<BackendBoardDetail>(
            `/api/boards/${boardId}`,
        );

    return convertBackendDetail(
        response.data,
    );
}

/**
 * 일반 게시글을 등록한다.
 *
 * 실제 작성자 정보는 Access Token을 기준으로
 * 백엔드에서 확인해야 한다.
 */
export async function createBoardPostApi(
    request: BoardCreateRequest,
): Promise<BoardCommandResponse> {
    if (isMockMode()) {
        const nextBoardId =
            Math.max(
                ...MOCK_BOARD_POSTS.map(
                    (post) => post.id,
                ),
            ) + 1;

        console.log(
            "Mock 게시글 등록 요청",
            request,
        );

        return {
            boardId: nextBoardId,
        };
    }

    const response =
        await apiMiddleware.post<BoardCommandResponse>(
            "/api/boards",
            request,
        );

    return response.data;
}

/**
 * 일반 게시글을 수정한다.
 */
export async function updateBoardPostApi(
    boardId: number,
    request: BoardUpdateRequest,
): Promise<BoardCommandResponse> {
    if (isMockMode()) {
        console.log(
            "Mock 게시글 수정 요청",
            {
                boardId,
                ...request,
            },
        );

        return {
            boardId,
        };
    }

    const response =
        await apiMiddleware.put<BoardCommandResponse>(
            `/api/boards/${boardId}`,
            request,
        );

    return response.data;
}

/**
 * 일반 게시글을 삭제한다.
 *
 * 실제 삭제 권한은 반드시 백엔드에서 검사해야 한다.
 */
export async function deleteBoardPostApi(
    boardId: number,
): Promise<BoardDeleteResponse> {
    if (isMockMode()) {
        console.log(
            "Mock 게시글 삭제 요청",
            boardId,
        );

        return {
            boardId,
            deleted: true,
        };
    }

    const response =
        await apiMiddleware.delete<BoardDeleteResponse>(
            `/api/boards/${boardId}`,
        );

    return response.data;
}

/**
 * 게시글 종류가 공지사항인지 확인한다.
 */
export function isNoticePost(
    postType: BoardPostType,
): boolean {
    return postType === "NOTICE";
}