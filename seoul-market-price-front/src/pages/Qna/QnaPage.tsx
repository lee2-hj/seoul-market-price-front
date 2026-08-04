import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./QnaPage.module.css";

interface QnaPost {
  id: number;
  author: string;
  title: string;
  content: string;
  date: string;
  views: number;
}

type SearchType = "title" | "author" | "content";

/* ========================================
   초기 Q&A 샘플 데이터
======================================== */

const INITIAL_QNA_POSTS: QnaPost[] = [
  {
    id: 3,
    author: "박채소",
    title: "모바일 화면에서도 확인 가능한가요?",
    content: "웹사이트와 동일하게 모바일 화면에서도 확인가능한가요?",
    date: "2026.08.04",
    views: 24,
  },
  {
    id: 2,
    author: "김채소",
    title: "농수산물이 어떤 방법으로 조사 되는지 알 수 있을까요?",
    content: "어떤 데이터를 토대로 조사가 되는건가요?",
    date: "2026.08.03",
    views: 18,
  },
  {
    id: 1,
    author: "이채소",
    title: "관심품목 설정은 어디서 하나요",
    content: "내가 사는 지역의 관심품목을 설정하고 싶어요.",
    date: "2026.08.01",
    views: 12,
  },
];

/* ========================================
   localStorage 게시글 불러오기
======================================== */

const getInitialPosts = (): QnaPost[] => {
  const storedPosts = localStorage.getItem("qnaPosts");

  if (!storedPosts) {
    localStorage.setItem("qnaPosts", JSON.stringify(INITIAL_QNA_POSTS));
    return INITIAL_QNA_POSTS;
  }

  try {
    const parsedPosts: QnaPost[] = JSON.parse(storedPosts);

    if (Array.isArray(parsedPosts)) {
      return parsedPosts;
    }

    return INITIAL_QNA_POSTS;
  } catch (error) {
    console.error("Q&A 게시글 불러오기 실패:", error);
    return INITIAL_QNA_POSTS;
  }
};

/* ========================================
   로그인 사용자 이름
======================================== */

const getLoginUserName = (): string => {
  const user = localStorage.getItem("user");

  if (!user) {
    return "사용자";
  }

  try {
    const parsedUser = JSON.parse(user);

    return (
      parsedUser.name || parsedUser.userName || parsedUser.userId || "사용자"
    );
  } catch {
    return "사용자";
  }
};

/* ========================================
   Q&A Page
======================================== */

function QnaPage() {
  const navigate = useNavigate();

  /* ========================================
     로그인 상태
  ======================================== */

  const isLoggedIn =
    !!localStorage.getItem("accessToken") || !!localStorage.getItem("user");

  /* ========================================
     로그인 사용자 이름
  ======================================== */

  const userName = useMemo(() => {
    if (!isLoggedIn) {
      return "";
    }

    return getLoginUserName();
  }, [isLoggedIn]);

  /* ========================================
     게시글
  ======================================== */

  const [posts, setPosts] = useState<QnaPost[]>(getInitialPosts);

  /* ========================================
     전체 메뉴
  ======================================== */

  const [isAllMenuOpen, setIsAllMenuOpen] = useState(false);

  /* ========================================
     검색
  ======================================== */

  const [searchType, setSearchType] = useState<SearchType>("title");

  const [searchKeyword, setSearchKeyword] = useState("");

  const [appliedKeyword, setAppliedKeyword] = useState("");

  /* ========================================
     페이지네이션
  ======================================== */

  const POSTS_PER_PAGE = 10;
  const MAX_PAGE = 5;

  const [currentPage, setCurrentPage] = useState(1);

  /* ========================================
     검색 결과
  ======================================== */

  const filteredPosts = useMemo(() => {
    const keyword = appliedKeyword.trim().toLowerCase();

    if (!keyword) {
      return posts;
    }

    return posts.filter((post) => {
      switch (searchType) {
        case "title":
          return post.title.toLowerCase().includes(keyword);

        case "author":
          return post.author.toLowerCase().includes(keyword);

        case "content":
          return post.content.toLowerCase().includes(keyword);

        default:
          return true;
      }
    });
  }, [posts, appliedKeyword, searchType]);

  /* ========================================
     전체 페이지 수
  ======================================== */

  const totalPages = Math.min(
    Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE)),
    MAX_PAGE,
  );

  /* ========================================
     현재 페이지 게시글
  ======================================== */

  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;

    return filteredPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);
  }, [filteredPosts, currentPage]);

  /* ========================================
     검색 Placeholder
  ======================================== */

  const searchPlaceholder = useMemo(() => {
    switch (searchType) {
      case "title":
        return "제목을 입력해주세요.";

      case "author":
        return "작성자를 입력해주세요.";

      case "content":
        return "작성글 내용을 입력해주세요.";

      default:
        return "검색어를 입력해주세요.";
    }
  }, [searchType]);

  /* ========================================
     검색
  ======================================== */

  const handleSearch = () => {
    setAppliedKeyword(searchKeyword.trim());

    setCurrentPage(1);
  };

  /* ========================================
     Enter 검색
  ======================================== */

  const handleSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  /* ========================================
     검색 조건 변경
  ======================================== */

  const handleSearchTypeChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const newSearchType = event.target.value as SearchType;

    setSearchType(newSearchType);
    setSearchKeyword("");
    setAppliedKeyword("");
    setCurrentPage(1);
  };

  /* ========================================
     검색 초기화
  ======================================== */

  const handleResetSearch = () => {
    setSearchKeyword("");
    setAppliedKeyword("");
    setSearchType("title");
    setCurrentPage(1);
  };

  /* ========================================
     글쓰기
  ======================================== */

  const handleWrite = () => {
    if (!isLoggedIn) {
      return;
    }

    navigate("/qna/write");
  };

  /* ========================================
     게시글 클릭
  ======================================== */

  const handlePostClick = (post: QnaPost) => {
    const updatedPosts = posts.map((item) => {
      if (item.id === post.id) {
        return {
          ...item,
          views: item.views + 1,
        };
      }

      return item;
    });

    setPosts(updatedPosts);

    localStorage.setItem("qnaPosts", JSON.stringify(updatedPosts));

    navigate(`/qna/${post.id}`);
  };

  /* ========================================
     페이지 이동
  ======================================== */

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) {
      return;
    }

    setCurrentPage(page);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* ========================================
     이전 페이지
  ======================================== */

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  /* ========================================
     다음 페이지
  ======================================== */

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  /* ========================================
     로그아웃
  ======================================== */

  const handleLogout = () => {
    localStorage.removeItem("accessToken");

    localStorage.removeItem("user");

    navigate("/");
  };

  /* ========================================
     전체 메뉴 이동
  ======================================== */

  const handleAllMenuNavigate = (path: string) => {
    setIsAllMenuOpen(false);
    navigate(path);
  };

  /* ========================================
     날짜
  ======================================== */

  const formatDate = (date: string) => {
    return date || "-";
  };

  /* ========================================
     화면
  ======================================== */

  return (
    <div className={styles.page}>
      {/* ========================================
          최상단 사용자 영역
      ======================================== */}

      <div className={styles.topUserBar}>
        <div className={styles.topUserInner}>
          <div className={styles.userArea}>
            {isLoggedIn ? (
              <>
                <span className={styles.userName}>{userName}</span>

                <button
                  type="button"
                  className={styles.logoutButton}
                  onClick={handleLogout}
                >
                  로그아웃
                </button>
              </>
            ) : (
              <button
                type="button"
                className={styles.loginLink}
                onClick={() => navigate("/login")}
              >
                로그인
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================
          Main Header
      ======================================== */}

      <header className={styles.mainHeader}>
        <div
          className={styles.headerInner}
          onMouseLeave={() => setIsAllMenuOpen(false)}
        >
          {/* 로고 */}

          <button
            type="button"
            className={styles.logo}
            onClick={() => navigate("/")}
            aria-label="싸농 홈으로 이동"
          >
            싸농
          </button>

          {/* ========================================
              상단 메뉴
          ======================================== */}

          <nav className={styles.mainNav} aria-label="주요 메뉴">
            {/* 홈 */}

            <button
              type="button"
              className={styles.navItem}
              onClick={() => navigate("/")}
            >
              홈
            </button>

            {/* 가격정보 */}

            <div className={styles.navMenu}>
              <button type="button" className={styles.navItem}>
                가격정보
              </button>

              <div className={styles.megaMenu}>
                <div className={styles.megaColumn}>
                  <strong>가격정보</strong>

                  <button type="button" onClick={() => navigate("/price")}>
                    간편가격정보
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/price/detail")}
                  >
                    세부가격정보
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
                  <strong>자치구별 가격정보</strong>

                  <button
                    type="button"
                    onClick={() => navigate("/region-price")}
                  >
                    서울 지역별 가격
                  </button>
                </div>
              </div>
            </div>

            {/* 스마트 추천 */}

            <button
              type="button"
              className={styles.navItem}
              onClick={() => navigate("/recommendation")}
            >
              스마트 추천
            </button>

            {/* 게시판 */}

            <div className={styles.navMenu}>
              <button type="button" className={styles.navItem}>
                게시판
              </button>

              <div className={styles.megaMenu}>
                <div className={styles.megaColumn}>
                  <strong>게시판</strong>

                  <button type="button" onClick={() => navigate("/board")}>
                    일반게시판
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

            {/* ========================================
                ☰ 전체 메뉴 버튼
            ======================================== */}

            <button
              type="button"
              className={styles.allMenuButton}
              onClick={() => setIsAllMenuOpen((prev) => !prev)}
              aria-label="전체 메뉴"
              aria-expanded={isAllMenuOpen}
            >
              <span className={styles.menuIcon}>
                <span></span>
                <span></span>
                <span></span>
              </span>
            </button>
          </nav>

          {/* ========================================
              전체 메뉴
              
              클릭 → 열림
              마우스가 header 영역을 벗어나면 닫힘
          ======================================== */}

          {isAllMenuOpen && (
            <div
              className={styles.allMenuPanel}
              onMouseLeave={() => setIsAllMenuOpen(false)}
            >
              <div className={styles.allMenuHeader}>
                <h2 className={styles.allMenuTitle}>전체 메뉴</h2>

                <button
                  type="button"
                  className={styles.allMenuClose}
                  onClick={() => setIsAllMenuOpen(false)}
                  aria-label="전체 메뉴 닫기"
                >
                  ×
                </button>
              </div>

              <div className={styles.allMenuList}>
                {/* 가격정보 */}

                <div className={styles.allMenuGroup}>
                  <strong className={styles.allMenuGroupTitle}>가격정보</strong>

                  <button
                    type="button"
                    className={styles.allMenuItem}
                    onClick={() => handleAllMenuNavigate("/price")}
                  >
                    간편가격정보
                  </button>

                  <button
                    type="button"
                    className={styles.allMenuItem}
                    onClick={() => handleAllMenuNavigate("/price/detail")}
                  >
                    세부가격정보
                  </button>
                </div>

                {/* 자치구별 가격정보 */}

                <div className={styles.allMenuGroup}>
                  <strong className={styles.allMenuGroupTitle}>
                    자치구별 가격정보
                  </strong>

                  <button
                    type="button"
                    className={styles.allMenuItem}
                    onClick={() => handleAllMenuNavigate("/region-price")}
                  >
                    서울 지역별 가격
                  </button>
                </div>

                {/* 스마트 추천 */}

                <div className={styles.allMenuGroup}>
                  <strong className={styles.allMenuGroupTitle}>
                    스마트 추천
                  </strong>

                  <button
                    type="button"
                    className={styles.allMenuItem}
                    onClick={() => handleAllMenuNavigate("/recommendation")}
                  >
                    맞춤 상품 추천
                  </button>
                </div>

                {/* 게시판 */}

                <div className={styles.allMenuGroup}>
                  <strong className={styles.allMenuGroupTitle}>게시판</strong>

                  <button
                    type="button"
                    className={styles.allMenuItem}
                    onClick={() => handleAllMenuNavigate("/board")}
                  >
                    일반게시판
                  </button>

                  <button
                    type="button"
                    className={styles.allMenuItem}
                    onClick={() => handleAllMenuNavigate("/qna")}
                  >
                    Q&A
                  </button>

                  <button
                    type="button"
                    className={styles.allMenuItem}
                    onClick={() => handleAllMenuNavigate("/faq")}
                  >
                    자주 묻는 질문
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ========================================
          Q&A 본문
      ======================================== */}

      <main className={styles.container}>
        <section className={styles.pageHeader}>
          <div className={styles.headerText}>
            <h1>Q&A</h1>

            <p>궁금한 점이나 서비스 이용 관련 문의를 남겨주세요.</p>
          </div>
        </section>

        {/* 게시판 탭 */}

        <nav className={styles.boardTabs} aria-label="게시판 메뉴">
          <button
            type="button"
            className={styles.boardTab}
            onClick={() => navigate("/board")}
          >
            일반게시판
          </button>

          <button
            type="button"
            className={`${styles.boardTab} ${styles.active}`}
            aria-current="page"
          >
            Q&A게시판
          </button>

          <button
            type="button"
            className={styles.boardTab}
            onClick={() => navigate("/faq")}
          >
            자주 묻는 질문
          </button>
        </nav>

        {/* 검색 */}

        <section className={styles.searchArea} aria-label="Q&A 검색">
          <div className={styles.searchBox}>
            <label htmlFor="qna-search" className={styles.searchLabel}>
              검색어
            </label>

            <select
              value={searchType}
              onChange={handleSearchTypeChange}
              className={styles.searchSelect}
              aria-label="검색 조건"
            >
              <option value="title">제목</option>

              <option value="author">작성자</option>

              <option value="content">작성글</option>
            </select>

            <input
              id="qna-search"
              type="text"
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder}
              className={styles.searchInput}
            />

            <button
              type="button"
              className={styles.searchButton}
              onClick={handleSearch}
            >
              조회
            </button>
          </div>

          {/* 글쓰기 */}

          <button
            type="button"
            className={`${styles.writeButton} ${
              !isLoggedIn ? styles.disabled : ""
            }`}
            onClick={handleWrite}
            disabled={!isLoggedIn}
            title={
              !isLoggedIn ? "로그인 후 글쓰기가 가능합니다." : "Q&A 글쓰기"
            }
          >
            <span className={styles.writeIcon}>+</span>
            글쓰기
          </button>
        </section>

        {/* 검색 결과 */}

        {appliedKeyword && (
          <div className={styles.searchResult} aria-live="polite">
            <span>"{appliedKeyword}"</span>
            검색 결과 <strong>{filteredPosts.length}</strong>건
            <button type="button" onClick={handleResetSearch}>
              검색 초기화
            </button>
          </div>
        )}

        {/* 게시판 */}

        <section className={styles.board} aria-label="Q&A 게시글 목록">
          <div className={styles.tableHeader}>
            <div className={styles.numberColumn}>번호</div>

            <div className={styles.titleColumn}>제목</div>

            <div className={styles.authorColumn}>작성자</div>

            <div className={styles.dateColumn}>날짜</div>

            <div className={styles.viewsColumn}>조회수</div>
          </div>

          {paginatedPosts.length > 0 ? (
            <div className={styles.tableBody}>
              {paginatedPosts.map((post, index) => {
                const postNumber =
                  filteredPosts.length -
                  ((currentPage - 1) * POSTS_PER_PAGE + index);

                return (
                  <button
                    type="button"
                    key={post.id}
                    className={styles.tableRow}
                    onClick={() => handlePostClick(post)}
                  >
                    <div className={styles.numberColumn}>{postNumber}</div>

                    <div className={styles.titleColumn}>
                      <span className={styles.postTitle}>{post.title}</span>
                    </div>

                    <div className={styles.authorColumn}>{post.author}</div>

                    <div className={styles.dateColumn}>
                      {formatDate(post.date)}
                    </div>

                    <div className={styles.viewsColumn}>{post.views}</div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>🔍</div>

              <h3>검색 결과가 없습니다.</h3>

              <p>검색 조건이나 검색어를 다시 확인해주세요.</p>
            </div>
          )}
        </section>

        {/* 페이지네이션 */}

        {filteredPosts.length > 0 && (
          <nav className={styles.pagination} aria-label="Q&A 페이지 이동">
            <button
              type="button"
              className={styles.pageArrow}
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              aria-label="이전 페이지"
            >
              ‹
            </button>

            {Array.from(
              {
                length: MAX_PAGE,
              },
              (_, index) => index + 1,
            ).map((page) => (
              <button
                key={page}
                type="button"
                className={`${styles.pageNumber} ${
                  currentPage === page ? styles.pageActive : ""
                }`}
                onClick={() => handlePageChange(page)}
                disabled={page > totalPages}
                aria-current={currentPage === page ? "page" : undefined}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              className={styles.pageArrow}
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              aria-label="다음 페이지"
            >
              ›
            </button>
          </nav>
        )}

        {/* 하단 정보 */}

        <div className={styles.boardInfo}>
          <span>
            전체 <strong>{filteredPosts.length}</strong>건
          </span>

          {!isLoggedIn && (
            <span className={styles.loginInfo}>
              🔒 로그인 후 Q&A 글쓰기가 가능합니다.
            </span>
          )}
        </div>
      </main>
    </div>
  );
}

export default QnaPage;
