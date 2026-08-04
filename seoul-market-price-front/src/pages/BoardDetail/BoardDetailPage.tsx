import {
    Link,
    useLocation,
    useNavigate,
    useParams,
} from "react-router-dom";

import {
    findMockBoardPost,
} from "@/features/board/data/mockBoardPosts";

import styles from "./BoardDetailPage.module.css";

/**
 * 게시판 목록에서 상세 화면으로 이동할 때
 * 전달하는 Router State이다.
 */
interface BoardDetailLocationState {
    /**
     * 검색 조건과 페이지 번호가 포함된
     * 기존 게시판 목록 주소이다.
     *
     * 예:
     * /board?keyword=사과&page=2
     */
    from?: string;
}

/**
 * 게시글 상세 조회 페이지이다.
 *
 * 현재는 Mock Data를 이용하여 상세 화면만 표시한다.
 * 게시글 수정·삭제 및 첨부파일 다운로드는
 * 백엔드 기능과 합칠 때 실제 동작을 연결한다.
 */
function BoardDetailPage() {
    const navigate = useNavigate();
    const location = useLocation();

    /**
     * URL에서 게시글 번호를 가져온다.
     *
     * 예:
     * /board/13
     *
     * 위 주소에서는 postId가 "13"이 된다.
     */
    const { postId } = useParams<{
        postId: string;
    }>();

    /**
     * URL의 게시글 번호를 숫자로 변환한다.
     */
    const numericPostId = Number(postId);

    /**
     * 정상적인 게시글 번호인 경우에만
     * Mock Data에서 게시글을 조회한다.
     */
    const post = Number.isInteger(
        numericPostId,
    )
        ? findMockBoardPost(
            numericPostId,
        )
        : undefined;

    /**
     * 게시판 목록에서 전달받은 이전 목록 주소를 가져온다.
     */
    const locationState =
        location.state as BoardDetailLocationState | null;

    /**
     * 상세 주소를 직접 입력한 경우 Router State가 없으므로
     * 기본 게시판 목록 주소인 /board를 사용한다.
     */
    const listUrl =
        locationState?.from ?? "/board";

    /**
     * 목록 버튼을 눌렀을 때 기존 게시판 목록으로 이동한다.
     *
     * 목록에서 상세 화면으로 들어왔다면 검색어와 페이지가 포함된
     * 기존 URL로 돌아가므로 이전 목록 상태가 유지된다.
     */
    const handleBackToList = () => {
        navigate(listUrl);
    };

    /**
     * 존재하지 않는 게시글 번호로 접근한 경우
     * 게시글 없음 안내 화면을 표시한다.
     */
    if (!post) {
        return (
            <main className={styles.detailPage}>
                <section className={styles.notFound}>
                    <p className={styles.notFoundCode}>
                        404
                    </p>

                    <h1 className={styles.notFoundTitle}>
                        게시글을 찾을 수 없습니다.
                    </h1>

                    <p
                        className={
                            styles.notFoundDescription
                        }
                    >
                        삭제되었거나 존재하지 않는 게시글입니다.
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

    /**
     * 공지사항 여부를 확인한다.
     */
    const isNotice =
        post.type === "NOTICE";

    return (
        <main className={styles.detailPage}>
            <div className={styles.detailContainer}>
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
                        게시글 조회
                    </h1>

                    <p className={styles.pageDescription}>
                        게시글의 제목과 내용을 확인할 수 있습니다.
                    </p>
                </header>

                {/* ================================================
            게시글 상세 내용
        ================================================= */}

                <article className={styles.article}>
                    {/* 게시글 구분과 제목 */}

                    <div className={styles.titleArea}>
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

                        <h2 className={styles.postTitle}>
                            {post.title}
                        </h2>
                    </div>

                    {/* 작성자, 작성일, 조회수 */}

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

                    {/*
           * 게시글 내용에 포함된 줄바꿈은
           * CSS의 white-space: pre-wrap으로 표시한다.
           */}
                    <div className={styles.content}>
                        {post.content}
                    </div>

                    {/* ==============================================
              첨부파일 영역

              현재는 파일 이름만 표시하고
              실제 다운로드 기능은 연결하지 않는다.
          =============================================== */}

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

                        {post.attachmentName ? (
                            <div
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
                                    {post.attachmentName}
                                </span>

                                <span
                                    className={
                                        styles.fileGuide
                                    }
                                >
                                    화면 확인용 파일
                                </span>
                            </div>
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

                {/* ================================================
            게시글 하단 버튼 영역
        ================================================= */}

                <div className={styles.buttonArea}>
                    <button
                        type="button"
                        className={styles.listButton}
                        onClick={handleBackToList}
                    >
                        목록
                    </button>

                    {/*
           * 공지사항은 관리자 기능에서 관리하므로
           * 일반 게시글에만 수정·삭제 버튼 모양을 표시한다.
           *
           * 실제 작성자 권한 검사와 삭제 기능은
           * 백엔드 기능을 합칠 때 연결한다.
           */}
                    {!isNotice && (
                        <div
                            className={
                                styles.ownerButtons
                            }
                        >
                            <Link
                                to={`/board/${post.id}/edit`}
                                state={{
                                    from: listUrl,
                                }}
                                className={
                                    styles.editButton
                                }
                            >
                                수정
                            </Link>

                            <button
                                type="button"
                                className={
                                    styles.deleteButton
                                }
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