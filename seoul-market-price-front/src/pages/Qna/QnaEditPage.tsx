import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

import styles from "./QnaEditPage.module.css";

/* 백엔드 서버 주소 */
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8081";

/* Q&A 상세 응답 */
interface QnaDetailResponse {
  id: number;
  writerLoginId?: string;
  writerName?: string;
  title: string;
  questionContent?: string;
  answerContent?: string;
  answerAdminName?: string;
  answerStatus?: string | number;
  attachName?: string;
  attachPath?: string;
  viewCount?: number;
  publicQuestion?: boolean;
  createdAt?: string;
  updatedAt?: string;
  answeredAt?: string;
}

/* 로그인 사용자 */
interface LoginUser {
  userId?: string;
  name?: string;
  userName?: string;
  role?: string;
}

/* 첨부파일 최대 용량 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/* 허용 확장자 */
const ALLOWED_FILE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "hwp",
  "hwpx",
  "txt",
];

/* 로그인 사용자 정보 */
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

/* 로그인 사용자 ID */
const getCurrentUserId = (): string => {
  const user = getLoginUser();

  if (!user) {
    return "";
  }

  return user.userId || "";
};

/* 로그인 사용자 이름 */
const getCurrentUserName = (): string => {
  const user = getLoginUser();

  if (!user) {
    return "사용자";
  }

  return user.name || user.userName || user.userId || "사용자";
};

/* 관리자 여부 */
const isAdminUser = (): boolean => {
  const user = getLoginUser();

  if (!user?.role) {
    return false;
  }

  const role = user.role.toUpperCase();

  return role === "ADMIN" || role === "ROLE_ADMIN";
};

/* 파일 용량 표시 */
const formatFileSize = (size: number): string => {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

/* 파일 확장자 확인 */
const getFileExtension = (fileName: string): string => {
  const lastDotIndex = fileName.lastIndexOf(".");

  if (lastDotIndex === -1) {
    return "";
  }

  return fileName.slice(lastDotIndex + 1).toLowerCase();
};

/* Q&A 수정 페이지 */
function QnaEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  /* 파일 input 참조 */
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* 로그인 상태 */
  const isLoggedIn = Boolean(localStorage.getItem("loginUser"));

  /* 현재 로그인 사용자 */
  const currentUser = useMemo(() => {
    return getLoginUser();
  }, []);

  /* 현재 로그인 사용자 ID */
  const currentUserId = useMemo(() => {
    return getCurrentUserId();
  }, []);

  /* 관리자 여부 */
  const isAdmin = useMemo(() => {
    return isAdminUser();
  }, []);

  /* 게시글 */
  const [post, setPost] = useState<QnaDetailResponse | null>(null);

  /* 오류 메시지 */
  const [errorMessage, setErrorMessage] = useState("");

  /* 수정 Form */
  const [form, setForm] = useState({
    title: "",
    content: "",
    publicQuestion: true,
  });

  /* 기존 첨부파일 */
  const [currentAttachment, setCurrentAttachment] = useState<{
    name: string;
    path?: string;
  } | null>(null);

  /* 기존 첨부파일 삭제 여부 */
  const [attachmentDeleted, setAttachmentDeleted] = useState(false);

  /* 새 파일 */
  const [newFile, setNewFile] = useState<File | null>(null);

  /* 새 파일 표시 정보 */
  const [newAttachment, setNewAttachment] = useState<{
    name: string;
    size: number;
    type: string;
  } | null>(null);

  /* 전체 처리 중 */
  const [loading, setLoading] = useState(true);

  /* 작성자 여부 */
  const isAuthor = useMemo(() => {
    if (!post || !currentUserId) {
      return false;
    }

    return post.writerLoginId === currentUserId;
  }, [post, currentUserId]);

  /*
   * 수정 권한
   *
   * 일반 사용자:
   * 본인 게시글만 수정 가능
   *
   * 관리자:
   * 모든 Q&A 게시글 수정 가능
   */
  const canEdit = isAuthor || isAdmin;

  /* Q&A 상세 조회 */
  useEffect(() => {
    const fetchQnaDetail = async () => {
      if (!isLoggedIn || !currentUserId) {
        setLoading(false);
        return;
      }

      const qnaId = Number(id);

      if (!id || Number.isNaN(qnaId)) {
        setErrorMessage("잘못된 질의응답 게시글입니다.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMessage("");

        const response = await axios.get<QnaDetailResponse>(
          `${BACKEND_URL}/api/qnas/${qnaId}`,
          {
            withCredentials: true,
          },
        );

        const data = response.data;

        if (!data || !data.id) {
          setErrorMessage("게시글 정보를 확인할 수 없습니다.");
          return;
        }

        /*
         * 일반 사용자는 본인 게시글만 수정 가능
         * 관리자는 모든 게시글 수정 가능
         */
        const writerLoginId = data.writerLoginId ?? "";

        if (writerLoginId !== currentUserId && !isAdmin) {
          alert("본인이 작성한 게시글만 수정할 수 있습니다.");

          navigate(`/qna/${data.id}`);

          return;
        }

        setPost(data);

        setForm({
          title: data.title ?? "",
          content: data.questionContent ?? "",
          publicQuestion: data.publicQuestion ?? true,
        });

        /* 기존 첨부파일 */
        if (data.attachName) {
          setCurrentAttachment({
            name: data.attachName,
            path: data.attachPath,
          });
        } else {
          setCurrentAttachment(null);
        }
      } catch (error) {
        console.error("Q&A 상세 조회 실패:", error);

        if (axios.isAxiosError(error)) {
          console.error("상태:", error.response?.status);
          console.error("응답:", error.response?.data);
        }

        setErrorMessage("게시글 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    void fetchQnaDetail();
  }, [id, navigate, currentUserId, isAdmin, isLoggedIn]);

  /* 입력값 변경 */
  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* 공개 여부 변경 */
  const handlePublicQuestionChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setForm((prev) => ({
      ...prev,
      publicQuestion: event.target.checked,
    }));
  };

  /*
   * 첨부파일 선택
   *
   * 현재 백엔드 QnaUpdateRequest에는
   * MultipartFile 필드가 없으므로
   * 실제 서버 업로드는 처리하지 않는다.
   *
   * 선택된 파일은 화면에서만 관리하고,
   * 실제 서버 반영은 별도 파일 업로드 API가 필요하다.
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    /* 파일 용량 확인 */
    if (file.size > MAX_FILE_SIZE) {
      alert("첨부파일은 최대 10MB까지 등록할 수 있습니다.");

      event.target.value = "";

      return;
    }

    /* 파일 확장자 확인 */
    const extension = getFileExtension(file.name);

    if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
      alert(
        "첨부할 수 없는 파일 형식입니다.\n\n" +
          "허용 파일: JPG, PNG, GIF, WEBP, PDF, DOC, DOCX, XLS, XLSX, HWP, HWPX, TXT",
      );

      event.target.value = "";

      return;
    }

    setNewFile(file);

    setNewAttachment({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    /*
     * 새 파일을 선택하면
     * 기존 파일을 교체하는 것으로 처리한다.
     */
    setAttachmentDeleted(true);

    event.target.value = "";
  };

  /* 첨부파일 선택창 열기 */
  const handleFileSelect = () => {
    if (loading) {
      return;
    }

    fileInputRef.current?.click();
  };

  /* 기존 첨부파일 삭제 */
  const handleCurrentAttachmentDelete = () => {
    if (loading) {
      return;
    }

    const deleteConfirm = window.confirm("현재 첨부파일을 삭제하시겠습니까?");

    if (!deleteConfirm) {
      return;
    }

    setCurrentAttachment(null);
    setAttachmentDeleted(true);
    setNewFile(null);
    setNewAttachment(null);
  };

  /* 새 첨부파일 삭제 */
  const handleNewAttachmentDelete = () => {
    if (loading) {
      return;
    }

    setNewFile(null);
    setNewAttachment(null);

    /*
     * 새 파일을 제거하면
     * 기존 첨부파일을 다시 표시한다.
     */
    if (post?.attachName) {
      setCurrentAttachment({
        name: post.attachName,
        path: post.attachPath,
      });

      setAttachmentDeleted(false);
    } else {
      setCurrentAttachment(null);
      setAttachmentDeleted(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /* 파일 변경 취소 */
  const handleAttachmentChangeCancel = () => {
    if (loading) {
      return;
    }

    setNewFile(null);
    setNewAttachment(null);

    if (post?.attachName) {
      setCurrentAttachment({
        name: post.attachName,
        path: post.attachPath,
      });

      setAttachmentDeleted(false);
    } else {
      setCurrentAttachment(null);
      setAttachmentDeleted(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /* 입력값 검사 */
  const validateForm = (): boolean => {
    if (!form.title.trim()) {
      alert("제목을 입력해주세요.");

      return false;
    }

    /* 백엔드 title 최대 200자 */
    if (form.title.trim().length > 200) {
      alert("제목은 200자 이내로 입력해주세요.");

      return false;
    }

    if (!form.content.trim()) {
      alert("내용을 입력해주세요.");

      return false;
    }

    return true;
  };

  /*
   * Q&A 수정
   *
   * 백엔드 Controller:
   *
   * @PatchMapping("/{id}")
   * public ResponseEntity<QnaDetailResponse> updateQna(
   *      @PathVariable Long id,
   *      @AuthenticationPrincipal CustomUserPrincipal principal,
   *      @Valid @RequestBody QnaUpdateRequest request)
   *
   * 따라서 multipart/form-data가 아니라
   * JSON Body로 전송한다.
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    /* 로그인 확인 */
    if (!isLoggedIn || !currentUser || !currentUserId) {
      alert("로그인 후 이용할 수 있습니다.");

      navigate("/login");

      return;
    }

    /* 게시글 확인 */
    if (!post) {
      alert("게시글을 찾을 수 없습니다.");

      navigate("/qna");

      return;
    }

    /* 수정 권한 확인 */
    if (!canEdit) {
      alert("Q&A를 수정할 권한이 없습니다.");

      navigate(`/qna/${post.id}`);

      return;
    }

    /* 입력값 검사 */
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      /*
       * QnaUpdateRequest와 동일한 구조
       *
       * title
       * questionContent
       * publicQuestion
       * attachName
       * attachPath
       * attachmentChanged
       */
      const requestData = {
        title: form.title.trim(),
        questionContent: form.content.trim(),
        publicQuestion: form.publicQuestion,
        attachName:
          attachmentDeleted && !newFile
            ? null
            : newFile
              ? newFile.name
              : (currentAttachment?.name ?? null),
        attachPath:
          attachmentDeleted && !newFile
            ? null
            : newFile
              ? null
              : (currentAttachment?.path ?? null),
        attachmentChanged: attachmentDeleted || Boolean(newFile),
      };

      console.log("=================================");
      console.log("Q&A 수정 요청 시작");
      console.log("수정 URL:", `${BACKEND_URL}/api/qnas/${post.id}`);
      console.log("수정 데이터:", requestData);
      console.log("작성자:", isAuthor);
      console.log("관리자:", isAdmin);
      console.log("수정 가능:", canEdit);
      console.log("새 첨부파일:", newFile);
      console.log("=================================");

      /*
       * 현재 백엔드 @RequestBody QnaUpdateRequest에 맞춰
       * JSON으로 전송한다.
       */
      const response = await axios.patch<QnaDetailResponse>(
        `${BACKEND_URL}/api/qnas/${post.id}`,
        requestData,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      console.log("=================================");
      console.log("Q&A 수정 성공");
      console.log("응답 상태:", response.status);
      console.log("응답 데이터:", response.data);
      console.log("=================================");

      alert("Q&A가 수정되었습니다.");

      navigate(`/qna/${post.id}`);
    } catch (error) {
      console.error("=================================");
      console.error("Q&A 수정 실패");

      if (axios.isAxiosError(error)) {
        console.error("HTTP 상태:", error.response?.status);
        console.error("백엔드 응답:", error.response?.data);
        console.error("요청 URL:", error.config?.url);
      } else {
        console.error(error);
      }

      console.error("=================================");

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          const responseData = error.response?.data;

          if (typeof responseData === "object" && responseData !== null) {
            const errorResponse = responseData as {
              message?: string;
              error?: string;
            };

            if (errorResponse.message) {
              alert(`Q&A 수정 실패\n\n${errorResponse.message}`);

              return;
            }
          }

          alert("입력한 Q&A 내용을 확인해주세요.");

          return;
        }

        if (error.response?.status === 401) {
          alert("로그인 정보가 만료되었습니다. 다시 로그인해주세요.");

          localStorage.removeItem("loginUser");
          localStorage.removeItem("accessToken");

          navigate("/login");

          return;
        }

        if (error.response?.status === 403) {
          alert("Q&A를 수정할 권한이 없습니다.");

          return;
        }

        if (error.response?.status === 404) {
          alert("수정할 Q&A 게시글을 찾을 수 없습니다.");

          navigate("/qna");

          return;
        }

        if (error.response?.status === 500) {
          alert(
            "서버에서 Q&A 수정 중 오류가 발생했습니다.\n\n" +
              "백엔드 로그를 확인해주세요.",
          );

          return;
        }
      }

      alert("Q&A 수정에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  /* 로그아웃 */
  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("loginUser");
    localStorage.removeItem("user");

    navigate("/");
  };

  /* 로딩 상태 */
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingContainer}>
          <p>게시글 정보를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  /* 오류 상태 */
  if (errorMessage) {
    return (
      <div className={styles.page}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>⚠️</div>

          <h1>오류가 발생했습니다.</h1>

          <p>{errorMessage}</p>

          <div className={styles.loginButtonArea}>
            <button
              type="button"
              className={styles.backButton}
              onClick={() => navigate("/qna")}
            >
              Q&A 목록으로
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* 로그인하지 않은 경우 */
  if (!isLoggedIn || !currentUser || !currentUserId) {
    return (
      <div className={styles.page}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>🔒</div>

          <h1>로그인이 필요합니다.</h1>

          <p>
            Q&A 게시글 수정은
            <br />
            로그인한 회원만 이용할 수 있습니다.
          </p>

          <div className={styles.loginButtonArea}>
            <button
              type="button"
              className={styles.backButton}
              onClick={() => navigate("/qna")}
            >
              Q&A로 돌아가기
            </button>

            <button
              type="button"
              className={styles.loginButton}
              onClick={() => navigate("/login")}
            >
              로그인하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* 게시글이 없는 경우 */
  if (!post) {
    return (
      <div className={styles.page}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>❓</div>

          <h1>게시글을 찾을 수 없습니다.</h1>

          <p>삭제되었거나 존재하지 않는 게시글입니다.</p>

          <div className={styles.loginButtonArea}>
            <button
              type="button"
              className={styles.backButton}
              onClick={() => navigate("/qna")}
            >
              Q&A 목록으로
            </button>
          </div>
        </div>
      </div>
    );
  }

  /*
   * 수정 권한이 없는 경우
   *
   * 일반 사용자는 본인 게시글만 수정 가능
   * 관리자는 모든 게시글 수정 가능
   */
  if (!canEdit) {
    return (
      <div className={styles.page}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>🔒</div>

          <h1>수정할 수 없는 게시글입니다.</h1>

          <p>
            본인이 작성한 Q&A 게시글만
            <br />
            수정할 수 있습니다.
          </p>

          <div className={styles.loginButtonArea}>
            <button
              type="button"
              className={styles.backButton}
              onClick={() => navigate(`/qna/${post.id}`)}
            >
              게시글로 돌아가기
            </button>

            <button
              type="button"
              className={styles.loginButton}
              onClick={() => navigate("/qna")}
            >
              Q&A 목록으로
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* 게시글 수정 화면 */
  return (
    <div className={styles.page}>
      {/* 사용자 영역 */}
      <div className={styles.userArea}>
        <span>
          {getCurrentUserName()}
          {isAdmin && " (관리자)"}
        </span>

        <button
          type="button"
          className={styles.logoutButton}
          onClick={handleLogout}
        >
          로그아웃
        </button>
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

                  <button type="button" onClick={() => navigate("/board")}>
                    공지사항
                  </button>

                  <button type="button" onClick={() => navigate("/qna")}>
                    Q&A
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
            <span className={styles.pageLabel}>Q&A</span>

            <h1>문의 수정</h1>

            <p>
              {isAdmin
                ? "관리자 권한으로 문의 내용을 수정할 수 있습니다."
                : "작성하신 문의 내용을 수정해주세요."}
            </p>
          </div>

          <button
            type="button"
            className={styles.listButton}
            onClick={() => navigate(`/qna/${post.id}`)}
            disabled={loading}
          >
            돌아가기
          </button>
        </section>

        {/* 수정 Form */}
        <form className={styles.form} onSubmit={handleSubmit}>
          {/* 작성자 */}
          <div className={styles.formGroup}>
            <label htmlFor="author">작성자</label>

            <input
              id="author"
              type="text"
              value={post.writerName || "사용자"}
              disabled
            />

            <small>
              {isAdmin
                ? "관리자는 작성자를 변경할 수 없습니다."
                : "작성자는 변경할 수 없습니다."}
            </small>
          </div>

          {/* 제목 */}
          <div className={styles.formGroup}>
            <label htmlFor="title">
              제목 <span>*</span>
            </label>

            <input
              id="title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              placeholder="문의 제목을 입력해주세요."
              maxLength={200}
              disabled={loading}
            />

            <small>최대 200자까지 입력할 수 있습니다.</small>
          </div>

          {/* 내용 */}
          <div className={styles.formGroup}>
            <label htmlFor="content">
              내용 <span>*</span>
            </label>

            <textarea
              id="content"
              name="content"
              value={form.content}
              onChange={handleChange}
              placeholder="문의 내용을 입력해주세요."
              rows={12}
              disabled={loading}
            />

            <small>질문 내용을 입력해주세요.</small>
          </div>

          {/* 공개 여부 */}
          <div className={styles.formGroup}>
            <label htmlFor="publicQuestion">공개 여부</label>

            <label>
              <input
                id="publicQuestion"
                type="checkbox"
                checked={form.publicQuestion}
                onChange={handlePublicQuestionChange}
                disabled={loading}
              />
              공개 질문
            </label>

            <small>공개된 질문은 비로그인 사용자도 조회할 수 있습니다.</small>
          </div>

          {/* 첨부파일 */}
          <div className={styles.formGroup}>
            <label htmlFor="attachment">첨부파일</label>

            <input
              ref={fileInputRef}
              id="attachment"
              type="file"
              className={styles.fileInput}
              onChange={handleFileChange}
              disabled={loading}
            />

            {/* 기존 첨부파일 */}
            {currentAttachment && !attachmentDeleted && !newAttachment && (
              <div className={styles.attachmentBox}>
                <div className={styles.attachmentInfo}>
                  <span className={styles.attachmentIcon}>📎</span>

                  <div className={styles.attachmentText}>
                    <strong>{currentAttachment.name}</strong>

                    <span>기존 첨부파일</span>
                  </div>
                </div>

                <div className={styles.attachmentActions}>
                  <button
                    type="button"
                    className={styles.changeFileButton}
                    onClick={handleFileSelect}
                    disabled={loading}
                  >
                    변경
                  </button>

                  <button
                    type="button"
                    className={styles.removeFileButton}
                    onClick={handleCurrentAttachmentDelete}
                    disabled={loading}
                  >
                    삭제
                  </button>
                </div>
              </div>
            )}

            {/* 기존 파일 삭제 상태 */}
            {attachmentDeleted && !newAttachment && (
              <div className={styles.attachmentEmpty}>
                <span>첨부파일이 삭제됩니다.</span>

                <button
                  type="button"
                  className={styles.changeFileButton}
                  onClick={handleFileSelect}
                  disabled={loading}
                >
                  새 파일 선택
                </button>
              </div>
            )}

            {/* 새 파일 */}
            {newAttachment && (
              <div className={styles.attachmentBox}>
                <div className={styles.attachmentInfo}>
                  <span className={styles.attachmentIcon}>📎</span>

                  <div className={styles.attachmentText}>
                    <strong>{newAttachment.name}</strong>

                    <span>
                      {formatFileSize(newAttachment.size)}
                      {" · "}새 첨부파일
                    </span>
                  </div>
                </div>

                <div className={styles.attachmentActions}>
                  <button
                    type="button"
                    className={styles.changeFileButton}
                    onClick={handleFileSelect}
                    disabled={loading}
                  >
                    다시 변경
                  </button>

                  <button
                    type="button"
                    className={styles.removeFileButton}
                    onClick={handleNewAttachmentDelete}
                    disabled={loading}
                  >
                    삭제
                  </button>
                </div>
              </div>
            )}

            {/* 첨부파일이 없는 경우 */}
            {!currentAttachment && !newAttachment && !attachmentDeleted && (
              <div className={styles.attachmentEmpty}>
                <span>첨부된 파일이 없습니다.</span>

                <button
                  type="button"
                  className={styles.changeFileButton}
                  onClick={handleFileSelect}
                  disabled={loading}
                >
                  파일 선택
                </button>
              </div>
            )}

            <small>
              최대 10MB까지 선택할 수 있습니다.
              <br />
              JPG, PNG, GIF, WEBP, PDF, DOC, DOCX, XLS, XLSX, HWP, HWPX, TXT
              파일을 지원합니다.
            </small>

            {/* 새 파일 변경 취소 */}
            {newAttachment && currentAttachment && (
              <button
                type="button"
                className={styles.cancelFileChangeButton}
                onClick={handleAttachmentChangeCancel}
                disabled={loading}
              >
                기존 첨부파일로 되돌리기
              </button>
            )}

            <small>
              현재 백엔드 수정 API는 첨부파일 자체를 업로드하는 Multipart 요청이
              아니라 첨부파일 메타데이터만 수정하도록 구성되어 있습니다.
            </small>
          </div>

          {/* 안내 문구 */}
          <div className={styles.notice}>
            <span>💡</span>

            <p>
              {isAdmin
                ? "관리자는 모든 Q&A 게시글을 수정할 수 있습니다."
                : "본인이 작성한 게시글만 수정할 수 있습니다."}
            </p>
          </div>

          {/* 버튼 */}
          <div className={styles.buttonArea}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => navigate(`/qna/${post.id}`)}
              disabled={loading}
            >
              취소
            </button>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? "수정 중..." : "수정하기"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default QnaEditPage;
