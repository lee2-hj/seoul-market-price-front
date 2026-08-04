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
} from "react-router-dom";

import {
    getLoginUser,
} from "@/features/auth/utils/auth";

import styles from "./BoardWritePage.module.css";

/**
 * 게시글 제목 최대 길이이다.
 */
const MAX_TITLE_LENGTH = 20;

/**
 * 게시글 본문 최대 길이이다.
 */
const MAX_CONTENT_LENGTH = 5000;

/**
 * 작성 중인 내용을 sessionStorage에 저장할 때
 * 사용하는 Key이다.
 */
const BOARD_WRITE_DRAFT_KEY =
    "boardWriteDraft";

/**
 * 게시글 작성 중 임시 저장하는 값이다.
 */
interface BoardWriteDraft {
    /**
     * 작성 중인 제목
     */
    title: string;

    /**
     * 작성 중인 본문
     */
    content: string;
}

/**
 * 게시판 목록에서 글쓰기 화면으로 이동할 때
 * 전달할 수 있는 Router State이다.
 */
interface BoardWriteLocationState {
    /**
     * 검색 조건과 페이지 번호가 포함된
     * 이전 게시판 목록 주소이다.
     */
    from?: string;
}

/**
 * sessionStorage에서 임시 저장된 게시글을 가져온다.
 *
 * 저장된 값이 없거나 JSON 형식이 올바르지 않은 경우
 * 빈 제목과 본문을 반환한다.
 */
function loadBoardWriteDraft(): BoardWriteDraft {
    const savedDraft =
        sessionStorage.getItem(
            BOARD_WRITE_DRAFT_KEY,
        );

    if (!savedDraft) {
        return {
            title: "",
            content: "",
        };
    }

    try {
        const parsedDraft =
            JSON.parse(
                savedDraft,
            ) as Partial<BoardWriteDraft>;

        return {
            title:
                typeof parsedDraft.title ===
                    "string"
                    ? parsedDraft.title.slice(
                        0,
                        MAX_TITLE_LENGTH,
                    )
                    : "",

            content:
                typeof parsedDraft.content ===
                    "string"
                    ? parsedDraft.content.slice(
                        0,
                        MAX_CONTENT_LENGTH,
                    )
                    : "",
        };
    } catch (error) {
        console.error(
            "게시글 임시 저장 데이터 파싱 오류",
            error,
        );

        sessionStorage.removeItem(
            BOARD_WRITE_DRAFT_KEY,
        );

        return {
            title: "",
            content: "",
        };
    }
}

/**
 * 일반게시판 글쓰기 화면이다.
 *
 * 현재는 프론트 화면 구성 단계이므로 작성한 게시글을
 * 서버 또는 localStorage에 실제로 등록하지 않는다.
 *
 * 작성 중인 제목과 본문만 sessionStorage에 저장하여
 * 같은 브라우저 탭에서 새로고침해도 입력값이 유지되게 한다.
 */
function BoardWritePage() {
    const navigate = useNavigate();
    const location = useLocation();

    /**
     * 현재 로그인 사용자 정보이다.
     *
     * 로그인 정보가 없는 상태로 화면을 직접 확인하면
     * 작성자 이름 대신 "사용자"를 표시한다.
     */
    const loginUser = getLoginUser();

    /**
     * 게시판 목록에서 전달한 기존 목록 주소를 가져온다.
     */
    const locationState =
        location.state as BoardWriteLocationState | null;

    /**
     * 이전 목록 주소가 없다면 기본 게시판 주소를 사용한다.
     */
    const listUrl =
        locationState?.from ?? "/board";

    /**
     * 처음 화면을 열 때 임시 저장된 제목과 본문을 가져온다.
     */
    const initialDraft =
        useMemo(
            () =>
                loadBoardWriteDraft(),
            [],
        );

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
     * 작성 화면을 처음 열었을 때 표시할 작성일이다.
     *
     * 화면이 다시 렌더링되더라도 날짜 계산을 반복하지 않도록
     * useMemo를 사용한다.
     */
    const createdAt =
        useMemo(() => {
            return new Intl.DateTimeFormat(
                "ko-KR",
                {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                },
            ).format(new Date());
        }, []);

    /**
     * 제목이나 본문이 변경될 때마다
     * 현재 브라우저 탭의 sessionStorage에 임시 저장한다.
     */
    useEffect(() => {
        const draft: BoardWriteDraft = {
            title,
            content,
        };

        sessionStorage.setItem(
            BOARD_WRITE_DRAFT_KEY,
            JSON.stringify(draft),
        );
    }, [
        content,
        title,
    ]);

    /**
     * 게시글 제목 입력을 처리한다.
     *
     * input의 maxLength와 함께 코드에서도 20자까지만 저장하여
     * 제목 최대 길이를 이중으로 제한한다.
     */
    const handleTitleChange = (
        event: ChangeEvent<HTMLInputElement>,
    ) => {
        const nextTitle =
            event.target.value.slice(
                0,
                MAX_TITLE_LENGTH,
            );

        setTitle(nextTitle);
        setErrorMessage("");
    };

    /**
     * 게시글 본문 입력을 처리한다.
     */
    const handleContentChange = (
        event: ChangeEvent<HTMLTextAreaElement>,
    ) => {
        const nextContent =
            event.target.value.slice(
                0,
                MAX_CONTENT_LENGTH,
            );

        setContent(nextContent);
        setErrorMessage("");
    };

    /**
     * 등록 버튼을 눌렀을 때 입력값을 검증한다.
     *
     * 현재 작업 범위에서는 실제 게시글 등록 API를 호출하지 않고
     * 화면단 구현이 완료되었다는 안내만 표시한다.
     */
    const handleSubmit = (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

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

        alert(
            "현재는 화면 구현 단계이므로 게시글이 실제로 등록되지는 않습니다.",
        );
    };

    /**
     * 목록 버튼을 눌렀을 때 실행한다.
     *
     * 작성 중인 내용이 있으면 목록으로 이동하기 전에
     * 이동 여부를 확인한다.
     */
    const handleBackToList = () => {
        const hasDraft =
            title.trim().length > 0 ||
            content.trim().length > 0;

        if (
            hasDraft &&
            !window.confirm(
                "작성 중인 내용이 있습니다. 목록으로 이동하시겠습니까?",
            )
        ) {
            return;
        }

        /*
         * 목록으로 이동할 때 임시 저장한 작성 내용을 제거한다.
         */
        sessionStorage.removeItem(
            BOARD_WRITE_DRAFT_KEY,
        );

        navigate(listUrl);
    };

    return (
        <main className={styles.writePage}>
            <div className={styles.writeContainer}>
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
                        게시글 작성
                    </h1>

                    <p className={styles.pageDescription}>
                        농수산물 가격정보와 싸농 서비스에 관한 내용을
                        자유롭게 작성해 주세요.
                    </p>
                </header>

                {/* ================================================
            게시글 입력 Form
        ================================================= */}

                <form
                    className={styles.writeForm}
                    onSubmit={handleSubmit}
                    noValidate
                >
                    {/* 게시글 제목 */}

                    <div className={styles.field}>
                        <div className={styles.labelRow}>
                            <label
                                htmlFor="board-write-title"
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
                            id="board-write-title"
                            type="text"
                            value={title}
                            onChange={handleTitleChange}
                            maxLength={
                                MAX_TITLE_LENGTH
                            }
                            className={
                                styles.titleInput
                            }
                            placeholder="제목을 20자 이내로 입력하세요."
                            autoFocus
                        />
                    </div>

                    {/* 작성자, 작성일, 조회수 */}

                    <dl className={styles.metadata}>
                        <div
                            className={
                                styles.metadataItem
                            }
                        >
                            <dt>작성자</dt>

                            <dd>
                                {loginUser?.name ??
                                    "사용자"}
                            </dd>
                        </div>

                        <div
                            className={
                                styles.metadataItem
                            }
                        >
                            <dt>작성일</dt>
                            <dd>{createdAt}</dd>
                        </div>

                        <div
                            className={
                                styles.metadataItem
                            }
                        >
                            <dt>조회수</dt>
                            <dd>0</dd>
                        </div>
                    </dl>

                    {/* 게시글 본문 */}

                    <div className={styles.field}>
                        <div className={styles.labelRow}>
                            <label
                                htmlFor="board-write-content"
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
                            id="board-write-content"
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
                            placeholder="내용을 입력하세요."
                        />
                    </div>

                    {/* ==============================================
              첨부파일 화면

              현재는 화면 구성만 제공하며
              파일 선택과 업로드 기능은 연결하지 않는다.
          =============================================== */}

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
                                첨부할 파일을 선택해 주세요.
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
                            파일 업로드 기능은 백엔드와 MinIO 연결 후
                            적용할 예정입니다.
                        </p>
                    </section>

                    {/* 입력값 검증 오류 */}

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

                    {/* ==============================================
              하단 버튼 영역
          =============================================== */}

                    <div className={styles.buttonArea}>
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
                            type="submit"
                            className={
                                styles.submitButton
                            }
                        >
                            등록
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}

export default BoardWritePage;