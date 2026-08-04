import {
    useEffect,
    useState,
} from "react";

import type {
    ChangeEvent,
    FormEvent,
} from "react";

import {
    useLocation,
    useNavigate,
    useParams,
} from "react-router-dom";

import {
    deleteBoardPostApi,
    getBoardPostApi,
    updateBoardPostApi,
} from "@/api/boardApi";

import type {
    BoardDetail,
} from "@/features/board/types/board.types";

import styles from "./BoardEditPage.module.css";

/**
 * 게시글 제목 최대 길이이다.
 */
const MAX_TITLE_LENGTH = 20;

/**
 * 게시글 본문 최대 길이이다.
 */
const MAX_CONTENT_LENGTH = 5000;

/**
 * 게시글 수정 중 임시 저장할 값이다.
 */
interface BoardEditDraft {
    title: string;
    content: string;
}

/**
 * 상세 화면에서 수정 화면으로 이동할 때
 * 전달받는 Router State이다.
 */
interface BoardEditLocationState {
    /**
     * 검색 조건과 페이지 번호가 포함된
     * 기존 게시판 목록 주소이다.
     */
    from?: string;
}

/**
 * 게시글 번호별 수정 임시저장 Key를 생성한다.
 */
function createEditDraftKey(
    boardId: number,
): string {
    return `boardEditDraft:${boardId}`;
}

/**
 * sessionStorage에 저장된 수정 내용을 가져온다.
 *
 * 저장된 내용이 없다면 API로 조회한
 * 기존 게시글 제목과 본문을 사용한다.
 */
function loadBoardEditDraft(
    boardId: number,
    initialTitle: string,
    initialContent: string,
): BoardEditDraft {
    const savedDraft =
        sessionStorage.getItem(
            createEditDraftKey(
                boardId,
            ),
        );

    if (!savedDraft) {
        return {
            title: initialTitle,
            content: initialContent,
        };
    }

    try {
        const parsedDraft =
            JSON.parse(
                savedDraft,
            ) as Partial<BoardEditDraft>;

        return {
            title:
                typeof parsedDraft.title ===
                    "string"
                    ? parsedDraft.title.slice(
                        0,
                        MAX_TITLE_LENGTH,
                    )
                    : initialTitle,

            content:
                typeof parsedDraft.content ===
                    "string"
                    ? parsedDraft.content.slice(
                        0,
                        MAX_CONTENT_LENGTH,
                    )
                    : initialContent,
        };
    } catch (error) {
        console.error(
            "게시글 수정 임시저장 데이터 파싱 오류",
            error,
        );

        sessionStorage.removeItem(
            createEditDraftKey(
                boardId,
            ),
        );

        return {
            title: initialTitle,
            content: initialContent,
        };
    }
}
/**
 * 일반게시판 게시글 수정 페이지이다.
 *
 * 게시글 조회·수정·삭제를 boardApi를 통해 처리한다.
 * 환경변수에 따라 Mock 또는 실제 백엔드 API가 선택된다.
 */
function BoardEditPage() {
    const navigate = useNavigate();
    const location = useLocation();

    /**
     * URL에서 수정할 게시글 번호를 가져온다.
     *
     * 예:
     * /board/13/edit
     */
    const { postId } = useParams<{
        postId: string;
    }>();

    const numericPostId =
        Number(postId);

    /**
     * 게시판 목록에서 전달한 기존 목록 주소이다.
     */
    const locationState =
        location.state as BoardEditLocationState | null;

    const listUrl =
        locationState?.from ?? "/board";

    /**
     * 게시글 상세 조회 API 응답이다.
     */
    const [
        post,
        setPost,
    ] =
        useState<BoardDetail | null>(
            null,
        );

    /**
     * 수정 Form의 제목과 본문이다.
     */
    const [
        title,
        setTitle,
    ] = useState("");

    const [
        content,
        setContent,
    ] = useState("");

    /**
     * API 및 입력 검증 상태이다.
     */
    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const [
        isDeleting,
        setIsDeleting,
    ] = useState(false);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState("");

    /**
     * 게시글 조회 실패 후 다시 시도할 때 사용하는 값이다.
     */
    const [
        reloadKey,
        setReloadKey,
    ] = useState(0);

    /**
     * 수정할 게시글을 API로 조회한다.
     */
    useEffect(() => {
        let isCurrentRequest = true;

        const loadBoardPost =
            async () => {
                /*
                 * 게시글 번호가 올바르지 않으면
                 * API 요청을 보내지 않는다.
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

                    if (!isCurrentRequest) {
                        return;
                    }

                    /*
                     * 공지사항은 일반 사용자 수정 화면에서
                     * 수정할 수 없다.
                     */
                    if (
                        response.type ===
                        "NOTICE"
                    ) {
                        setPost(null);

                        setErrorMessage(
                            "공지사항은 일반 사용자가 수정할 수 없습니다.",
                        );

                        return;
                    }

                    const draft =
                        loadBoardEditDraft(
                            response.boardId,
                            response.title,
                            response.content,
                        );

                    setPost(response);
                    setTitle(draft.title);
                    setContent(
                        draft.content,
                    );
                } catch (error) {
                    if (!isCurrentRequest) {
                        return;
                    }

                    console.error(
                        "수정할 게시글 조회 오류",
                        error,
                    );

                    setPost(null);

                    setErrorMessage(
                        "수정할 게시글을 불러오지 못했습니다.",
                    );
                } finally {
                    if (isCurrentRequest) {
                        setIsLoading(false);
                    }
                }
            };

        void loadBoardPost();

        return () => {
            isCurrentRequest = false;
        };
    }, [
        numericPostId,
        reloadKey,
    ]);
    /**
   * 제목이나 본문이 변경되면
   * sessionStorage에 수정 중인 내용을 임시 저장한다.
   */
    useEffect(() => {
        /*
         * 게시글 조회가 완료되기 전에는
         * 빈 입력값을 임시 저장하지 않는다.
         */
        if (
            !post ||
            isLoading
        ) {
            return;
        }

        const draft: BoardEditDraft = {
            title,
            content,
        };

        sessionStorage.setItem(
            createEditDraftKey(
                post.boardId,
            ),
            JSON.stringify(draft),
        );
    }, [
        content,
        isLoading,
        post,
        title,
    ]);

    /**
     * 제목을 최대 20자로 제한한다.
     */
    const handleTitleChange = (
        event: ChangeEvent<HTMLInputElement>,
    ) => {
        setTitle(
            event.target.value.slice(
                0,
                MAX_TITLE_LENGTH,
            ),
        );

        setErrorMessage("");
    };

    /**
     * 본문을 최대 5,000자로 제한한다.
     */
    const handleContentChange = (
        event: ChangeEvent<HTMLTextAreaElement>,
    ) => {
        setContent(
            event.target.value.slice(
                0,
                MAX_CONTENT_LENGTH,
            ),
        );

        setErrorMessage("");
    };

    /**
     * 수정 버튼을 누르면 입력값을 검증한 후
     * 게시글 수정 API를 호출한다.
     */
    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        if (!post) {
            setErrorMessage(
                "수정할 게시글이 없습니다.",
            );
            return;
        }

        const trimmedTitle =
            title.trim();

        const trimmedContent =
            content.trim();

        if (!trimmedTitle) {
            setErrorMessage(
                "제목을 입력해 주세요.",
            );
            return;
        }

        if (
            trimmedTitle.length >
            MAX_TITLE_LENGTH
        ) {
            setErrorMessage(
                "제목은 20자 이내로 입력해 주세요.",
            );
            return;
        }

        if (!trimmedContent) {
            setErrorMessage(
                "내용을 입력해 주세요.",
            );
            return;
        }

        /*
         * 이미 수정 또는 삭제 요청이 처리 중이면
         * 중복 요청을 보내지 않는다.
         */
        if (
            isSubmitting ||
            isDeleting
        ) {
            return;
        }

        setIsSubmitting(true);
        setErrorMessage("");

        try {
            await updateBoardPostApi(
                post.boardId,
                {
                    title: trimmedTitle,
                    content:
                        trimmedContent,
                },
            );

            sessionStorage.removeItem(
                createEditDraftKey(
                    post.boardId,
                ),
            );

            alert(
                "게시글 수정 요청이 정상적으로 처리되었습니다.",
            );

            /*
             * 수정 성공 후 상세 화면으로 이동한다.
             */
            navigate(
                `/board/${post.boardId}`,
                {
                    replace: true,

                    state: {
                        from: listUrl,
                    },
                },
            );
        } catch (error) {
            console.error(
                "게시글 수정 오류",
                error,
            );

            setErrorMessage(
                "게시글을 수정하지 못했습니다.",
            );
        } finally {
            setIsSubmitting(false);
        }
    };
    /**
   * 삭제 버튼을 누르면 확인 후
   * 게시글 삭제 API를 호출한다.
   */
    const handleDelete = async () => {
        if (
            !post ||
            isSubmitting ||
            isDeleting
        ) {
            return;
        }

        const confirmed =
            window.confirm(
                "게시글을 삭제하시겠습니까?",
            );

        if (!confirmed) {
            return;
        }

        setIsDeleting(true);
        setErrorMessage("");

        try {
            const response =
                await deleteBoardPostApi(
                    post.boardId,
                );

            if (!response.deleted) {
                throw new Error(
                    "게시글 삭제에 실패했습니다.",
                );
            }

            sessionStorage.removeItem(
                createEditDraftKey(
                    post.boardId,
                ),
            );

            alert(
                "게시글 삭제 요청이 정상적으로 처리되었습니다.",
            );

            navigate(listUrl, {
                replace: true,
            });
        } catch (error) {
            console.error(
                "게시글 삭제 오류",
                error,
            );

            setErrorMessage(
                "게시글을 삭제하지 못했습니다.",
            );
        } finally {
            setIsDeleting(false);
        }
    };

    /**
     * 수정 중인 내용을 취소하고
     * 게시글 상세 화면으로 돌아간다.
     */
    const handleBackToDetail = () => {
        if (!post) {
            navigate(listUrl);
            return;
        }

        const isChanged =
            title !== post.title ||
            content !== post.content;

        if (
            isChanged &&
            !window.confirm(
                "수정 중인 내용이 있습니다. 상세 화면으로 이동하시겠습니까?",
            )
        ) {
            return;
        }

        sessionStorage.removeItem(
            createEditDraftKey(
                post.boardId,
            ),
        );

        navigate(
            `/board/${post.boardId}`,
            {
                state: {
                    from: listUrl,
                },
            },
        );
    };

    /**
     * 수정 중인 내용을 취소하고
     * 기존 검색 조건이 포함된 목록으로 돌아간다.
     */
    const handleBackToList = () => {
        if (
            post &&
            (
                title !== post.title ||
                content !== post.content
            ) &&
            !window.confirm(
                "수정 중인 내용이 있습니다. 목록으로 이동하시겠습니까?",
            )
        ) {
            return;
        }

        if (post) {
            sessionStorage.removeItem(
                createEditDraftKey(
                    post.boardId,
                ),
            );
        }

        navigate(listUrl);
    };

    /**
     * 게시글을 불러오는 동안 표시한다.
     */
    if (isLoading) {
        return (
            <main
                className={
                    styles.editPage
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
     * 게시글 조회 실패 또는 수정할 수 없는
     * 게시글 안내 화면이다.
     */
    if (
        errorMessage &&
        !post
    ) {
        return (
            <main
                className={
                    styles.editPage
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
                        수정할 수 없는 게시글입니다.
                    </h1>

                    <p
                        className={
                            styles.notFoundDescription
                        }
                    >
                        {errorMessage}
                    </p>

                    <div
                        className={
                            styles.leftButtons
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
                                styles.submitButton
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

    /*
     * 오류 메시지는 없지만 게시글이 없는 비정상 상태에서는
     * 화면을 표시하지 않는다.
     */
    if (!post) {
        return null;
    }
    return (
        <main
            className={
                styles.editPage
            }
        >
            <div
                className={
                    styles.editContainer
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
                        게시글 수정
                    </h1>

                    <p
                        className={
                            styles.pageDescription
                        }
                    >
                        게시글의 제목과 내용을 수정할 수 있습니다.
                    </p>
                </header>

                {/* 게시글 수정 Form */}

                <form
                    className={
                        styles.editForm
                    }
                    onSubmit={handleSubmit}
                    noValidate
                >
                    {/* 제목 */}

                    <div
                        className={
                            styles.field
                        }
                    >
                        <div
                            className={
                                styles.labelRow
                            }
                        >
                            <label
                                htmlFor="board-edit-title"
                                className={
                                    styles.label
                                }
                            >
                                제목
                            </label>

                            <span
                                className={
                                    styles.characterCounter
                                }
                            >
                                {title.length}/
                                {MAX_TITLE_LENGTH}
                            </span>
                        </div>

                        <input
                            id="board-edit-title"
                            type="text"
                            value={title}
                            onChange={
                                handleTitleChange
                            }
                            maxLength={
                                MAX_TITLE_LENGTH
                            }
                            className={
                                styles.titleInput
                            }
                            autoFocus
                        />
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

                    {/* 본문 */}

                    <div
                        className={
                            styles.field
                        }
                    >
                        <div
                            className={
                                styles.labelRow
                            }
                        >
                            <label
                                htmlFor="board-edit-content"
                                className={
                                    styles.label
                                }
                            >
                                내용
                            </label>

                            <span
                                className={
                                    styles.characterCounter
                                }
                            >
                                {content.length}/
                                {MAX_CONTENT_LENGTH}
                            </span>
                        </div>

                        <textarea
                            id="board-edit-content"
                            value={content}
                            onChange={
                                handleContentChange
                            }
                            maxLength={
                                MAX_CONTENT_LENGTH
                            }
                            className={
                                styles.contentInput
                            }
                        />
                    </div>

                    {/* 첨부파일 */}

                    <section
                        className={
                            styles.attachmentSection
                        }
                    >
                        <h2
                            className={
                                styles.attachmentTitle
                            }
                        >
                            첨부파일
                        </h2>

                        <div
                            className={
                                styles.attachmentBox
                            }
                        >
                            <span
                                className={
                                    styles.attachmentGuide
                                }
                            >
                                {post.attachments.length >
                                    0
                                    ? post.attachments
                                        .map(
                                            (
                                                attachment,
                                            ) =>
                                                attachment.fileName,
                                        )
                                        .join(", ")
                                    : "첨부파일이 없습니다."}
                            </span>

                            <button
                                type="button"
                                className={
                                    styles.fileButton
                                }
                            >
                                파일 선택
                            </button>
                        </div>

                        <p
                            className={
                                styles.attachmentDescription
                            }
                        >
                            실제 파일 변경은 백엔드와 MinIO 연결 후
                            적용할 예정입니다.
                        </p>
                    </section>
                    {/* 입력 또는 API 오류 메시지 */}

                    {errorMessage && (
                        <p
                            className={
                                styles.errorMessage
                            }
                            role="alert"
                        >
                            {errorMessage}
                        </p>
                    )}

                    {/* 하단 버튼 */}

                    <div
                        className={
                            styles.buttonArea
                        }
                    >
                        <div
                            className={
                                styles.leftButtons
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
                                disabled={
                                    isSubmitting ||
                                    isDeleting
                                }
                            >
                                목록
                            </button>

                            <button
                                type="button"
                                className={
                                    styles.deleteButton
                                }
                                onClick={() => {
                                    void handleDelete();
                                }}
                                disabled={
                                    isSubmitting ||
                                    isDeleting
                                }
                            >
                                {isDeleting
                                    ? "삭제 중..."
                                    : "삭제"}
                            </button>
                        </div>

                        <div
                            className={
                                styles.rightButtons
                            }
                        >
                            <button
                                type="button"
                                className={
                                    styles.cancelButton
                                }
                                onClick={
                                    handleBackToDetail
                                }
                                disabled={
                                    isSubmitting ||
                                    isDeleting
                                }
                            >
                                취소
                            </button>

                            <button
                                type="submit"
                                className={
                                    styles.submitButton
                                }
                                disabled={
                                    isSubmitting ||
                                    isDeleting
                                }
                            >
                                {isSubmitting
                                    ? "수정 중..."
                                    : "수정"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </main>
    );
}

export default BoardEditPage;