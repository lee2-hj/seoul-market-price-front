import apiMiddleware from "./middleware";

import {
    findMockBoardPost,
    MOCK_BOARD_POSTS,
} from "@/features/board/data/mockBoardPosts";

import type {
    BoardCommandResponse,
    BoardCreateRequest,
    BoardDeleteResponse,
    BoardDetail,
    BoardListItem,
    BoardListRequest,
    BoardPageResponse,
    BoardUpdateRequest,
} from "@/features/board/types/board.types";

/**
 * 게시판 API 실행 모드이다.
 *
 * VITE_BOARD_API_MODE가 real이면 실제 백엔드 API를 호출하고,
 * 그 외에는 프론트 Mock 데이터를 사용한다.
 */
const BOARD_API_MODE =
    import.meta.env
        .VITE_BOARD_API_MODE;

/**
 * 실제 Spring Boot 게시판 API를 사용할지 확인한다.
 */
const USE_REAL_API =
    BOARD_API_MODE === "real";

/**
 * Mock API 응답 지연시간이다.
 *
 * Mock API도 실제 네트워크 요청처럼 비동기로 동작하게 하여
 * 나중에 실제 API로 변경해도 페이지 코드를 유지할 수 있다.
 */
const MOCK_DELAY = 200;

/**
 * Spring Boot 게시판 목록 응답을 가정한 내부 타입이다.
 *
 * 실제 백엔드 DTO가 확정된 후 응답 구조가 다르다면
 * 이 타입과 변환 함수만 수정하면 된다.
 */
interface BackendBoardPageResponse {
    /**
     * 현재 페이지의 일반 게시글 목록
     */
    content: BoardListItem[];

    /**
     * 목록 위쪽에 고정할 공지사항 목록
     */
    notices: BoardListItem[];

    /**
     * 검색 조건에 해당하는 일반 게시글 전체 개수
     */
    totalElements: number;

    /**
     * 전체 페이지 개수
     */
    totalPages: number;

    /**
     * 백엔드 기준 현재 페이지 번호
     *
     * Spring Pageable은 0부터 시작한다.
     */
    number: number;

    /**
     * 한 페이지에 표시할 게시글 개수
     */
    size: number;
}

/**
 * 지정한 시간 후 Mock 값을 반환한다.
 *
 * @param value 반환할 Mock 값
 * @returns Promise로 감싼 Mock 값
 */
function resolveMock<T>(
    value: T,
): Promise<T> {
    return new Promise((resolve) => {
        window.setTimeout(() => {
            resolve(value);
        }, MOCK_DELAY);
    });
}

/**
 * 기존 Mock 게시글을 목록 응답 타입으로 변환한다.
 */
function convertMockToListItem(
    post: (typeof MOCK_BOARD_POSTS)[number],
): BoardListItem {
    return {
        boardId: post.id,
        type: post.type,
        title: post.title,
        authorName: post.author,
        createdAt: post.createdAt,
        viewCount: post.viewCount,
    };
}

/**
 * 기존 Mock 게시글을 상세 응답 타입으로 변환한다.
 */
function convertMockToDetail(
    post: (typeof MOCK_BOARD_POSTS)[number],
): BoardDetail {
    return {
        boardId: post.id,
        type: post.type,
        title: post.title,
        content: post.content,

        /*
         * 현재 Mock Data에는 작성자의 회원 PK가 없으므로
         * 임시로 null을 사용한다.
         */
        authorId: null,

        authorName: post.author,
        createdAt: post.createdAt,
        updatedAt: null,
        viewCount: post.viewCount,

        /*
         * Mock Data에 첨부파일 이름이 있을 때만
         * 화면 확인용 첨부파일 응답을 생성한다.
         */
        attachments: post.attachmentName
            ? [
                {
                    attachmentId:
                        post.id * 100,

                    fileName:
                        post.attachmentName,

                    /*
                     * 현재 Mock Data에는 파일 크기가 없으므로
                     * 임시로 0을 사용한다.
                     */
                    fileSize: 0,

                    downloadUrl:
                        `/api/boards/${post.id}/attachments/download`,
                },
            ]
            : [],
    };
}
/**
 * 검색 조건에 맞는 Mock 게시글인지 확인한다.
 *
 * @param post 검사할 Mock 게시글
 * @param request 목록 조회 조건
 * @returns 검색 조건에 해당하면 true
 */
function matchesMockSearch(
    post: (typeof MOCK_BOARD_POSTS)[number],
    request: BoardListRequest,
): boolean {
    const keyword =
        request.keyword
            .trim()
            .toLocaleLowerCase();

    /*
     * 검색어가 없으면 모든 게시글을 검색 결과에 포함한다.
     */
    if (!keyword) {
        return true;
    }

    /*
     * 검색 종류에 따라 제목 또는 작성자를 비교한다.
     */
    const targetValue =
        request.searchType === "title"
            ? post.title
            : post.author;

    return targetValue
        .toLocaleLowerCase()
        .includes(keyword);
}

/**
 * 실제 Spring Boot 목록 응답을
 * 프론트 공통 페이징 응답으로 변환한다.
 *
 * Spring Pageable은 페이지 번호가 0부터 시작하지만
 * 프론트 화면은 1부터 시작하므로 1을 더한다.
 */
function convertBackendPage(
    response: BackendBoardPageResponse,
): BoardPageResponse {
    return {
        items: response.content,

        /*
         * 백엔드 응답에 공지사항이 없다면
         * 빈 배열을 사용한다.
         */
        notices:
            response.notices ?? [],

        totalElements:
            response.totalElements,

        totalPages: Math.max(
            1,
            response.totalPages,
        ),

        page: response.number + 1,

        size: response.size,
    };
}

/**
 * 게시글 목록을 조회한다.
 *
 * Mock 모드에서는 프론트 Mock 데이터를 검색·페이징하고,
 * Real 모드에서는 Spring Boot API를 호출한다.
 */
export async function getBoardPostsApi(
    request: BoardListRequest,
): Promise<BoardPageResponse> {
    /*
     * 실제 백엔드 API 모드
     */
    if (USE_REAL_API) {
        const response =
            await apiMiddleware.get<BackendBoardPageResponse>(
                "/api/boards",
                {
                    params: {
                        searchType:
                            request.searchType,

                        /*
                         * 검색어가 비어 있다면 Query Parameter에서 제외한다.
                         */
                        keyword:
                            request.keyword.trim() ||
                            undefined,

                        /*
                         * 프론트 페이지 번호는 1부터 시작하고
                         * Spring Pageable은 0부터 시작한다.
                         */
                        page: Math.max(
                            0,
                            request.page - 1,
                        ),

                        size: request.size,
                    },
                },
            );

        return convertBackendPage(
            response.data,
        );
    }

    /*
     * 현재 검색 조건에 해당하는 Mock 게시글을 조회한다.
     */
    const filteredPosts =
        MOCK_BOARD_POSTS.filter(
            (post) =>
                matchesMockSearch(
                    post,
                    request,
                ),
        );

    /*
     * 공지사항은 일반 게시글과 분리한다.
     *
     * 공지사항은 페이지 번호와 관계없이
     * 목록 위쪽에 표시할 예정이다.
     */
    const notices =
        filteredPosts
            .filter(
                (post) =>
                    post.type === "NOTICE",
            )
            .map(
                convertMockToListItem,
            );

    /*
     * 일반 게시글만 페이징 대상에 포함한다.
     */
    const freePosts =
        filteredPosts.filter(
            (post) =>
                post.type === "FREE",
        );

    /*
     * size가 0 이하로 들어오는 잘못된 요청을 방지한다.
     */
    const safeSize = Math.max(
        1,
        request.size,
    );

    const totalPages = Math.max(
        1,
        Math.ceil(
            freePosts.length /
            safeSize,
        ),
    );

    /*
     * 요청한 페이지가 범위를 벗어나면
     * 첫 페이지 또는 마지막 페이지로 보정한다.
     */
    const safePage = Math.min(
        Math.max(
            1,
            request.page,
        ),
        totalPages,
    );

    const startIndex =
        (safePage - 1) *
        safeSize;

    /*
     * 현재 페이지에 표시할 일반 게시글만 잘라낸다.
     */
    const items =
        freePosts
            .slice(
                startIndex,
                startIndex +
                safeSize,
            )
            .map(
                convertMockToListItem,
            );

    return resolveMock({
        items,
        notices,
        totalElements:
            freePosts.length,
        totalPages,
        page: safePage,
        size: safeSize,
    });
}

/**
 * 게시글 상세 내용을 조회한다.
 *
 * Real 모드:
 * GET /api/boards/{boardId}
 */
export async function getBoardPostApi(
    boardId: number,
): Promise<BoardDetail> {
    if (USE_REAL_API) {
        const response =
            await apiMiddleware.get<BoardDetail>(
                `/api/boards/${boardId}`,
            );

        return response.data;
    }

    const mockPost =
        findMockBoardPost(boardId);

    if (!mockPost) {
        throw new Error(
            "게시글을 찾을 수 없습니다.",
        );
    }

    return resolveMock(
        convertMockToDetail(
            mockPost,
        ),
    );
}
/**
 * 일반 게시글을 등록한다.
 *
 * Real 모드:
 * POST /api/boards
 *
 * 작성자는 프론트 요청값을 사용하지 않고
 * Access Token의 인증 정보를 기준으로 백엔드에서 결정한다.
 */
export async function createBoardPostApi(
    request: BoardCreateRequest,
): Promise<BoardCommandResponse> {
    if (USE_REAL_API) {
        const response =
            await apiMiddleware.post<BoardCommandResponse>(
                "/api/boards",
                request,
            );

        return response.data;
    }

    /*
     * Mock 모드에서는 게시글을 실제로 저장하지 않는다.
     *
     * 등록 후 상세 화면으로 이동하는 흐름을 확인할 수 있도록
     * 다음 게시글 번호만 계산하여 반환한다.
     */
    const nextBoardId =
        MOCK_BOARD_POSTS.length === 0
            ? 1
            : Math.max(
                ...MOCK_BOARD_POSTS.map(
                    (post) => post.id,
                ),
            ) + 1;

    /*
     * request가 사용되지 않는다는 TypeScript 오류를 방지하면서
     * 제목과 본문도 간단히 검증한다.
     */
    if (
        !request.title.trim() ||
        !request.content.trim()
    ) {
        throw new Error(
            "제목과 내용을 입력해 주세요.",
        );
    }

    return resolveMock({
        boardId: nextBoardId,
    });
}

/**
 * 일반 게시글을 수정한다.
 *
 * Real 모드:
 * PUT /api/boards/{boardId}
 */
export async function updateBoardPostApi(
    boardId: number,
    request: BoardUpdateRequest,
): Promise<BoardCommandResponse> {
    if (USE_REAL_API) {
        const response =
            await apiMiddleware.put<BoardCommandResponse>(
                `/api/boards/${boardId}`,
                request,
            );

        return response.data;
    }

    const mockPost =
        findMockBoardPost(boardId);

    /*
     * 존재하지 않는 게시글과 공지사항은
     * 일반 사용자 수정 대상으로 처리하지 않는다.
     */
    if (
        !mockPost ||
        mockPost.type !== "FREE"
    ) {
        throw new Error(
            "수정할 수 없는 게시글입니다.",
        );
    }

    if (
        !request.title.trim() ||
        !request.content.trim()
    ) {
        throw new Error(
            "제목과 내용을 입력해 주세요.",
        );
    }

    /*
     * Mock 모드에서는 실제 데이터를 변경하지 않고
     * 수정된 게시글 번호만 반환한다.
     */
    return resolveMock({
        boardId,
    });
}

/**
 * 일반 게시글을 삭제한다.
 *
 * Real 모드:
 * DELETE /api/boards/{boardId}
 */
export async function deleteBoardPostApi(
    boardId: number,
): Promise<BoardDeleteResponse> {
    if (USE_REAL_API) {
        /*
         * 백엔드가 204 No Content를 반환하는 구조를 가정한다.
         */
        await apiMiddleware.delete(
            `/api/boards/${boardId}`,
        );

        return {
            boardId,
            deleted: true,
        };
    }

    const mockPost =
        findMockBoardPost(boardId);

    /*
     * 존재하지 않는 게시글과 공지사항은
     * 일반 사용자 삭제 대상으로 처리하지 않는다.
     */
    if (
        !mockPost ||
        mockPost.type !== "FREE"
    ) {
        throw new Error(
            "삭제할 수 없는 게시글입니다.",
        );
    }

    /*
     * Mock 모드에서는 실제 데이터를 삭제하지 않고
     * 삭제 성공 형태의 응답만 반환한다.
     */
    return resolveMock({
        boardId,
        deleted: true,
    });
}