import {
    useEffect,
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
    getBoardPostsApi,
} from "@/api/boardApi";

import type {
    BoardPageResponse,
    BoardSearchType,
} from "@/features/board/types/board.types";

import styles from "./BoardPage.module.css";

/**
 * 한 페이지에 표시할 일반 게시글 개수이다.
 * 공지사항은 페이지 개수에 포함하지 않는다.
 */
const PAGE_SIZE = 5;

/**
 * URL에서 가져온 검색 종류가
 * 정상적인 값인지 확인한다.
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
 * URL의 페이지 값을 숫자로 변환한다.
 * 잘못된 값이면 1페이지를 사용한다.
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
 * 백엔드 날짜를 화면에 표시할 형식으로 변환한다.
 */
function formatBoardDate(
    createdAt: string,
): string {
    const date = new Date(createdAt);

    if (Number.isNaN(date.getTime())) {
        return createdAt;
    }

    return new Intl.DateTimeFormat(
        "ko-KR",
        {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        },
    ).format(date);
}
/**
 * 일반게시판 목록 페이지이다.
 *
 * Mock Data를 직접 사용하지 않고 boardApi를 호출한다.
 * 환경변수에 따라 Mock 또는 실제 백엔드 API가 선택된다.
 */
function BoardPage() {
    const location = useLocation();

    const [
        searchParams,
        setSearchParams,
    ] = useSearchParams();

    /**
     * URL에 저장된 검색 종류를 가져온다.
     */
    const searchTypeValue =
        searchParams.get(
            "searchType",
        );

    const searchType: BoardSearchType =
        isBoardSearchType(
            searchTypeValue,
        )
            ? searchTypeValue
            : "title";

    /**
     * URL에 저장된 검색어와 페이지를 가져온다.
     */
    const keyword =
        searchParams
            .get("keyword")
            ?.trim() ?? "";

    const requestedPage =
        parsePageNumber(
            searchParams.get("page"),
        );

    /**
     * 검색 입력창에서 작성 중인 값이다.
     */
    const [
        inputSearchType,
        setInputSearchType,
    ] = useState<BoardSearchType>(
        searchType,
    );

    const [
        inputKeyword,
        setInputKeyword,
    ] = useState(keyword);

    /**
     * 게시판 API 응답과 화면 상태이다.
     */
    const [
        boardPage,
        setBoardPage,
    ] =
        useState<BoardPageResponse | null>(
            null,
        );

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState("");

    /**
     * 다시 시도 버튼을 눌렀을 때
     * API를 재호출하기 위한 값이다.
     */
    const [
        reloadKey,
        setReloadKey,
    ] = useState(0);

    /**
     * 뒤로 가기 등으로 URL이 변경되면
     * 검색 입력창도 현재 URL에 맞게 변경한다.
     */
    useEffect(() => {
        setInputSearchType(
            searchType,
        );

        setInputKeyword(
            keyword,
        );
    }, [
        keyword,
        searchType,
    ]);
    /**
   * 검색 조건이나 페이지 번호가 변경되면
   * 게시글 목록 API를 다시 호출한다.
   */
    useEffect(() => {
        let isCurrentRequest = true;

        const loadBoardPosts =
            async () => {
                setIsLoading(true);
                setErrorMessage("");

                try {
                    const response =
                        await getBoardPostsApi({
                            searchType,
                            keyword,
                            page: requestedPage,
                            size: PAGE_SIZE,
                        });

                    /*
                     * 화면이 이동된 후 완료된 이전 요청은
                     * 현재 화면 상태에 반영하지 않는다.
                     */
                    if (!isCurrentRequest) {
                        return;
                    }

                    setBoardPage(response);
                } catch (error) {
                    if (!isCurrentRequest) {
                        return;
                    }

                    console.error(
                        "게시글 목록 조회 오류",
                        error,
                    );

                    setBoardPage(null);

                    setErrorMessage(
                        "게시글 목록을 불러오지 못했습니다.",
                    );
                } finally {
                    if (isCurrentRequest) {
                        setIsLoading(false);
                    }
                }
            };

        void loadBoardPosts();

        /*
         * 검색 조건이 변경되거나 화면이 사라지면
         * 이전 요청의 상태 반영을 중단한다.
         */
        return () => {
            isCurrentRequest = false;
        };
    }, [
        keyword,
        reloadKey,
        requestedPage,
        searchType,
    ]);

    /**
     * 검색 조건과 페이지를 URL Query Parameter에 저장한다.
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

        /*
         * 기본 검색 종류인 title은 URL에서 생략한다.
         */
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

        /*
         * 첫 번째 페이지는 URL에서 생략한다.
         */
        if (nextPage > 1) {
            nextParams.set(
                "page",
                String(nextPage),
            );
        }

        setSearchParams(nextParams);
    };

    /**
     * 검색 버튼을 누르면 첫 번째 페이지부터 검색한다.
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
   * 검색 조건과 페이지 번호를 초기화한다.
   */
    const handleReset = () => {
        setInputSearchType(
            "title",
        );

        setInputKeyword("");

        setSearchParams(
            new URLSearchParams(),
        );
    };

    /**
     * 현재 검색 조건을 유지하면서
     * 선택한 페이지로 이동한다.
     */
    const handlePageChange = (
        page: number,
    ) => {
        const totalPages =
            boardPage?.totalPages ?? 1;

        const currentPage =
            boardPage?.page ??
            requestedPage;

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
     * API 응답에서 현재 화면에 사용할 값을 가져온다.
     */
    const currentPage =
        boardPage?.page ??
        requestedPage;

    const totalPages =
        boardPage?.totalPages ?? 1;

    const notices =
        boardPage?.notices ?? [];

    const items =
        boardPage?.items ?? [];

    /**
     * 공지사항을 일반 게시글보다 먼저 배치한다.
     */
    const visiblePosts = [
        ...notices,
        ...items,
    ];

    /**
     * 공지사항과 일반 게시글을 포함한
     * 현재 검색 결과 개수이다.
     */
    const totalResultCount =
        (boardPage?.totalElements ??
            0) + notices.length;

    /**
     * 전체 페이지 번호 배열을 생성한다.
     */
    const pageNumbers =
        Array.from(
            {
                length: totalPages,
            },
            (_, index) =>
                index + 1,
        );

    /**
     * 상세·글쓰기 화면에서 목록으로 돌아올 때 사용할
     * 검색 조건과 페이지가 포함된 현재 주소이다.
     */
    const currentListUrl =
        location.pathname +
        location.search;

    return (
        <main
            className={
                styles.boardPage
            }
        >
            <div
                className={
                    styles.boardContainer
                }
            >
                {/* 페이지 제목 */}

                <header
                    className={
                        styles.pageHeader
                    }
                >
                    <p
                        className={
                            styles.pagePath
                        }
                    >
                        고객센터
                        <span aria-hidden="true">
                            /
                        </span>
                        일반게시판
                    </p>

                    <h1
                        className={
                            styles.pageTitle
                        }
                    >
                        일반게시판
                    </h1>

                    <p
                        className={
                            styles.pageDescription
                        }
                    >
                        농수산물 가격정보와 싸농 서비스에 관한 이야기를
                        자유롭게 나누는 공간입니다.
                    </p>
                </header>

                {/* 게시판 이동 탭 */}

                <nav
                    className={
                        styles.boardTabs
                    }
                    aria-label="게시판 메뉴"
                >
                    <span
                        className={`${styles.tabItem} ${styles.activeTab}`}
                    >
                        일반게시판
                    </span>

                    <span
                        className={
                            styles.tabItem
                        }
                    >
                        Q&amp;A 게시판
                    </span>

                    <span
                        className={
                            styles.tabItem
                        }
                    >
                        자주 묻는 질문
                    </span>
                </nav>
                {/* 게시글 검색 Form */}

                <form
                    className={
                        styles.searchSection
                    }
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
                        className={
                            styles.searchSelect
                        }
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
                        className={
                            styles.searchInput
                        }
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
                        className={
                            styles.searchButton
                        }
                    >
                        검색
                    </button>

                    <button
                        type="button"
                        className={
                            styles.resetButton
                        }
                        onClick={handleReset}
                    >
                        초기화
                    </button>
                </form>

                {/* 게시글 목록 */}

                <section
                    className={
                        styles.listSection
                    }
                >
                    <div
                        className={
                            styles.listInformation
                        }
                    >
                        <p>
                            검색 결과{" "}
                            <strong>
                                {totalResultCount}
                            </strong>
                            건
                        </p>

                        <Link
                            to="/board/write"
                            state={{
                                from:
                                    currentListUrl,
                            }}
                            className={
                                styles.writeButton
                            }
                        >
                            글쓰기
                        </Link>
                    </div>

                    <div
                        className={
                            styles.tableWrapper
                        }
                    >
                        <table
                            className={
                                styles.boardTable
                            }
                        >
                            <caption
                                className={
                                    styles.srOnly
                                }
                            >
                                일반게시판 게시글 목록
                            </caption>

                            <colgroup>
                                <col
                                    className={
                                        styles.numberColumn
                                    }
                                />

                                <col
                                    className={
                                        styles.typeColumn
                                    }
                                />

                                <col
                                    className={
                                        styles.titleColumn
                                    }
                                />

                                <col
                                    className={
                                        styles.authorColumn
                                    }
                                />

                                <col
                                    className={
                                        styles.dateColumn
                                    }
                                />

                                <col
                                    className={
                                        styles.viewColumn
                                    }
                                />
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
                                {/* 게시글 로딩 상태 */}

                                {isLoading && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className={
                                                styles.emptyRow
                                            }
                                        >
                                            게시글을 불러오는 중입니다.
                                        </td>
                                    </tr>
                                )}

                                {/* 게시글 조회 실패 */}

                                {!isLoading &&
                                    errorMessage && (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className={
                                                    styles.emptyRow
                                                }
                                            >
                                                <p>
                                                    {errorMessage}
                                                </p>

                                                <button
                                                    type="button"
                                                    className={
                                                        styles.resetButton
                                                    }
                                                    onClick={() => {
                                                        setReloadKey(
                                                            (
                                                                previous,
                                                            ) =>
                                                                previous +
                                                                1,
                                                        );
                                                    }}
                                                >
                                                    다시 시도
                                                </button>
                                            </td>
                                        </tr>
                                    )}
                                {/* 검색 결과 없음 */}

                                {!isLoading &&
                                    !errorMessage &&
                                    visiblePosts.length ===
                                    0 && (
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

                                {/* 게시글 목록 출력 */}

                                {!isLoading &&
                                    !errorMessage &&
                                    visiblePosts.map(
                                        (post) => {
                                            const isNotice =
                                                post.type ===
                                                "NOTICE";

                                            return (
                                                <tr
                                                    key={
                                                        post.boardId
                                                    }
                                                    className={
                                                        isNotice
                                                            ? styles.noticeRow
                                                            : styles.freeRow
                                                    }
                                                >
                                                    <td>
                                                        {isNotice
                                                            ? "공지"
                                                            : post.boardId}
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
                                                        <Link
                                                            to={`/board/${post.boardId}`}
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
                                                        {
                                                            post.authorName
                                                        }
                                                    </td>

                                                    <td>
                                                        {formatBoardDate(
                                                            post.createdAt,
                                                        )}
                                                    </td>

                                                    <td>
                                                        {
                                                            post.viewCount
                                                        }
                                                    </td>
                                                </tr>
                                            );
                                        },
                                    )}
                            </tbody>
                        </table>
                    </div>

                    {/* 페이지 이동 */}

                    {!isLoading &&
                        !errorMessage && (
                            <nav
                                className={
                                    styles.pagination
                                }
                                aria-label="게시글 페이지 이동"
                            >
                                <button
                                    type="button"
                                    className={
                                        styles.pageArrow
                                    }
                                    aria-label="이전 페이지"
                                    disabled={
                                        currentPage === 1
                                    }
                                    onClick={() => {
                                        handlePageChange(
                                            currentPage - 1,
                                        );
                                    }}
                                >
                                    &lt;
                                </button>

                                {pageNumbers.map(
                                    (pageNumber) => (
                                        <button
                                            key={
                                                pageNumber
                                            }
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
                                            onClick={() => {
                                                handlePageChange(
                                                    pageNumber,
                                                );
                                            }}
                                        >
                                            {pageNumber}
                                        </button>
                                    ),
                                )}

                                <button
                                    type="button"
                                    className={
                                        styles.pageArrow
                                    }
                                    aria-label="다음 페이지"
                                    disabled={
                                        currentPage ===
                                        totalPages
                                    }
                                    onClick={() => {
                                        handlePageChange(
                                            currentPage + 1,
                                        );
                                    }}
                                >
                                    &gt;
                                </button>
                            </nav>
                        )}
                </section>
            </div>
        </main>
    );
}

export default BoardPage;