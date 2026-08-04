import {
    useEffect,
    useState,
} from "react";

import {
    Link,
    useLocation,
    useNavigate,
    useParams,
} from "react-router-dom";

import {
    getBoardPostApi,
} from "@/api/boardApi";

import type {
    BoardDetail,
} from "@/features/board/types/board.types";

import styles from "./BoardDetailPage.module.css";

/**
 * 게시판 목록에서 상세 화면으로 이동할 때
 * 전달하는 Router State이다.
 */
interface BoardDetailLocationState {
    /**
     * 검색어와 페이지 번호가 포함된
     * 기존 게시판 목록 주소이다.
     */
    from?: string;
}

/**
 * 게시글 상세 조회 페이지이다.
 *
 * Mock Data를 직접 조회하지 않고 boardApi를 사용한다.
 * 환경변수에 따라 Mock 또는 실제 백엔드 API가 선택된다.
 */
function BoardDetailPage() {
    const navigate = useNavigate();
    const location = useLocation();

    /**
     * URL에서 게시글 번호를 가져온다.
     *
     * 예:
     * /board/13
     */
    const { postId } = useParams<{
        postId: string;
    }>();

    const numericPostId =
        Number(postId);

    /**
     * 게시글 상세 API 응답이다.
     */
    const [
        post,
        setPost,
    ] =
        useState<BoardDetail | null>(
            null,
        );

    /**
     * 게시글 상세 조회 상태이다.
     */
    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState("");

    /**
     * 조회 실패 후 다시 시도할 때 사용하는 값이다.
     */
    const [
        reloadKey,
        setReloadKey,
    ] = useState(0);

    /**
     * 목록에서 전달한 기존 목록 주소를 가져온다.
     */
    const locationState =
        location.state as BoardDetailLocationState | null;

    const listUrl =
        locationState?.from ?? "/board";
    /**
 * URL의 게시글 번호가 변경되면
 * 게시글 상세 API를 호출한다.
 */
    useEffect(() => {
        let isCurrentRequest = true;

        const loadBoardPost =
            async () => {
                /*
                 * 게시글 번호가 올바르지 않다면
                 * API를 호출하지 않는다.
                 */
                if (
                    !Number.isInteger(
                        numericPostId,
                    ) ||
                    numericPostId < 1
                ) {
                    setPost(null);

                    setErrorMessage(
                        "올바르지 않은 게시글 번호입니다.",
                    );

                    setIsLoading(false);

                    return;
                }

                setIsLoading(true);
                setErrorMessage("");

                try {
                    const response =
                        await getBoardPostApi(
                            numericPostId,
                        );

                    /*
                     * 상세 화면이 사라진 뒤 완료된 이전 요청은
                     * 현재 상태에 반영하지 않는다.
                     */
                    if (!isCurrentRequest) {
                        return;
                    }

                    setPost(response);
                } catch (error) {
                    if (!isCurrentRequest) {
                        return;
                    }

                    console.error(
                        "게시글 상세 조회 오류",
                        error,
                    );

                    setPost(null);

                    setErrorMessage(
                        "게시글을 불러오지 못했습니다.",
                    );
                } finally {
                    if (isCurrentRequest) {
                        setIsLoading(false);
                    }
                }
            };

        void loadBoardPost();

        /*
         * 다른 게시글로 이동하거나 화면이 사라지면
         * 이전 API 응답의 상태 반영을 중단한다.
         */
        return () => {
            isCurrentRequest = false;
        };
    }, [
        numericPostId,
        reloadKey,
    ]);

    /**
     * 기존 검색 조건과 페이지 번호가 포함된
     * 게시판 목록으로 이동한다.
     */
    const handleBackToList = () => {
        navigate(listUrl);
    };

    /**
     * 게시글을 불러오는 동안 표시하는 화면이다.
     */
    if (isLoading) {
        return (
            <main
                className={
                    styles.detailPage
                }
            >
                <section
                    className={
                        styles.notFound
                    }
                >
                    <p
                        className={
                            styles.notFoundDescription
                        }
                    >
                        게시글을 불러오는 중입니다.
                    </p>
                </section>
            </main>
        );
    }

    /**
     * 조회 실패 또는 존재하지 않는 게시글 안내 화면이다.
     */
    if (
        errorMessage ||
        !post
    ) {
        return (
            <main
                className={
                    styles.detailPage
                }
            >
                <section
                    className={
                        styles.notFound
                    }
                >
                    <p
                        className={
                            styles.notFoundCode
                        }
                    >
                        안내
                    </p>

                    <h1
                        className={
                            styles.notFoundTitle
                        }
                    >
                        게시글을 확인할 수 없습니다.
                    </h1>

                    <p
                        className={
                            styles.notFoundDescription
                        }
                    >
                        {errorMessage ||
                            "삭제되었거나 존재하지 않는 게시글입니다."}
                    </p>

                    <div
                        className={
                            styles.ownerButtons
                        }
                    >
                        <button
                            type="button"
                            className={
                                styles.listButton
                            }
                            onClick={
                                handleBackToList
                            }
                        >
                            게시판 목록
                        </button>

                        <button
                            type="button"
                            className={
                                styles.editButton
                            }
                            onClick={() => {
                                setReloadKey(
                                    (
                                        previous,
                                    ) =>
                                        previous + 1,
                                );
                            }}
                        >
                            다시 시도
                        </button>
                    </div>
                </section>
            </main>
        );
    }
    /**
   * 공지사항 여부를 확인한다.
   */
    const isNotice =
        post.type === "NOTICE";

    return (
        <main
            className={
                styles.detailPage
            }
        >
            <div
                className={
                    styles.detailContainer
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
                        게시글 조회
                    </h1>

                    <p
                        className={
                            styles.pageDescription
                        }
                    >
                        게시글의 제목과 내용을 확인할 수 있습니다.
                    </p>
                </header>

                {/* 게시글 상세 내용 */}

                <article
                    className={
                        styles.article
                    }
                >
                    {/* 게시글 구분과 제목 */}

                    <div
                        className={
                            styles.titleArea
                        }
                    >
                        <span
                            className={
                                isNotice
                                    ? styles.noticeBadge
                                    : styles.freeBadge
                            }
                        >
                            {isNotice
                                ? "공지사항"
                                : "일반게시글"}
                        </span>

                        <h2
                            className={
                                styles.postTitle
                            }
                        >
                            {post.title}
                        </h2>
                    </div>

                    {/* 작성자, 작성일, 조회수 */}

                    <dl
                        className={
                            styles.metadata
                        }
                    >
                        <div
                            className={
                                styles.metadataItem
                            }
                        >
                            <dt>작성자</dt>

                            <dd>
                                {post.authorName}
                            </dd>
                        </div>

                        <div
                            className={
                                styles.metadataItem
                            }
                        >
                            <dt>작성일</dt>

                            <dd>
                                {post.createdAt}
                            </dd>
                        </div>

                        <div
                            className={
                                styles.metadataItem
                            }
                        >
                            <dt>조회수</dt>

                            <dd>
                                {post.viewCount}
                            </dd>
                        </div>
                    </dl>

                    {/*
           * 백엔드가 전달한 본문의 줄바꿈은
           * CSS의 white-space: pre-wrap으로 표시한다.
           */}
                    <div
                        className={
                            styles.content
                        }
                    >
                        {post.content}
                    </div>

                    {/* 첨부파일 */}

                    <section
                        className={
                            styles.attachmentSection
                        }
                    >
                        <h3
                            className={
                                styles.attachmentTitle
                            }
                        >
                            첨부파일
                        </h3>

                        {post.attachments.length >
                            0 ? (
                            post.attachments.map(
                                (attachment) => (
                                    <div
                                        key={
                                            attachment.attachmentId
                                        }
                                        className={
                                            styles.attachmentItem
                                        }
                                    >
                                        <span
                                            className={
                                                styles.fileIcon
                                            }
                                            aria-hidden="true"
                                        >
                                            📎
                                        </span>

                                        <span
                                            className={
                                                styles.fileName
                                            }
                                        >
                                            {
                                                attachment.fileName
                                            }
                                        </span>

                                        {/*
                     * 실제 다운로드는 백엔드와 MinIO가
                     * 연결된 후 boardApi를 통해 처리한다.
                     */}
                                        <span
                                            className={
                                                styles.fileGuide
                                            }
                                        >
                                            다운로드 준비 중
                                        </span>
                                    </div>
                                ),
                            )
                        ) : (
                            <p
                                className={
                                    styles.emptyAttachment
                                }
                            >
                                첨부파일이 없습니다.
                            </p>
                        )}
                    </section>
                </article>
                {/* 게시글 하단 버튼 */}

                <div
                    className={
                        styles.buttonArea
                    }
                >
                    <button
                        type="button"
                        className={
                            styles.listButton
                        }
                        onClick={
                            handleBackToList
                        }
                    >
                        목록
                    </button>

                    {/*
           * 공지사항은 관리자 기능에서 관리하므로
           * 일반 게시글에만 수정·삭제 버튼을 표시한다.
           *
           * 실제 작성자 권한 검사는
           * 백엔드 연동 후 적용한다.
           */}
                    {!isNotice && (
                        <div
                            className={
                                styles.ownerButtons
                            }
                        >
                            <Link
                                to={`/board/${post.boardId}/edit`}
                                state={{
                                    from: listUrl,
                                }}
                                className={
                                    styles.editButton
                                }
                            >
                                수정
                            </Link>

                            {/*
               * 실제 삭제 API 연결은
               * BoardEditPage에서 처리할 예정이다.
               */}
                            <button
                                type="button"
                                className={
                                    styles.deleteButton
                                }
                                onClick={() => {
                                    alert(
                                        "삭제 기능은 백엔드 연동 후 적용됩니다.",
                                    );
                                }}
                            >
                                삭제
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

export default BoardDetailPage;