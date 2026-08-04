import {
    useEffect,
    useMemo,
    useState,
} from "react";

import type {
    FormEvent,
} from "react";

import {
    Link,
    useLocation,
    useSearchParams,
} from "react-router-dom";

import {
    MOCK_BOARD_POSTS,
} from "@/features/board/data/mockBoardPosts";

import type {
    BoardPost,
} from "@/features/board/data/mockBoardPosts";

import styles from "./BoardPage.module.css";

/**
 * 게시글 검색 종류이다.
 */
type BoardSearchType =
    | "title"
    | "author";

/**
 * 한 페이지에 표시할 일반 게시글 개수이다.
 *
 * 공지사항은 페이지 개수에 포함하지 않고
 * 모든 페이지의 위쪽에 고정하여 표시한다.
 */
const PAGE_SIZE = 5;

/**
 * URL에서 전달받은 검색 종류가 올바른 값인지 확인한다.
 *
 * @param value URL에서 가져온 검색 종류
 * @returns 올바른 검색 종류이면 true
 */
function isBoardSearchType(
    value: string | null,
): value is BoardSearchType {
    return (
        value === "title" ||
        value === "author"
    );
}

/**
 * URL에서 현재 페이지 번호를 가져온다.
 *
 * 페이지 번호가 없거나 올바르지 않은 경우
 * 첫 번째 페이지인 1을 반환한다.
 *
 * @param value URL에서 가져온 페이지 문자열
 * @returns 사용할 페이지 번호
 */
function parsePageNumber(
    value: string | null,
): number {
    const parsedPage = Number(value);

    if (
        !Number.isInteger(parsedPage) ||
        parsedPage < 1
    ) {
        return 1;
    }

    return parsedPage;
}

/**
 * 일반게시판 목록 페이지이다.
 *
 * 검색 조건과 페이지 번호를 URL Query Parameter에 저장한다.
 *
 * 예:
 *
 * /board?searchType=title&keyword=사과&page=2
 *
 * URL에 목록 상태를 저장하므로 새로고침하거나
 * 상세 화면에서 뒤로 가기를 실행해도 기존 검색 상태를 유지한다.
 */
function BoardPage() {
    const location = useLocation();

    /**
     * URL Query Parameter를 조회하고 변경한다.
     */
    const [
        searchParams,
        setSearchParams,
    ] = useSearchParams();

    /**
     * URL에 저장된 검색 종류를 가져온다.
     *
     * 잘못된 값이 들어온 경우 제목 검색을 기본값으로 사용한다.
     */
    const searchType: BoardSearchType =
        isBoardSearchType(
            searchParams.get(
                "searchType",
            ),
        )
            ? searchParams.get(
                "searchType",
            ) as BoardSearchType
            : "title";

    /**
     * URL에 저장된 검색어를 가져온다.
     */
    const keyword =
        searchParams.get("keyword")?.trim() ??
        "";

    /**
     * URL에 저장된 현재 페이지 번호를 가져온다.
     */
    const requestedPage =
        parsePageNumber(
            searchParams.get("page"),
        );

    /**
     * 검색 입력창에서 변경 중인 검색 종류이다.
     *
     * 사용자가 검색 버튼을 누르기 전까지는
     * URL Query Parameter를 바로 변경하지 않는다.
     */
    const [
        inputSearchType,
        setInputSearchType,
    ] = useState<BoardSearchType>(
        searchType,
    );

    /**
     * 검색 입력창에서 작성 중인 검색어이다.
     */
    const [
        inputKeyword,
        setInputKeyword,
    ] = useState(keyword);

    /**
     * 브라우저 뒤로 가기나 앞으로 가기로 URL이 변경되면
     * 검색 입력창도 현재 URL 상태에 맞게 변경한다.
     */
    useEffect(() => {
        setInputSearchType(searchType);
        setInputKeyword(keyword);
    }, [
        keyword,
        searchType,
    ]);

    /**
     * 현재 검색 조건에 맞는 게시글만 조회한다.
     */
    const filteredPosts =
        useMemo(() => {
            /*
             * 검색어가 없다면 전체 게시글을 반환한다.
             */
            if (!keyword) {
                return MOCK_BOARD_POSTS;
            }

            const normalizedKeyword =
                keyword.toLocaleLowerCase();

            return MOCK_BOARD_POSTS.filter(
                (post) => {
                    const targetValue =
                        searchType === "title"
                            ? post.title
                            : post.author;

                    return targetValue
                        .toLocaleLowerCase()
                        .includes(
                            normalizedKeyword,
                        );
                },
            );
        }, [
            keyword,
            searchType,
        ]);

    /**
     * 검색 결과 중 공지사항만 분리한다.
     *
     * 공지사항은 일반 게시글 페이지 번호와 관계없이
     * 게시판 목록 위쪽에 고정한다.
     */
    const noticePosts =
        useMemo(
            () =>
                filteredPosts.filter(
                    (post) =>
                        post.type === "NOTICE",
                ),
            [filteredPosts],
        );

    /**
     * 검색 결과 중 일반 게시글만 분리한다.
     */
    const freePosts =
        useMemo(
            () =>
                filteredPosts.filter(
                    (post) =>
                        post.type === "FREE",
                ),
            [filteredPosts],
        );

    /**
     * 일반 게시글 개수를 기준으로 전체 페이지 수를 계산한다.
     *
     * 게시글이 없는 경우에도 첫 번째 페이지를 표시하기 위해
     * 최소 페이지 수를 1로 지정한다.
     */
    const totalPages = Math.max(
        1,
        Math.ceil(
            freePosts.length /
            PAGE_SIZE,
        ),
    );

    /**
     * URL에 전체 페이지 수보다 큰 페이지 번호가 들어오면
     * 마지막 페이지를 사용한다.
     */
    const currentPage = Math.min(
        requestedPage,
        totalPages,
    );

    /**
     * 현재 페이지에 표시할 일반 게시글을 계산한다.
     */
    const pagedFreePosts =
        useMemo(() => {
            const startIndex =
                (currentPage - 1) *
                PAGE_SIZE;

            return freePosts.slice(
                startIndex,
                startIndex +
                PAGE_SIZE,
            );
        }, [
            currentPage,
            freePosts,
        ]);

    /**
     * 공지사항과 현재 페이지의 일반 게시글을 합친다.
     *
     * 공지사항을 먼저 배치하여 항상 목록 위쪽에 표시한다.
     */
    const visiblePosts =
        useMemo(
            () => [
                ...noticePosts,
                ...pagedFreePosts,
            ],
            [
                noticePosts,
                pagedFreePosts,
            ],
        );

    /**
     * 화면에 표시할 페이지 번호 배열을 생성한다.
     *
     * 현재는 전체 페이지 번호를 모두 표시한다.
     */
    const pageNumbers =
        useMemo(
            () =>
                Array.from(
                    {
                        length: totalPages,
                    },
                    (_, index) =>
                        index + 1,
                ),
            [totalPages],
        );

    /**
     * URL Query Parameter를 변경한다.
     *
     * 기본값인 경우에는 URL을 간결하게 유지하기 위해
     * 해당 Query Parameter를 추가하지 않는다.
     *
     * @param nextSearchType 적용할 검색 종류
     * @param nextKeyword 적용할 검색어
     * @param nextPage 이동할 페이지 번호
     */
    const updateSearchParams = (
        nextSearchType: BoardSearchType,
        nextKeyword: string,
        nextPage: number,
    ) => {
        const nextParams =
            new URLSearchParams();

        const trimmedKeyword =
            nextKeyword.trim();

        if (
            nextSearchType !== "title"
        ) {
            nextParams.set(
                "searchType",
                nextSearchType,
            );
        }

        if (trimmedKeyword) {
            nextParams.set(
                "keyword",
                trimmedKeyword,
            );
        }

        if (nextPage > 1) {
            nextParams.set(
                "page",
                String(nextPage),
            );
        }

        setSearchParams(nextParams);
    };

    /**
     * 검색 Form을 제출한다.
     *
     * 새로운 검색을 시작하면 첫 번째 페이지로 이동한다.
     */
    const handleSearch = (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        updateSearchParams(
            inputSearchType,
            inputKeyword,
            1,
        );
    };

    /**
     * 검색 조건과 페이지 번호를 모두 초기화한다.
     */
    const handleReset = () => {
        setInputSearchType("title");
        setInputKeyword("");

        setSearchParams(
            new URLSearchParams(),
        );
    };

    /**
     * 선택한 페이지로 이동한다.
     *
     * 현재 검색 종류와 검색어는 그대로 유지한다.
     *
     * @param page 이동할 페이지 번호
     */
    const handlePageChange = (
        page: number,
    ) => {
        if (
            page < 1 ||
            page > totalPages ||
            page === currentPage
        ) {
            return;
        }

        updateSearchParams(
            searchType,
            keyword,
            page,
        );
    };

    /**
     * 상세 화면에서 다시 목록으로 돌아올 때 사용할
     * 현재 목록 주소이다.
     *
     * 검색 조건과 페이지 번호가 모두 포함된다.
     */
    const currentListUrl =
        location.pathname +
        location.search;

    return (
        <main className={styles.boardPage}>
            <div className={styles.boardContainer}>
                {/* ================================================
            페이지 제목 영역
        ================================================= */}

                <header className={styles.pageHeader}>
                    <p className={styles.pagePath}>
                        고객센터
                        <span aria-hidden="true">
                            /
                        </span>
                        일반게시판
                    </p>

                    <h1 className={styles.pageTitle}>
                        일반게시판
                    </h1>

                    <p className={styles.pageDescription}>
                        농수산물 가격정보와 싸농 서비스에 관한 이야기를
                        자유롭게 나누는 공간입니다.
                    </p>
                </header>

                {/* ================================================
            게시판 이동 메뉴
        ================================================= */}

                <nav
                    className={styles.boardTabs}
                    aria-label="게시판 메뉴"
                >
                    <span
                        className={`${styles.tabItem} ${styles.activeTab}`}
                    >
                        일반게시판
                    </span>

                    <span className={styles.tabItem}>
                        Q&amp;A 게시판
                    </span>

                    <span className={styles.tabItem}>
                        자주 묻는 질문
                    </span>
                </nav>

                {/* ================================================
            게시글 검색 영역
        ================================================= */}

                <form
                    className={styles.searchSection}
                    onSubmit={handleSearch}
                >
                    <label
                        htmlFor="board-search-type"
                        className={styles.srOnly}
                    >
                        검색 조건
                    </label>

                    <select
                        id="board-search-type"
                        className={styles.searchSelect}
                        value={inputSearchType}
                        onChange={(event) => {
                            setInputSearchType(
                                event.target
                                    .value as BoardSearchType,
                            );
                        }}
                    >
                        <option value="title">
                            제목
                        </option>

                        <option value="author">
                            작성자
                        </option>
                    </select>

                    <label
                        htmlFor="board-search-keyword"
                        className={styles.srOnly}
                    >
                        검색어
                    </label>

                    <input
                        id="board-search-keyword"
                        type="search"
                        className={styles.searchInput}
                        value={inputKeyword}
                        onChange={(event) => {
                            setInputKeyword(
                                event.target.value,
                            );
                        }}
                        placeholder="검색어를 입력하세요."
                    />

                    <button
                        type="submit"
                        className={styles.searchButton}
                    >
                        검색
                    </button>

                    <button
                        type="button"
                        className={styles.resetButton}
                        onClick={handleReset}
                    >
                        초기화
                    </button>
                </form>

                {/* ================================================
            게시글 목록 영역
        ================================================= */}

                <section className={styles.listSection}>
                    <div className={styles.listInformation}>
                        <p>
                            검색 결과{" "}
                            <strong>
                                {filteredPosts.length}
                            </strong>
                            건
                        </p>

                        {/*
                        * 현재 검색 조건과 페이지 번호가 포함된 목록 주소를
                        * Router State로 전달한다.
                        *
                        * 글쓰기 화면에서 목록 버튼을 누르면
                        * 이전 게시판 상태로 돌아갈 수 있다.
                        */}
                        <Link
                            to="/board/write"
                            state={{
                                from: currentListUrl,
                            }}
                            className={styles.writeButton}
                        >
                            글쓰기
                        </Link>
                    </div>

                    <div className={styles.tableWrapper}>
                        <table className={styles.boardTable}>
                            <caption className={styles.srOnly}>
                                일반게시판 게시글 목록
                            </caption>

                            <colgroup>
                                <col className={styles.numberColumn} />
                                <col className={styles.typeColumn} />
                                <col className={styles.titleColumn} />
                                <col className={styles.authorColumn} />
                                <col className={styles.dateColumn} />
                                <col className={styles.viewColumn} />
                            </colgroup>

                            <thead>
                                <tr>
                                    <th scope="col">
                                        No
                                    </th>

                                    <th scope="col">
                                        구분
                                    </th>

                                    <th scope="col">
                                        제목
                                    </th>

                                    <th scope="col">
                                        작성자
                                    </th>

                                    <th scope="col">
                                        작성일
                                    </th>

                                    <th scope="col">
                                        조회수
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {visiblePosts.length >
                                    0 ? (
                                    visiblePosts.map(
                                        (
                                            post: BoardPost,
                                        ) => {
                                            const isNotice =
                                                post.type ===
                                                "NOTICE";

                                            return (
                                                <tr
                                                    key={post.id}
                                                    className={
                                                        isNotice
                                                            ? styles.noticeRow
                                                            : styles.freeRow
                                                    }
                                                >
                                                    <td>
                                                        {isNotice
                                                            ? "공지"
                                                            : post.id}
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={
                                                                isNotice
                                                                    ? styles.noticeBadge
                                                                    : styles.freeBadge
                                                            }
                                                        >
                                                            {isNotice
                                                                ? "공지"
                                                                : "일반"}
                                                        </span>
                                                    </td>

                                                    <td
                                                        className={
                                                            styles.titleCell
                                                        }
                                                    >
                                                        {/*
                             * 상세 화면으로 이동할 때 현재 목록 주소를
                             * Router State로 함께 전달한다.
                             */}
                                                        <Link
                                                            to={`/board/${post.id}`}
                                                            state={{
                                                                from:
                                                                    currentListUrl,
                                                            }}
                                                            className={
                                                                styles.postTitle
                                                            }
                                                            title={
                                                                post.title
                                                            }
                                                        >
                                                            {post.title}
                                                        </Link>
                                                    </td>

                                                    <td>
                                                        {post.author}
                                                    </td>

                                                    <td>
                                                        {
                                                            post.createdAt
                                                        }
                                                    </td>

                                                    <td>
                                                        {
                                                            post.viewCount
                                                        }
                                                    </td>
                                                </tr>
                                            );
                                        },
                                    )
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className={
                                                styles.emptyRow
                                            }
                                        >
                                            검색 결과가 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* ==============================================
              페이지 이동 영역
          =============================================== */}

                    <nav
                        className={styles.pagination}
                        aria-label="게시글 페이지 이동"
                    >
                        <button
                            type="button"
                            className={styles.pageArrow}
                            aria-label="이전 페이지"
                            disabled={
                                currentPage === 1
                            }
                            onClick={() =>
                                handlePageChange(
                                    currentPage - 1,
                                )
                            }
                        >
                            &lt;
                        </button>

                        {pageNumbers.map(
                            (pageNumber) => (
                                <button
                                    key={pageNumber}
                                    type="button"
                                    className={
                                        pageNumber ===
                                            currentPage
                                            ? `${styles.pageButton} ${styles.currentPage}`
                                            : styles.pageButton
                                    }
                                    aria-current={
                                        pageNumber ===
                                            currentPage
                                            ? "page"
                                            : undefined
                                    }
                                    onClick={() =>
                                        handlePageChange(
                                            pageNumber,
                                        )
                                    }
                                >
                                    {pageNumber}
                                </button>
                            ),
                        )}

                        <button
                            type="button"
                            className={styles.pageArrow}
                            aria-label="다음 페이지"
                            disabled={
                                currentPage ===
                                totalPages
                            }
                            onClick={() =>
                                handlePageChange(
                                    currentPage + 1,
                                )
                            }
                        >
                            &gt;
                        </button>
                    </nav>
                </section>
            </div>
        </main>
    );
}

export default BoardPage;