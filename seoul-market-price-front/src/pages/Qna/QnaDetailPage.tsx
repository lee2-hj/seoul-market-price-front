import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

import styles from "./QnaDetailPage.module.css";

/*
 * 백엔드 서버 주소
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8081";

/*
 * 로그인 사용자
 */

interface LoginUser {
  userId?: string;
  name?: string;
  userName?: string;
  role?: string;
}

/*
 * 첨부파일 정보
 */

interface QnaAttachment {
  name: string;
  size: number;
}

/*
 * Q&A 상세 응답
 *
 * 백엔드에서 실제로 사용하는 필드명을 기준으로 작성한다.
 */

interface QnaDetailResponse {
  id: number;

  title: string;

  questionContent?: string;

  writerName?: string;

  writerLoginId?: string;

  userId?: string;

  createdAt?: string;

  updatedAt?: string;

  viewCount?: number;

  answeredAt?: string;

  answerContent?: string;

  answerMemberId?: number;

  answerWriterName?: string;

  attachName?: string;

  attachPath?: string;

  attachmentAvailable?: boolean;

  attachments?: QnaAttachment[];
}

/*
 * 로그인 사용자 조회
 */

const getLoginUser = (): LoginUser | null => {
  const storedUser = localStorage.getItem("loginUser");

  if (!storedUser) {
    return null;
  }

  try {
    const parsedUser: unknown = JSON.parse(storedUser);

    if (
      !parsedUser ||
      typeof parsedUser !== "object" ||
      Array.isArray(parsedUser)
    ) {
      return null;
    }

    return parsedUser as LoginUser;
  } catch (error) {
    console.error("로그인 사용자 정보 확인 실패:", error);

    return null;
  }
};

/*
 * 로그인 사용자 이름
 */

const getLoginUserName = (user: LoginUser | null): string => {
  if (!user) {
    return "사용자";
  }

  return user.name || user.userName || user.userId || "사용자";
};

/*
 * 관리자 여부
 */

const isAdminUser = (user: LoginUser | null): boolean => {
  if (!user?.role) {
    return false;
  }

  const role = user.role.toUpperCase();

  return role === "ADMIN" || role === "ROLE_ADMIN";
};

/*
 * 날짜 포맷
 */

const formatDate = (date?: string): string => {
  if (!date) {
    return "-";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  const year = parsedDate.getFullYear();

  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");

  const day = String(parsedDate.getDate()).padStart(2, "0");

  return `${year}.${month}.${day}`;
};

/*
 * 파일 크기 표시
 */

const formatFileSize = (size: number): string => {
  if (!size || size < 1024) {
    return `${size || 0} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

/*
 * Q&A 상세 페이지
 */

function QnaDetailPage() {
  const navigate = useNavigate();

  const { id } = useParams<{ id: string }>();

  /*
   * 로그인 사용자
   */

  const currentUser = getLoginUser();

  const currentUserId = currentUser?.userId ?? "";

  const currentUserName = getLoginUserName(currentUser);

  const isAdmin = isAdminUser(currentUser);

  const isLoggedIn = Boolean(currentUser && currentUserId);

  /*
   * 게시글
   */

  const [post, setPost] = useState<QnaDetailResponse | null>(null);

  /*
   * 로딩
   */

  const [loading, setLoading] = useState(true);

  /*
   * 오류
   */

  const [errorMessage, setErrorMessage] = useState("");

  /*
   * Q&A 상세 조회
   *
   * GET /api/qnas/{id}
   */

  useEffect(() => {
    /*
     * 로그인하지 않은 경우
     */

    if (!isLoggedIn || !currentUserId) {
      alert("로그인 후 질의응답을 확인할 수 있습니다.");

      navigate("/login");

      return;
    }

    /*
     * 상세 API 호출
     */

    const fetchQnaDetail = async () => {
      /* 비동기 마이크로태스크로 실행을 미루어 동기적 상태 업데이트 경고를 방지 */
      await Promise.resolve();

      /*
       * URL의 게시글 ID 확인
       */

      const qnaId = Number(id);

      if (!id || Number.isNaN(qnaId)) {
        setErrorMessage("잘못된 질의응답 게시글입니다.");

        setLoading(false);

        return;
      }

      try {
        setLoading(true);

        setErrorMessage("");

        console.log("=================================");

        console.log("Q&A 상세 조회 시작");

        console.log("게시글 ID:", qnaId);

        console.log("요청 URL:", `${BACKEND_URL}/api/qnas/${qnaId}`);

        console.log("현재 로그인 사용자 ID:", currentUserId);

        console.log("관리자 여부:", isAdmin);

        console.log("=================================");

        const response = await axios.get<QnaDetailResponse>(
          `${BACKEND_URL}/api/qnas/${qnaId}`,
          {
            /*
             * 쿠키 기반 인증
             */

            withCredentials: true,

            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        const data = response.data;

        console.log("=================================");

        console.log("Q&A 상세 조회 성공");

        console.log("응답 상태:", response.status);

        console.log("상세 게시글:", data);

        console.log("게시글 작성자 ID:", data.writerLoginId);

        console.log("현재 로그인 사용자 ID:", currentUserId);

        console.log("내 게시글 여부:", data.writerLoginId === currentUserId);

        console.log("관리자 여부:", isAdmin);

        console.log("=================================");

        /*
         * 백엔드 응답 확인
         */

        if (!data || !data.id) {
          setPost(null);

          setErrorMessage("게시글 정보를 확인할 수 없습니다.");

          return;
        }

        /*
         * 작성자 본인 또는 관리자만 확인 가능
         *
         * 목록에서도 동일한 기준을 사용한다.
         */

        const writerLoginId = data.writerLoginId ?? data.userId ?? "";

        const isMyPost = writerLoginId === currentUserId;

        console.log("=================================");

        console.log("Q&A 상세 접근 권한 확인");

        console.log("게시글 ID:", data.id);

        console.log("게시글 제목:", data.title);

        console.log("게시글 작성자:", data.writerName);

        console.log("게시글 작성자 ID:", writerLoginId);

        console.log("현재 로그인 사용자 ID:", currentUserId);

        console.log("내 게시글 여부:", isMyPost);

        console.log("관리자 여부:", isAdmin);

        console.log("=================================");

        /*
         * 본인 글이 아니고 관리자도 아닌 경우
         */

        if (!isAdmin && !isMyPost) {
          alert("작성자 본인 또는 관리자만 확인할 수 있습니다.");

          navigate("/qna");

          return;
        }

        /*
         * 상세 게시글 저장
         */

        setPost(data);
      } catch (error) {
        console.error("=================================");

        console.error("Q&A 상세 조회 실패");

        if (axios.isAxiosError(error)) {
          console.error("HTTP 상태:", error.response?.status);

          console.error("백엔드 응답:", error.response?.data);

          console.error("요청 URL:", error.config?.url);
        } else {
          console.error(error);
        }

        console.error("=================================");

        /*
         * 401
         */

        if (axios.isAxiosError(error) && error.response?.status === 401) {
          alert("로그인 정보가 만료되었습니다. 다시 로그인해주세요.");

          localStorage.removeItem("loginUser");

          localStorage.removeItem("accessToken");

          navigate("/login");

          return;
        }

        /*
         * 403
         */

        if (axios.isAxiosError(error) && error.response?.status === 403) {
          alert("이 게시글을 확인할 권한이 없습니다.");

          navigate("/qna");

          return;
        }

        /*
         * 404
         */

        if (axios.isAxiosError(error) && error.response?.status === 404) {
          setErrorMessage("존재하지 않는 질의응답 게시글입니다.");

          return;
        }

        /*
         * 500
         */

        if (axios.isAxiosError(error) && error.response?.status === 500) {
          setErrorMessage(
            "서버에서 질의응답 상세 정보를 불러오는 중 오류가 발생했습니다.",
          );

          return;
        }

        setErrorMessage(
          "질의응답 상세 정보를 불러오는 중 오류가 발생했습니다.",
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchQnaDetail();
  }, [id, navigate, currentUserId, isAdmin, isLoggedIn]);

  /*
   * 로그아웃
   */

  const handleLogout = () => {
    localStorage.removeItem("accessToken");

    localStorage.removeItem("loginUser");

    localStorage.removeItem("user");

    navigate("/");
  };

  /*
   * 목록으로
   */

  const handleGoList = () => {
    navigate("/qna");
  };

  /*
   * 수정 페이지 이동
   */

  const handleEdit = () => {
    if (!post) {
      return;
    }

    navigate(`/qna/${post.id}/edit`);
  };

  /*
   * 삭제
   *
   * DELETE /api/qnas/{id}
   */

  const handleDelete = async () => {
    if (!post) {
      return;
    }

    const confirmed = window.confirm("이 질의응답 게시글을 삭제하시겠습니까?");

    if (!confirmed) {
      return;
    }

    try {
      console.log("Q&A 삭제 요청:", post.id);

      await axios.delete(`${BACKEND_URL}/api/qnas/${post.id}`, {
        withCredentials: true,
      });

      alert("질의응답이 삭제되었습니다.");

      navigate("/qna");
    } catch (error) {
      console.error("Q&A 삭제 실패:", error);

      if (axios.isAxiosError(error)) {
        console.error("HTTP 상태:", error.response?.status);

        console.error("백엔드 응답:", error.response?.data);

        /*
         * 인증 만료
         */

        if (error.response?.status === 401) {
          alert("로그인 정보가 만료되었습니다. 다시 로그인해주세요.");

          localStorage.removeItem("loginUser");

          localStorage.removeItem("accessToken");

          navigate("/login");

          return;
        }

        /*
         * 권한 없음
         */

        if (error.response?.status === 403) {
          alert("게시글을 삭제할 권한이 없습니다.");

          return;
        }

        /*
         * API 없음
         */

        if (error.response?.status === 404) {
          alert("게시글 삭제 API를 찾을 수 없습니다.");

          return;
        }
      }

      alert("질의응답 삭제에 실패했습니다.");
    }
  };

  /*
   * 로딩
   */

  if (loading) {
    return (
      <div className={styles.page}>
        <main className={styles.container}>
          <section className={styles.emptyState}>
            <p>게시글을 불러오는 중입니다.</p>
          </section>
        </main>
      </div>
    );
  }

  /*
   * 오류
   */

  if (errorMessage) {
    return (
      <div className={styles.page}>
        <main className={styles.container}>
          <section className={styles.emptyState}>
            <div className={styles.emptyIcon}>⚠️</div>

            <h1>게시글을 불러올 수 없습니다.</h1>

            <p>{errorMessage}</p>

            <button
              type="button"
              className={styles.listButton}
              onClick={handleGoList}
            >
              목록으로
            </button>
          </section>
        </main>
      </div>
    );
  }

  /*
   * 게시글 없음
   */

  if (!post) {
    return (
      <div className={styles.page}>
        <main className={styles.container}>
          <section className={styles.emptyState}>
            <div className={styles.emptyIcon}>📄</div>

            <h1>게시글을 찾을 수 없습니다.</h1>

            <p>요청하신 질의응답 게시글이 존재하지 않거나 삭제되었습니다.</p>

            <button
              type="button"
              className={styles.listButton}
              onClick={handleGoList}
            >
              목록으로
            </button>
          </section>
        </main>
      </div>
    );
  }

  /*
   * 게시글 작성자 ID
   *
   * 목록 API와 상세 API의 응답 차이를 고려한다.
   */

  const writerLoginId = post.writerLoginId ?? post.userId ?? "";

  /*
   * 본인 게시글 여부
   */

  const isMyPost = writerLoginId === currentUserId;

  /*
   * 답변 여부
   */

  const hasAnswer = Boolean(
    post.answerContent && post.answerContent.trim() !== "",
  );

  /*
   * 첨부파일
   */

  const attachments =
    post.attachments && Array.isArray(post.attachments) ? post.attachments : [];

  /*
   * 로그인 상태
   */

  return (
    <div className={styles.page}>
      {/* 사용자 영역 */}

      <div className={styles.topUserBar}>
        <div className={styles.topUserInner}>
          <div className={styles.userArea}>
            <span className={styles.userName}>
              {currentUserName}

              {isAdmin && <span className={styles.adminBadge}>관리자</span>}
            </span>

            <button
              type="button"
              className={styles.logoutButton}
              onClick={handleLogout}
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>

      {/* Header */}

      <header className={styles.mainHeader}>
        <div className={styles.headerInner}>
          {/* 로고 */}

          <button
            type="button"
            className={styles.logo}
            onClick={() => navigate("/")}
            aria-label="싸농 홈으로 이동"
          >
            싸농
          </button>

          {/* 메인 메뉴 */}

          <nav className={styles.mainNav} aria-label="주요 메뉴">
            {/* 홈 */}

            <button
              type="button"
              className={styles.navItem}
              onClick={() => navigate("/")}
            >
              홈
            </button>

            {/* 가격 상세 정보 */}

            <div className={styles.navMenu}>
              <button type="button" className={styles.navItem}>
                가격 상세 정보
              </button>

              <div className={styles.megaMenu}>
                <div className={styles.megaColumn}>
                  <strong>가격정보</strong>

                  <button type="button" onClick={() => navigate("/price")}>
                    품목별 시세 조회
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/price/detail")}
                  >
                    가격 추이 그래프
                  </button>

                  <button type="button" onClick={() => navigate("/price")}>
                    급상승 / 급락 품목
                  </button>
                </div>
              </div>
            </div>

            {/* 자치구별 가격정보 */}

            <div className={styles.navMenu}>
              <button type="button" className={styles.navItem}>
                자치구별 가격정보
              </button>

              <div className={styles.megaMenu}>
                <div className={styles.megaColumn}>
                  <strong>자치구별 지도 비교</strong>

                  <button
                    type="button"
                    onClick={() => navigate("/region-price")}
                  >
                    자치구간 1:1 비교
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/region-price")}
                  >
                    시장 / 마트 유형별 비교
                  </button>
                </div>
              </div>
            </div>

            {/* 스마트 추천 */}

            <div className={styles.navMenu}>
              <button type="button" className={styles.navItem}>
                스마트 추천
              </button>

              <div className={styles.megaMenu}>
                <div className={styles.megaColumn}>
                  <strong>스마트 추천</strong>

                  <button
                    type="button"
                    onClick={() => navigate("/recommendation")}
                  >
                    오늘의 알뜰 장바구니
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/recommendation")}
                  >
                    가격 하락 품목 추천
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/recommendation")}
                  >
                    이달의 제철 농수산물
                  </button>
                </div>
              </div>
            </div>

            {/* 고객센터 */}

            <div className={styles.navMenu}>
              <button type="button" className={styles.navItem}>
                고객센터
              </button>

              <div className={styles.megaMenu}>
                <div className={styles.megaColumn}>
                  <strong>고객센터</strong>

                  <button type="button" onClick={() => navigate("/qna")}>
                    질의응답
                  </button>

                  <button type="button" onClick={() => navigate("/faq")}>
                    자주 묻는 질문
                  </button>
                </div>
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* 본문 */}

      <main className={styles.container}>
        {/* 페이지 제목 */}

        <section className={styles.pageHeader}>
          <div className={styles.headerText}>
            <span className={styles.pageLabel}>질의응답</span>

            <h1>문의 내용</h1>

            <p>싸농 서비스에 등록된 질의응답입니다.</p>
          </div>

          <button
            type="button"
            className={styles.listButton}
            onClick={handleGoList}
          >
            목록으로
          </button>
        </section>

        {/* 게시글 */}

        <article className={styles.detailCard}>
          {/* 제목 */}

          <header className={styles.detailHeader}>
            <h2>{post.title}</h2>

            <div className={styles.meta}>
              <span>
                작성자 <strong>{post.writerName || "사용자"}</strong>
              </span>

              <span>{formatDate(post.createdAt)}</span>

              <span>조회 {post.viewCount ?? 0}</span>
            </div>
          </header>

          {/* 내용 */}

          <div className={styles.content}>
            {post.questionContent || "등록된 문의 내용이 없습니다."}
          </div>

          {/* 첨부파일 */}

          {attachments.length > 0 && (
            <section className={styles.attachmentSection}>
              <div className={styles.attachmentHeader}>
                <strong>첨부파일</strong>

                <span>{attachments.length}개</span>
              </div>

              <ul className={styles.attachmentList}>
                {attachments.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className={styles.attachmentItem}
                  >
                    <div className={styles.attachmentInformation}>
                      <span className={styles.attachmentIcon}>📎</span>

                      <div className={styles.attachmentText}>
                        <span
                          className={styles.attachmentName}
                          title={file.name}
                        >
                          {file.name}
                        </span>

                        <span className={styles.attachmentSize}>
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                    </div>

                    <span className={styles.attachmentStatus}>첨부됨</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 답변 */}

          {hasAnswer && (
            <section className={styles.answerSection}>
              <div className={styles.answerHeader}>
                <div>
                  <span className={styles.answerLabel}>답변</span>

                  <strong>{post.answerWriterName || "관리자"}</strong>
                </div>

                {post.answeredAt && <span>{formatDate(post.answeredAt)}</span>}
              </div>

              <div className={styles.answerContent}>{post.answerContent}</div>
            </section>
          )}

          {/* 미답변 */}

          {!hasAnswer && (
            <section className={styles.waitingSection}>
              <span className={styles.waitingIcon}>💬</span>

              <div>
                <strong>답변을 준비 중입니다.</strong>

                <p>관리자가 문의 내용을 확인한 후 답변을 등록합니다.</p>
              </div>
            </section>
          )}

          {/* 버튼 */}

          <div className={styles.buttonArea}>
            <button
              type="button"
              className={styles.listButton}
              onClick={handleGoList}
            >
              목록으로
            </button>

            {isMyPost && (
              <>
                <button
                  type="button"
                  className={styles.editButton}
                  onClick={handleEdit}
                >
                  수정
                </button>

                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => void handleDelete()}
                >
                  삭제
                </button>
              </>
            )}
          </div>
        </article>
      </main>
    </div>
  );
}

export default QnaDetailPage;
