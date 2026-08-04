import {
    useEffect,
    useMemo,
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
    findMockBoardPost,
} from "@/features/board/data/mockBoardPosts";

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
 * 수정 중 임시 저장하는 제목과 본문이다.
 */
interface BoardEditDraft {
    title: string;
    content: string;
}

/**
 * 상세 화면에서 수정 화면으로 이동할 때 전달하는 상태이다.
 */
interface BoardEditLocationState {
    /**
     * 검색 조건과 페이지 번호가 포함된
     * 기존 게시판 목록 주소이다.
     */
    from?: string;
}

/**
 * 게시글별 수정 임시저장 Key를 생성한다.
 *
 * 게시글 번호를 포함하여 여러 게시글의 수정 내용이
 * 서로 덮어쓰지 않게 한다.
 */
function createEditDraftKey(
    postId: number,
): string {
    return `boardEditDraft:${postId}`;
}

/**
 * sessionStorage에서 수정 중인 내용을 가져온다.
 *
 * 임시 저장된 내용이 없다면 Mock 게시글의
 * 기존 제목과 본문을 초기값으로 사용한다.
 */
function loadBoardEditDraft(
    postId: number,
    initialTitle: string,
    initialContent: string,
): BoardEditDraft {
    const draftKey =
        createEditDraftKey(postId);

    const savedDraft =
        sessionStorage.getItem(
            draftKey,
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
            draftKey,
        );

        return {
            title: initialTitle,
            content: initialContent,
        };
    }
}

/**
 * 일반게시판 게시글 수정 화면이다.
 *
 * 현재는 화면 구성 단계이므로 Mock 게시글의 실제 내용은
 * 변경하지 않는다.
 *
 * 수정 중인 제목과 본문만 sessionStorage에 저장하여
 * 새로고침 후에도 입력값이 유지되도록 한다.
 */
function BoardEditPage() {
    const navigate = useNavigate();
    const location = useLocation();

    /**
     * URL에서 게시글 번호를 가져온다.
     *
     * 예:
     * /board/13/edit
     */
    const { postId } = useParams<{
        postId: string;
    }>();

    const numericPostId = Number(postId);

    /**
     * Mock Data에서 수정 화면에 표시할 게시글을 조회한다.
     */
    const post = Number.isInteger(
        numericPostId,
    )
        ? findMockBoardPost(
            numericPostId,
        )
        : undefined;

    /**
     * 이전 게시판 목록 주소를 가져온다.
     */
    const locationState =
        location.state as BoardEditLocationState | null;

    const listUrl =
        locationState?.from ?? "/board";

    /**
     * 게시글이 존재하면 임시저장 내용을 가져오고,
     * 존재하지 않으면 빈 입력값을 사용한다.
     */
    const initialDraft =
        useMemo(() => {
            if (!post) {
                return {
                    title: "",
                    content: "",
                };
            }

            return loadBoardEditDraft(
                post.id,
                post.title,
                post.content,
            );
        }, [post]);

    const [
        title,
        setTitle,
    ] = useState(
        initialDraft.title,
    );

    const [
        content,
        setContent,
    ] = useState(
        initialDraft.content,
    );

    const [
        errorMessage,
        setErrorMessage,
    ] = useState("");

    /**
     * 제목이나 본문이 변경되면 게시글별 Key를 사용해
     * sessionStorage에 임시 저장한다.
     */
    useEffect(() => {
        if (!post) {
            return;
        }

        const draft: BoardEditDraft = {
            title,
            content,
        };

        sessionStorage.setItem(
            createEditDraftKey(
                post.id,
            ),
            JSON.stringify(draft),
        );
    }, [
        content,
        post,
        title,
    ]);

    /**
     * 제목 입력을 최대 20자로 제한한다.
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
     * 본문 입력을 최대 5,000자로 제한한다.
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
     * 수정 버튼을 눌렀을 때 입력값을 검증한다.
     *
     * 현재는 실제 Mock Data를 변경하지 않고
     * 화면 구현 단계라는 안내만 표시한다.
     */
    const handleSubmit = (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        if (!title.trim()) {
            setErrorMessage(
                "제목을 입력해 주세요.",
            );
            return;
        }

        if (!content.trim()) {
            setErrorMessage(
                "내용을 입력해 주세요.",
            );
            return;
        }

        alert(
            "현재는 화면 구현 단계이므로 게시글이 실제로 수정되지는 않습니다.",
        );
    };

    /**
     * 상세 화면으로 돌아간다.
     *
     * 작성 중인 변경사항이 있다면 이동 전에 확인한다.
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
                post.id,
            ),
        );

        navigate(
            `/board/${post.id}`,
            {
                state: {
                    from: listUrl,
                },
            },
        );
    };

    /**
     * 목록 화면으로 이동한다.
     */
    const handleBackToList = () => {
        if (
            post &&
            (title !== post.title ||
                content !== post.content) &&
            !window.confirm(
                "수정 중인 내용이 있습니다. 목록으로 이동하시겠습니까?",
            )
        ) {
            return;
        }

        if (post) {
            sessionStorage.removeItem(
                createEditDraftKey(
                    post.id,
                ),
            );
        }

        navigate(listUrl);
    };

    /**
     * 삭제 버튼의 화면 동작이다.
     *
     * 실제 게시글은 삭제하지 않고 안내 메시지만 표시한다.
     */
    const handleDelete = () => {
        alert(
            "현재는 화면 구현 단계이므로 게시글이 실제로 삭제되지는 않습니다.",
        );
    };

    /**
     * 존재하지 않거나 공지사항인 경우
     * 수정 Form 대신 안내 화면을 표시한다.
     *
     * 공지사항 수정은 관리자 화면에서 담당할 예정이다.
     */
    if (
        !post ||
        post.type === "NOTICE"
    ) {
        return (
            <main className={styles.editPage}>
                <section
                    className={styles.notFound}
                >
                    <p className={styles.notFoundCode}>
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
                        게시글이 존재하지 않거나 일반 사용자가 수정할 수
                        없는 게시글입니다.
                    </p>

                    <button
                        type="button"
                        className={styles.listButton}
                        onClick={handleBackToList}
                    >
                        게시판 목록
                    </button>
                </section>
            </main>
        );
    }

    return (
        <main className={styles.editPage}>
            <div className={styles.editContainer}>
                {/* ================================================
            페이지 제목
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
                        게시글 수정
                    </h1>

                    <p className={styles.pageDescription}>
                        게시글의 제목과 내용을 수정할 수 있습니다.
                    </p>
                </header>

                {/* ================================================
            게시글 수정 Form
        ================================================= */}

                <form
                    className={styles.editForm}
                    onSubmit={handleSubmit}
                    noValidate
                >
                    {/* 제목 */}

                    <div className={styles.field}>
                        <div className={styles.labelRow}>
                            <label
                                htmlFor="board-edit-title"
                                className={styles.label}
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
                            onChange={handleTitleChange}
                            maxLength={
                                MAX_TITLE_LENGTH
                            }
                            className={
                                styles.titleInput
                            }
                            autoFocus
                        />
                    </div>

                    {/* 작성 정보 */}

                    <dl className={styles.metadata}>
                        <div
                            className={
                                styles.metadataItem
                            }
                        >
                            <dt>작성자</dt>
                            <dd>{post.author}</dd>
                        </div>

                        <div
                            className={
                                styles.metadataItem
                            }
                        >
                            <dt>작성일</dt>
                            <dd>{post.createdAt}</dd>
                        </div>

                        <div
                            className={
                                styles.metadataItem
                            }
                        >
                            <dt>조회수</dt>
                            <dd>{post.viewCount}</dd>
                        </div>
                    </dl>

                    {/* 본문 */}

                    <div className={styles.field}>
                        <div className={styles.labelRow}>
                            <label
                                htmlFor="board-edit-content"
                                className={styles.label}
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

                    {/* 첨부파일 표시 */}

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
                                {post.attachmentName ??
                                    "첨부파일이 없습니다."}
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

                    {/* 입력 오류 */}

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

                    <div className={styles.buttonArea}>
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
                                목록
                            </button>

                            <button
                                type="button"
                                className={
                                    styles.deleteButton
                                }
                                onClick={handleDelete}
                            >
                                삭제
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
                            >
                                취소
                            </button>

                            <button
                                type="submit"
                                className={
                                    styles.submitButton
                                }
                            >
                                수정
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </main>
    );
}

export default BoardEditPage;