import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./QnaWritePage.module.css";

interface QnaForm {
  title: string;
  content: string;
}

interface QnaPost {
  id: number;
  author: string;
  title: string;
  content: string;
  date: string;
  views: number;
}

function QnaWritePage() {
  const navigate = useNavigate();

  /* 로그인 상태(현재 localStorage를 사용)
     추후 Spring Boot 연결 시 기존 auth.ts의 isLogin()으로 교체필요*/

  const isLoggedIn =
    !!localStorage.getItem("accessToken") || !!localStorage.getItem("user");

  /* 작성 Form */

  const [form, setForm] = useState<QnaForm>({
    title: "",
    content: "",
  });

  const [loading, setLoading] = useState(false);

  /* 상태(현재 localStorage를 사용)

     예상 형태:
     {
       id: 1,
       name: "홍길동",
       userId: "hong"
     }
     추후 Spring Boot 로그인 정보와 연결 */

  const getCurrentUserName = (): string => {
    const user = localStorage.getItem("user");

    if (!user) {
      return "사용자";
    }
    try {
      const parsedUser = JSON.parse(user);
      return (
        parsedUser.name || parsedUser.userName || parsedUser.userId || "사용자"
      );
    } catch (error) {
      console.error("사용자 정보 확인 실패:", error);

      return "사용자";
    }
  };

  /*  입력값 변경 */

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /*  제목 / 내용 검사 */

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

  /*  Q&A 등록 */

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    /*  로그인 여부 재확인 */

    if (!isLoggedIn) {
      alert("로그인 후 Q&A를 작성할 수 있습니다.");
      navigate("/login");
      return;
    }

    /* 입력값 검사 */

    if (!validateForm()) {
      return;
    }
    try {
      setLoading(true);

      /* 상태(현재 localStorage를 사용)
         현재 프론트 작업용 임시 저장
         추후 Spring Boot + MySQL 연결 시
         이 부분만 axios.post()로 교체한다.

         예:
         await axios.post("/api/qna", {
           title: form.title.trim(),
           content: form.content.trim()
         }); */

      const storedPosts = localStorage.getItem("qnaPosts");

      let existingPosts: QnaPost[] = [];

      /*  기존 게시글 불러오기 */

      if (storedPosts) {
        try {
          const parsedPosts = JSON.parse(storedPosts);
          if (Array.isArray(parsedPosts)) {
            existingPosts = parsedPosts;
          }
        } catch (error) {
          console.error("기존 Q&A 게시글 불러오기 실패:", error);
          existingPosts = [];
        }
      }

      /*  새 게시글 생성 */

      const now = new Date();
      const formattedDate = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
      ].join(".");
      const newPost: QnaPost = {
        id: Date.now(),
        author: getCurrentUserName(),
        title: form.title.trim(),
        content: form.content.trim(),
        date: formattedDate,
        views: 0,
      };

      /* 최신 글을 가장 위에 추가 */
      const updatedPosts: QnaPost[] = [newPost, ...existingPosts];

      /* localStorage 저장 */
      localStorage.setItem("qnaPosts", JSON.stringify(updatedPosts));

      /*  등록 완료 */
      alert("Q&A가 등록되었습니다.");

      /*  Q&A 목록으로 이동 */

      navigate("/qna");
    } catch (error) {
      console.error("Q&A 등록 실패:", error);

      alert("Q&A 등록에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  /*  비로그인 상태 /qna/write 직접 접근 방지 */

  if (!isLoggedIn) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loginRequired}>
            <div className={styles.loginIcon}>🔒</div>
            <h1>로그인이 필요합니다.</h1>
            <p>Q&A 글쓰기는 로그인한 회원만 이용할 수 있습니다.</p>
            <div className={styles.loginButtonArea}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => navigate("/qna")}
              >
                {" "}
                Q&A로 돌아가기{" "}
              </button>
              <button
                type="button"
                className={styles.loginButton}
                onClick={() => navigate("/login")}
              >
                {" "}
                로그인하기{" "}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /*  로그인 상태 → 작성 화면 */

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* PAGE HEADER */}

        <div className={styles.pageHeader}>
          <div className={styles.headerText}>
            <span className={styles.pageLabel}>Q&A</span>
            <h1>문의하기</h1>
            <p>싸농 서비스 이용 중 궁금한 내용을 남겨주세요.</p>
          </div>

          <button
            type="button"
            className={styles.listButton}
            onClick={() => navigate("/qna")}
          >
            {" "}
            목록으로{" "}
          </button>
        </div>

        {/* FORM */}

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* 작성자 */}

          <div className={styles.formGroup}>
            <label htmlFor="author">작성자</label>
            <input
              id="author"
              type="text"
              value={getCurrentUserName()}
              disabled
            />
            <small>현재 로그인한 회원 정보로 자동 등록됩니다.</small>
          </div>

          {/* 제목 */}

          <div className={styles.formGroup}>
            <label htmlFor="title">
              {" "}
              제목 <span>*</span>{" "}
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
            />
            <small>최대 100자까지 입력할 수 있습니다.</small>
          </div>

          {/* 내용 */}

          <div className={styles.formGroup}>
            <label htmlFor="content">
              {" "}
              내용 <span>*</span>{" "}
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
            <small>최대 5,000자까지 입력할 수 있습니다.</small>
          </div>

          {/* 안내 문구 */}

          <div className={styles.notice}>
            {" "}
            <span>💡</span>
            <p>
              {" "}
              문의 내용은 Q&A 게시판에 등록되며, 다른 사용자에게 공개될 수
              있습니다.{" "}
            </p>
          </div>

          {/*  BUTTON */}

          <div className={styles.buttonArea}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => navigate("/qna")}
              disabled={loading}
            >
              {" "}
              취소
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {" "}
              {loading ? "등록 중..." : "등록하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default QnaWritePage;
