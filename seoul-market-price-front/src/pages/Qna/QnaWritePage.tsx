import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import styles from "./QnaWritePage.module.css";

/* 질의응답 작성 폼 */

interface QnaForm {
  title: string;
  content: string;
}

/* 첨부파일 정보 */

interface QnaAttachment {
  name: string;
  size: number;
}

/* 질의응답 게시글 */

interface QnaPost {
  id: number;

  /* 질문 정보 */

  author: string;
  authorId: string;
  title: string;
  content: string;
  date: string;
  views: number;

  /* 첨부파일 */

  attachments?: QnaAttachment[];

  /* 답변 정보 */

  answer: string;
  answerAuthor?: string;
  answerAuthorId?: string;
  answerDate?: string;
}

/* 로그인 사용자 */

interface LoginUser {
  userId?: string;
  name?: string;
  userName?: string;
  role?: string;
}

/* 첨부파일 제한 */

const MAX_FILE_COUNT = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/* 허용 확장자 */

const ALLOWED_FILE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "pdf"];

/* 로그인 사용자 조회 */

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

/* 로그인 사용자 이름 */

const getLoginUserName = (user: LoginUser | null): string => {
  if (!user) {
    return "사용자";
  }

  return user.name || user.userName || user.userId || "사용자";
};

/* 관리자 여부 */

const isAdminUser = (user: LoginUser | null): boolean => {
  if (!user?.role) {
    return false;
  }

  const role = user.role.toUpperCase();

  return role === "ADMIN" || role === "ROLE_ADMIN";
};

/* 현재 날짜 */

const getCurrentDate = (): string => {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join(".");
};

/* 파일 크기 표시 */

const formatFileSize = (size: number): string => {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

/* 파일 확장자 조회 */

const getFileExtension = (fileName: string): string => {
  const lastDotIndex = fileName.lastIndexOf(".");

  if (lastDotIndex === -1) {
    return "";
  }

  return fileName.slice(lastDotIndex + 1).toLowerCase();
};

/* 기존 질의응답 게시글 조회 */

const getStoredPosts = (): QnaPost[] => {
  const storedPosts = localStorage.getItem("qnaPosts");

  if (!storedPosts) {
    return [];
  }

  try {
    const parsedPosts: unknown = JSON.parse(storedPosts);

    if (!Array.isArray(parsedPosts)) {
      return [];
    }

    return parsedPosts.map((post) => {
      const item = post as Partial<QnaPost>;

      return {
        id: item.id ?? 0,

        /* 기존 게시글의 정보를 그대로 유지 */

        author: item.author ?? "사용자",
        authorId: item.authorId ?? "",
        title: item.title ?? "",
        content: item.content ?? "",
        date: item.date ?? "",
        views: item.views ?? 0,

        /* 기존 첨부파일 정보 유지 */

        attachments: Array.isArray(item.attachments)
          ? item.attachments.map((file) => ({
              name: file.name ?? "",
              size: file.size ?? 0,
            }))
          : [],

        /* 기존 답변 정보 유지 */

        answer: item.answer ?? "",
        answerAuthor: item.answerAuthor,
        answerAuthorId: item.answerAuthorId,
        answerDate: item.answerDate,
      };
    });
  } catch (error) {
    console.error("질의응답 게시글 조회 실패:", error);

    return [];
  }
};

/* 질의응답 Write Page */

function QnaWritePage() {
  const navigate = useNavigate();

  /* 파일 input 접근용 Ref */

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* 로그인 사용자 */

  const currentUser = getLoginUser();

  const currentUserId = currentUser?.userId ?? "";
  const currentUserName = getLoginUserName(currentUser);

  const isLoggedIn = Boolean(currentUser && currentUserId);
  const isAdmin = isAdminUser(currentUser);

  /* 작성 폼 */

  const [form, setForm] = useState<QnaForm>({
    title: "",
    content: "",
  });

  /* 첨부파일 */

  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  /* 등록 상태 */

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

  /* 파일 선택 버튼 */

  const handleFileButtonClick = () => {
    if (loading) {
      return;
    }

    fileInputRef.current?.click();
  };

  /* 파일 선택 */

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    if (selectedFiles.length === 0) {
      return;
    }

    /* 기존 파일 + 새 파일 */

    const combinedFiles = [...attachedFiles, ...selectedFiles];

    /* 파일 개수 검사 */

    if (combinedFiles.length > MAX_FILE_COUNT) {
      alert(`첨부파일은 최대 ${MAX_FILE_COUNT}개까지 등록할 수 있습니다.`);

      event.target.value = "";

      return;
    }

    /* 파일 검사 */

    for (const file of selectedFiles) {
      const extension = getFileExtension(file.name);

      /* 확장자 검사 */

      if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
        alert(
          `${file.name}\n허용되지 않는 파일 형식입니다.\n\n허용 형식: JPG, JPEG, PNG, GIF, PDF`,
        );

        event.target.value = "";

        return;
      }

      /* 파일 크기 검사 */

      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name}\n파일 크기가 10MB를 초과했습니다.`);

        event.target.value = "";

        return;
      }
    }

    /* 동일 파일 중복 검사 */

    const duplicateFile = selectedFiles.find((newFile) =>
      attachedFiles.some(
        (existingFile) =>
          existingFile.name === newFile.name &&
          existingFile.size === newFile.size &&
          existingFile.lastModified === newFile.lastModified,
      ),
    );

    if (duplicateFile) {
      alert(`${duplicateFile.name}\n이미 첨부된 파일입니다.`);

      event.target.value = "";

      return;
    }

    /* 첨부파일 상태 저장 */

    setAttachedFiles(combinedFiles);

    /* 같은 파일을 다시 선택할 수 있도록 초기화 */

    event.target.value = "";
  };

  /* 첨부파일 삭제 */

  const handleRemoveFile = (index: number) => {
    if (loading) {
      return;
    }

    setAttachedFiles((prev) =>
      prev.filter((_, fileIndex) => fileIndex !== index),
    );
  };

  /* 입력값 검사 */

  const validateForm = (): boolean => {
    const title = form.title.trim();
    const content = form.content.trim();

    if (!title) {
      alert("제목을 입력해주세요.");

      return false;
    }

    if (title.length > 100) {
      alert("제목은 100자 이내로 입력해주세요.");

      return false;
    }

    if (!content) {
      alert("내용을 입력해주세요.");

      return false;
    }

    if (content.length > 5000) {
      alert("내용은 5,000자 이내로 입력해주세요.");

      return false;
    }

    return true;
  };

  /* 질의응답 등록 */

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    /* 등록 시점의 로그인 사용자 다시 확인 */

    const loginUser = getLoginUser();

    if (!loginUser?.userId) {
      alert("로그인 후 질의응답을 작성할 수 있습니다.");

      navigate("/login");

      return;
    }

    /* 입력값 검사 */

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      /* 기존 게시글 조회 */

      const existingPosts = getStoredPosts();

      /*
       * 현재 프론트 테스트 단계에서는
       * 실제 File 객체를 localStorage에 저장하지 않는다.
       *
       * 대신 파일명과 파일 크기를 저장한다.
       */

      const attachments: QnaAttachment[] = attachedFiles.map((file) => ({
        name: file.name,
        size: file.size,
      }));

      /*
       * 중요
       *
       * 아래 title / content는 현재 입력된 값을 그대로 저장한다.
       * 다른 게시글의 내용으로 변경하지 않는다.
       */

      const newPost: QnaPost = {
        id: Date.now(),

        /* 질문 정보 */

        author: getLoginUserName(loginUser),
        authorId: loginUser.userId,

        /* 입력한 제목 그대로 저장 */

        title: form.title.trim(),

        /* 입력한 내용 그대로 저장 */

        content: form.content.trim(),

        /* 작성 날짜 */

        date: getCurrentDate(),

        /* 새 글이므로 조회수 0 */

        views: 0,

        /* 첨부파일 이름 + 크기 */

        attachments,

        /* 새 글은 미답변 상태 */

        answer: "",
        answerAuthor: undefined,
        answerAuthorId: undefined,
        answerDate: undefined,
      };

      /*
       * 기존 게시글을 유지하면서
       * 새 게시글만 맨 앞에 추가한다.
       */

      const updatedPosts: QnaPost[] = [newPost, ...existingPosts];

      /*
       * localStorage 저장
       *
       * title
       * content
       * attachments
       * author
       * date
       * views
       * answer
       * 모두 함께 저장된다.
       */

      localStorage.setItem("qnaPosts", JSON.stringify(updatedPosts));

      alert("질의응답이 등록되었습니다.");

      /* Q&A 목록으로 이동 */

      navigate("/qna");
    } catch (error) {
      console.error("질의응답 등록 실패:", error);

      alert("질의응답 등록에 실패했습니다. 다시 시도해주세요.");
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

  if (!isLoggedIn) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <section className={styles.loginRequired}>
            <div className={styles.loginIcon}>🔒</div>

            <span className={styles.pageLabel}>질의응답</span>

            <h1>로그인이 필요합니다.</h1>

            <p>질의응답 글쓰기는 로그인한 회원만 이용할 수 있습니다.</p>

            <div className={styles.loginButtonArea}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => navigate("/qna")}
              >
                목록으로 돌아가기
              </button>

              <button
                type="button"
                className={styles.loginButton}
                onClick={() => navigate("/login")}
              >
                로그인하기
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  /* 로그인 상태 */

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

            <h1>문의하기</h1>

            <p>싸농 서비스 이용 중 궁금한 내용을 남겨주세요.</p>
          </div>

          <button
            type="button"
            className={styles.listButton}
            onClick={() => navigate("/qna")}
            disabled={loading}
          >
            목록으로
          </button>
        </section>

        {/* 질의응답 작성 폼 */}

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* 작성자 */}

          <div className={styles.formGroup}>
            <label htmlFor="author">작성자</label>

            <input id="author" type="text" value={currentUserName} disabled />

            <small>현재 로그인한 회원 정보로 자동 등록됩니다.</small>
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
              disabled={loading}
              autoFocus
            />

            <div className={styles.fieldBottom}>
              <small>최대 100자까지 입력할 수 있습니다.</small>

              <span>{form.title.length} / 100</span>
            </div>
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
              disabled={loading}
            />

            <div className={styles.fieldBottom}>
              <small>최대 5,000자까지 입력할 수 있습니다.</small>

              <span>{form.content.length.toLocaleString()} / 5,000</span>
            </div>
          </div>

          {/* 첨부파일 */}

          <div className={styles.formGroup}>
            <label htmlFor="file">첨부파일</label>

            <input
              ref={fileInputRef}
              id="file"
              type="file"
              className={styles.fileInput}
              accept=".jpg,.jpeg,.png,.gif,.pdf"
              multiple
              onChange={handleFileChange}
              disabled={loading || attachedFiles.length >= MAX_FILE_COUNT}
            />

            <div className={styles.fileUploadArea}>
              <button
                type="button"
                className={styles.fileSelectButton}
                onClick={handleFileButtonClick}
                disabled={loading || attachedFiles.length >= MAX_FILE_COUNT}
              >
                📎 파일 선택
              </button>

              <div className={styles.fileGuide}>
                <strong>파일을 첨부해주세요.</strong>

                <span>최대 {MAX_FILE_COUNT}개 · 파일당 최대 10MB</span>

                <span>JPG, JPEG, PNG, GIF, PDF</span>
              </div>
            </div>

            {/* 선택된 파일 */}

            {attachedFiles.length > 0 && (
              <div className={styles.fileList}>
                <div className={styles.fileListHeader}>
                  <strong>선택된 파일</strong>

                  <span>
                    {attachedFiles.length} / {MAX_FILE_COUNT}
                  </span>
                </div>

                <ul>
                  {attachedFiles.map((file, index) => (
                    <li
                      key={`${file.name}-${file.lastModified}-${index}`}
                      className={styles.fileItem}
                    >
                      <div className={styles.fileInformation}>
                        <span className={styles.fileIcon}>📎</span>

                        <div className={styles.fileText}>
                          <span className={styles.fileName} title={file.name}>
                            {file.name}
                          </span>

                          <span className={styles.fileSize}>
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={styles.fileRemoveButton}
                        onClick={() => handleRemoveFile(index)}
                        disabled={loading}
                        aria-label={`${file.name} 첨부파일 삭제`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 안내 문구 */}

          <div className={styles.notice}>
            <span className={styles.noticeIcon}>💡</span>

            <div>
              <strong>질의응답 이용 안내</strong>

              <p>
                작성한 질의응답은 작성자 본인이 확인할 수 있으며,
                <br />
                관리자는 모든 질의응답 게시글을 확인하고 답변할 수 있습니다.
                <br />
                답변이 등록되면 게시글 상세 화면에서 확인할 수 있습니다.
                <br />
                첨부파일은 최대 3개까지 등록할 수 있으며 파일당 최대 10MB입니다.
              </p>
            </div>
          </div>

          {/* 버튼 */}

          <div className={styles.buttonArea}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => navigate("/qna")}
              disabled={loading}
            >
              취소
            </button>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? "등록 중..." : "등록하기"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default QnaWritePage;
