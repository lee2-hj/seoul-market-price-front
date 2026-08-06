import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import styles from "./QnaEditPage.module.css";

/* Q&A 첨부파일 */

interface QnaAttachment {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

/* Q&A 수정 Form */

interface QnaForm {
  title: string;
  content: string;
}

/* Q&A 게시글 */

interface QnaPost {
  id: number;
  authorId: string;
  author: string;
  title: string;
  content: string;
  date: string;
  views: number;

  /* 첨부파일 */

  attachment?: QnaAttachment | null;
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

/* Q&A 게시글 조회 */

const getPosts = (): QnaPost[] => {
  const storedPosts = localStorage.getItem("qnaPosts");

  if (!storedPosts) {
    return [];
  }

  try {
    const parsedPosts: unknown = JSON.parse(storedPosts);

    if (!Array.isArray(parsedPosts)) {
      return [];
    }

    return parsedPosts as QnaPost[];
  } catch (error) {
    console.error("Q&A 게시글 불러오기 실패:", error);

    return [];
  }
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

/* 파일을 Base64 Data URL로 변환 */

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("파일 데이터를 읽을 수 없습니다."));
      }
    };

    reader.onerror = () => {
      reject(new Error("파일을 읽는 중 오류가 발생했습니다."));
    };

    reader.readAsDataURL(file);
  });
};

/* Q&A Edit Page */

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

  /* 게시글 조회 */

  const post = useMemo(() => {
    const posts = getPosts();

    return posts.find((item) => item.id === Number(id)) ?? null;
  }, [id]);

  /* 작성자 여부 */

  const isAuthor = useMemo(() => {
    if (!post || !currentUserId) {
      return false;
    }

    return post.authorId === currentUserId;
  }, [post, currentUserId]);

  /* 수정 권한 */

  const canEdit = isAuthor;

  /* 작성 Form */

  const [form, setForm] = useState<QnaForm>(() => ({
    title: post?.title ?? "",
    content: post?.content ?? "",
  }));

  /* 기존 첨부파일 */

  const [currentAttachment, setCurrentAttachment] =
    useState<QnaAttachment | null>(() => {
      return post?.attachment ?? null;
    });

  /* 기존 첨부파일 삭제 여부 */

  const [attachmentDeleted, setAttachmentDeleted] = useState(false);

  /* 새 첨부파일 */

  const [newAttachment, setNewAttachment] = useState<QnaAttachment | null>(
    null,
  );

  /* 첨부파일 처리 중 */

  const [fileLoading, setFileLoading] = useState(false);

  /* 전체 수정 처리 중 */

  const [loading, setLoading] = useState(false);

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

  /* 첨부파일 선택 */

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
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

    try {
      setFileLoading(true);

      const dataUrl = await readFileAsDataUrl(file);

      const attachment: QnaAttachment = {
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl,
      };

      /* 새 파일 저장 */

      setNewAttachment(attachment);

      /* 새 파일을 선택하면 기존 파일 삭제 상태 해제 */

      setAttachmentDeleted(false);
    } catch (error) {
      console.error("첨부파일 읽기 실패:", error);

      alert("첨부파일을 읽을 수 없습니다. 다시 선택해주세요.");
    } finally {
      setFileLoading(false);

      event.target.value = "";
    }
  };

  /* 첨부파일 선택창 열기 */

  const handleFileSelect = () => {
    if (loading || fileLoading) {
      return;
    }

    fileInputRef.current?.click();
  };

  /* 기존 첨부파일 삭제 */

  const handleCurrentAttachmentDelete = () => {
    if (loading || fileLoading) {
      return;
    }

    const deleteConfirm = window.confirm("현재 첨부파일을 삭제하시겠습니까?");

    if (!deleteConfirm) {
      return;
    }

    setCurrentAttachment(null);
    setAttachmentDeleted(true);
  };

  /* 새 첨부파일 삭제 */

  const handleNewAttachmentDelete = () => {
    if (loading || fileLoading) {
      return;
    }

    setNewAttachment(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /* 파일 변경 취소 */

  const handleAttachmentChangeCancel = () => {
    if (loading || fileLoading) {
      return;
    }

    setNewAttachment(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /* 현재 최종 첨부파일 */

  const finalAttachment = newAttachment
    ? newAttachment
    : attachmentDeleted
      ? null
      : currentAttachment;

  /* 입력값 검사 */

  const validateForm = (): boolean => {
    if (!form.title.trim()) {
      alert("제목을 입력해주세요.");
      return false;
    }

    if (form.title.trim().length > 100) {
      alert("제목은 100자 이내로 입력해주세요.");
      return false;
    }

    if (!form.content.trim()) {
      alert("내용을 입력해주세요.");
      return false;
    }

    if (form.content.trim().length > 5000) {
      alert("내용은 5,000자 이내로 입력해주세요.");
      return false;
    }

    return true;
  };

  /* 게시글 수정 */

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
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
      if (isAdmin) {
        alert("관리자는 현재 다른 회원의 게시글을 수정할 수 없습니다.");
      } else {
        alert("본인이 작성한 게시글만 수정할 수 있습니다.");
      }

      navigate(`/qna/${post.id}`);
      return;
    }

    /* 입력값 검사 */

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      /* 최신 게시글 다시 조회 */

      const posts = getPosts();

      const targetPost = posts.find((item) => item.id === Number(id));

      /* 게시글이 삭제된 경우 */

      if (!targetPost) {
        alert("게시글을 찾을 수 없습니다.");
        navigate("/qna");
        return;
      }

      /* 수정 직전 작성자 확인 */

      const targetIsAuthor = targetPost.authorId === currentUserId;

      if (!targetIsAuthor) {
        alert("본인이 작성한 게시글만 수정할 수 있습니다.");
        navigate(`/qna/${targetPost.id}`);
        return;
      }

      /* 게시글 수정 */

      const updatedPosts = posts.map((item) => {
        if (item.id !== targetPost.id) {
          return item;
        }

        return {
          ...item,

          /* 작성자 정보 유지 */

          authorId: item.authorId,
          author: item.author,

          /* 수정 내용 */

          title: form.title.trim(),
          content: form.content.trim(),

          /* 기존 정보 유지 */

          date: item.date,
          views: item.views,

          /* 첨부파일 수정 */

          attachment: finalAttachment,
        };
      });

      /* localStorage 저장 */

      localStorage.setItem("qnaPosts", JSON.stringify(updatedPosts));

      alert("Q&A가 수정되었습니다.");

      /* 상세 페이지 이동 */

      navigate(`/qna/${targetPost.id}`);
    } catch (error) {
      console.error("Q&A 수정 실패:", error);

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

  /* 로그인하지 않은 경우 */

  if (!isLoggedIn || !currentUser || !currentUserId) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loginRequired}>
            <div className={styles.loginIcon}>🔒</div>

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
      </div>
    );
  }

  /* 게시글이 없는 경우 */

  if (!post) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loginRequired}>
            <div className={styles.loginIcon}>❓</div>

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
      </div>
    );
  }

  /* 다른 사용자가 직접 URL 접근한 경우 */

  if (!isAuthor) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loginRequired}>
            <div className={styles.loginIcon}>🔒</div>

            <h1>수정할 수 없는 게시글입니다.</h1>

            <p>
              {isAdmin ? (
                <>
                  관리자는 다른 회원의 게시글을
                  <br />
                  현재 수정할 수 없습니다.
                </>
              ) : (
                <>
                  본인이 작성한 Q&A 게시글만
                  <br />
                  수정할 수 있습니다.
                </>
              )}
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
      </div>
    );
  }

  /* 게시글 수정 화면 */

  return (
    <div className={styles.page}>
      {/* 사용자 영역 */}

      <div className={styles.topUserBar}>
        <div className={styles.topUserInner}>
          <div className={styles.userArea}>
            <span className={styles.userName}>
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

            <p>작성하신 문의 내용을 수정해주세요.</p>
          </div>

          <button
            type="button"
            className={styles.listButton}
            onClick={() => navigate(`/qna/${post.id}`)}
            disabled={loading || fileLoading}
          >
            돌아가기
          </button>
        </section>

        {/* 수정 Form */}

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* 작성자 */}

          <div className={styles.formGroup}>
            <label htmlFor="author">작성자</label>

            <input id="author" type="text" value={post.author} disabled />

            <small>작성자는 변경할 수 없습니다.</small>
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
              maxLength={100}
              disabled={loading || fileLoading}
            />

            <small>최대 100자까지 입력할 수 있습니다.</small>
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
              maxLength={5000}
              disabled={loading || fileLoading}
            />

            <small>최대 5,000자까지 입력할 수 있습니다.</small>
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
              disabled={loading || fileLoading}
            />

            {/* 기존 첨부파일 */}

            {currentAttachment && !attachmentDeleted && !newAttachment && (
              <div className={styles.attachmentBox}>
                <div className={styles.attachmentInfo}>
                  <span className={styles.attachmentIcon}>📎</span>

                  <div className={styles.attachmentText}>
                    <strong>{currentAttachment.name}</strong>

                    <span>{formatFileSize(currentAttachment.size)}</span>
                  </div>
                </div>

                <div className={styles.attachmentActions}>
                  <button
                    type="button"
                    className={styles.changeFileButton}
                    onClick={handleFileSelect}
                    disabled={loading || fileLoading}
                  >
                    변경
                  </button>

                  <button
                    type="button"
                    className={styles.removeFileButton}
                    onClick={handleCurrentAttachmentDelete}
                    disabled={loading || fileLoading}
                  >
                    삭제
                  </button>
                </div>
              </div>
            )}

            {/* 기존 파일이 삭제된 상태 */}

            {attachmentDeleted && !newAttachment && (
              <div className={styles.attachmentEmpty}>
                <span>첨부파일이 삭제됩니다.</span>

                <button
                  type="button"
                  className={styles.changeFileButton}
                  onClick={handleFileSelect}
                  disabled={loading || fileLoading}
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
                    disabled={loading || fileLoading}
                  >
                    다시 변경
                  </button>

                  <button
                    type="button"
                    className={styles.removeFileButton}
                    onClick={handleNewAttachmentDelete}
                    disabled={loading || fileLoading}
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
                  disabled={loading || fileLoading}
                >
                  파일 선택
                </button>
              </div>
            )}

            {/* 파일 읽는 중 */}

            {fileLoading && <small>첨부파일을 불러오는 중입니다...</small>}

            {!fileLoading && (
              <small>
                최대 10MB까지 첨부할 수 있습니다.
                <br />
                JPG, PNG, GIF, WEBP, PDF, DOC, DOCX, XLS, XLSX, HWP, HWPX, TXT
                파일을 지원합니다.
              </small>
            )}

            {/* 새 파일 변경 취소 */}

            {newAttachment && currentAttachment && (
              <button
                type="button"
                className={styles.cancelFileChangeButton}
                onClick={handleAttachmentChangeCancel}
                disabled={loading || fileLoading}
              >
                기존 첨부파일로 되돌리기
              </button>
            )}
          </div>

          {/* 안내 문구 */}

          <div className={styles.notice}>
            <span>💡</span>

            <p>
              본인이 작성한 게시글만 수정할 수 있습니다.
              {isAdmin &&
                " 관리자는 모든 Q&A 게시글을 조회하고 삭제할 수 있습니다."}
            </p>
          </div>

          {/* 버튼 */}

          <div className={styles.buttonArea}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => navigate(`/qna/${post.id}`)}
              disabled={loading || fileLoading}
            >
              취소
            </button>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading || fileLoading}
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
