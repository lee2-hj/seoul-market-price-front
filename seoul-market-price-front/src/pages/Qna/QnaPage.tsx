import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { useNavigate } from "react-router-dom";

import { getQnasApi, type QnaListResponse } from "@/api/api";
import { getLoginUser, isLogin, logout } from "@/features/auth/utils/auth";

import styles from "./QnaPage.module.css";

/* 검색 조건 */

type SearchType = "title" | "author" | "content";

/* 페이지 설정 */

const POSTS_PER_PAGE = 5;
const MAX_PAGE = 5;

/* Q&A 페이지 */

function QnaPage() {
  const navigate = useNavigate();

  /* 로그인 사용자 정보 */

  const loginUser = getLoginUser();

  /* 로그인 상태 */

  const isLoggedIn = isLogin();

  /* 로그인 사용자 ID */

  const loginUserId = String(loginUser?.userId ?? "").trim();

  /* 로그인 사용자 이름 */

  const loginUserName = useMemo(() => {
    if (!loginUser) {
      return "사용자";
    }

    return loginUser.name || loginUser.userId || "사용자";
  }, [loginUser]);

  /* 관리자 여부 */

  const isAdmin = useMemo(() => {
    if (!loginUser?.role) {
      return false;
    }

    const role = loginUser.role.toUpperCase();

    return role === "ADMIN" || role === "ROLE_ADMIN";
  }, [loginUser]);

  /* Q&A 게시글 */

  const [posts, setPosts] = useState<QnaListResponse[]>([]);

  /* 전체 메뉴 */

  const [isAllMenuOpen, setIsAllMenuOpen] = useState(false);

  /* 검색 */

  const [searchType, setSearchType] = useState<SearchType>("title");

  const [searchKeyword, setSearchKeyword] = useState("");

  const [appliedKeyword, setAppliedKeyword] = useState("");

  /* 페이지네이션 */

  const [currentPage, setCurrentPage] = useState(1);

  const [totalElements, setTotalElements] = useState(0);

  const [totalPagesFromApi, setTotalPagesFromApi] = useState(0);

  /* API 로딩 상태 */

  const [isLoading, setIsLoading] = useState(false);

  /* API 오류 */

  const [errorMessage, setErrorMessage] = useState("");

  /*
   * 게시글 작성자 ID 조회
   *
   * 백엔드 DTO 구조가 변경되었을 경우를 대비한다.
   *
   * 우선순위
   *
   * 1. writerLoginId
   * 2. userId
   * 3. memberId
   *
   * 실제 API 응답에 존재하는 값을 사용한다.
   */

  const getPostWriterId = useCallback((post: QnaListResponse): string => {
    const postData = post as QnaListResponse & {
      writerLoginId?: string | number | null;
      userId?: string | number | null;
      memberId?: string | number | null;
    };

    const writerLoginId = String(postData.writerLoginId ?? "").trim();

    if (writerLoginId) {
      return writerLoginId;
    }

    const userId = String(postData.userId ?? "").trim();

    if (userId) {
      return userId;
    }

    const memberId = String(postData.memberId ?? "").trim();

    if (memberId) {
      return memberId;
    }

    return "";
  }, []);

  /*
   * 내가 작성한 게시글인지 확인
   */

  const isMyPost = useCallback(
    (post: QnaListResponse): boolean => {
      const postWriterId = getPostWriterId(post);

      if (!loginUserId || !postWriterId) {
        return false;
      }

      return postWriterId === loginUserId;
    },
    [getPostWriterId, loginUserId],
  );

  /*
   * Q&A 목록 API 조회
   *
   * localStorage의 qnaPosts는 사용하지 않는다.
   *
   * 오직 GET /api/qnas API 응답만 사용한다.
   */

  const fetchQnaPosts = useCallback(async (page: number, keyword: string) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      /*
       * 화면 페이지는 1부터 시작한다.
       *
       * Spring Boot Pageable은 0부터 시작한다.
       *
       * 화면 1페이지
       * -> API page=0
       *
       * 화면 2페이지
       * -> API page=1
       */

      const response = await getQnasApi(page - 1, POSTS_PER_PAGE, keyword);

      console.log("=================================");
      console.log("Q&A API 호출 성공");
      console.log("Q&A API 응답:", response);
      console.log("Q&A 게시글:", response?.content);
      console.log("전체 게시글 수:", response?.totalElements);
      console.log("전체 페이지 수:", response?.totalPages);
      console.log("=================================");

      /*
       * 백엔드 응답 구조 확인
       */

      if (!response || !Array.isArray(response.content)) {
        console.error("Q&A API 응답 구조가 올바르지 않습니다.", response);

        setPosts([]);
        setTotalElements(0);
        setTotalPagesFromApi(0);
        setErrorMessage("Q&A API 응답 형식이 올바르지 않습니다.");

        return;
      }

      /*
       * 개발 중 작성자 ID 필드 확인용 로그
       *
       * 실제 API 응답을 확인하기 위한 로그다.
       */

      response.content.forEach((post, index) => {
        console.log(`Q&A 게시글 ${index + 1} 작성자 정보`, {
          id: post.id,
          title: post.title,
          writerName: post.writerName,
          writerLoginId: (
            post as QnaListResponse & {
              writerLoginId?: string | number | null;
            }
          ).writerLoginId,
          userId: (
            post as QnaListResponse & {
              userId?: string | number | null;
            }
          ).userId,
          memberId: (
            post as QnaListResponse & {
              memberId?: string | number | null;
            }
          ).memberId,
        });
      });

      /*
       * 백엔드에서 받은 content만 화면에 표시한다.
       */

      setPosts(response.content);

      setTotalElements(response.totalElements ?? 0);

      setTotalPagesFromApi(response.totalPages ?? 0);
    } catch (error) {
      console.error("Q&A 목록 조회 실패:", error);

      setPosts([]);
      setTotalElements(0);
      setTotalPagesFromApi(0);

      setErrorMessage("Q&A 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  /*
   * 페이지 최초 진입
   *
   * GET /api/qnas?page=0&size=5
   */

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void fetchQnaPosts(1, "");
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [fetchQnaPosts]);

  /* 전체 페이지 수 */

  const totalPages = Math.min(Math.max(1, totalPagesFromApi), MAX_PAGE);

  /* 검색 Placeholder */

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

  /* 검색 */

  const handleSearch = () => {
    const keyword = searchKeyword.trim();

    setAppliedKeyword(keyword);

    setCurrentPage(1);

    void fetchQnaPosts(1, keyword);
  };

  /* Enter 검색 */

  const handleSearchKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  /* 검색 조건 변경 */

  const handleSearchTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const newSearchType = event.target.value as SearchType;

    setSearchType(newSearchType);

    setSearchKeyword("");

    setAppliedKeyword("");

    setCurrentPage(1);

    /*
     * 현재 백엔드 API는 keyword만 전달받는다.
     *
     * searchType은 화면에서만 관리한다.
     *
     * 추후 백엔드에서 searchType을 지원하면
     * getQnasApi에 searchType을 추가하면 된다.
     */

    void fetchQnaPosts(1, "");
  };

  /* 검색 초기화 */

  const handleResetSearch = () => {
    setSearchKeyword("");

    setAppliedKeyword("");

    setSearchType("title");

    setCurrentPage(1);

    void fetchQnaPosts(1, "");
  };

  /* 글쓰기 */

  const handleWrite = () => {
    /*
     * auth.ts의 isLogin()을 기준으로 로그인 상태를 확인한다.
     */

    if (!isLoggedIn || !loginUserId) {
      alert("로그인 후 글쓰기가 가능합니다.");

      navigate("/login");

      return;
    }

    navigate("/qna/write");
  };

  /* 게시글 클릭 */

  const handlePostClick = (post: QnaListResponse) => {
    /*
     * 로그인하지 않은 사용자는 게시글 상세 내용을 볼 수 없다.
     */

    if (!isLoggedIn || !loginUserId) {
      alert("로그인 후 게시글 내용을 확인할 수 있습니다.");

      navigate("/login");

      return;
    }

    /*
     * 백엔드 응답에서 작성자 ID를 가져온다.
     */

    const postWriterId = getPostWriterId(post);

    /*
     * 내가 작성한 글인지 확인한다.
     */

    const myPost = isMyPost(post);

    /*
     * 개발 중 권한 확인 로그
     */

    console.log("=================================");
    console.log("Q&A 게시글 접근 권한 확인");
    console.log("게시글 ID:", post.id);
    console.log("게시글 제목:", post.title);
    console.log("게시글 작성자 이름:", post.writerName);
    console.log("게시글 작성자 ID:", postWriterId);
    console.log("현재 로그인 사용자 ID:", loginUserId);
    console.log("내 게시글 여부:", myPost);
    console.log("관리자 여부:", isAdmin);
    console.log("=================================");

    /*
     * 관리자 또는 본인 게시글만 상세 페이지로 이동한다.
     */

    if (!isAdmin && !myPost) {
      alert("본인이 작성한 게시글만 내용을 확인할 수 있습니다.");

      return;
    }

    /*
     * 상세 페이지에서
     *
     * GET /api/qnas/{id}
     *
     * 를 호출하도록 한다.
     */

    navigate(`/qna/${post.id}`);
  };

  /* 페이지 이동 */

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) {
      return;
    }

    setCurrentPage(page);

    void fetchQnaPosts(page, appliedKeyword);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* 이전 페이지 */

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  /* 다음 페이지 */

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  /* 로그아웃 */

  const handleLogout = async () => {
    try {
      /*
       * 서버 로그아웃 API 호출
       */

      const { logoutApi } = await import("@/api/api");

      await logoutApi();
    } catch (error) {
      console.error("로그아웃 API 오류:", error);
    } finally {
      /*
       * auth.ts의 logout()으로
       * localStorage 로그인 정보도 제거한다.
       */

      logout();

      navigate("/");
    }
  };

  /* 전체 메뉴 이동 */

  const handleAllMenuNavigate = (path: string) => {
    setIsAllMenuOpen(false);

    navigate(path);
  };

  /* 날짜 포맷 */

  const formatDate = (date: string) => {
    if (!date) {
      return "-";
    }

    /*
     * 백엔드 LocalDateTime
     *
     * 2026-08-07T11:27:42
     *
     * 화면
     *
     * 2026.08.07
     */

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    const year = parsedDate.getFullYear();

    const month = String(parsedDate.getMonth() + 1).padStart(2, "0");

    const day = String(parsedDate.getDate()).padStart(2, "0");

    return `${year}.${month}.${day}`;
  };

  /* 답변 완료 여부 */

  const hasAnswer = (post: QnaListResponse) => {
    /*
     * answeredAt이 존재하면 답변 완료로 판단한다.
     */

    return !!post.answeredAt;
  };

  return (
    <div>
      {/* 최상단 사용자 영역 */}

      <div className={styles.topUserBar}>
        <div className={styles.topUserInner}>
          <div className={styles.userArea}>
            {isLoggedIn ? (
              <>
                <span className={styles.userName}>{loginUserName}</span>

                {isAdmin && <span className={styles.adminBadge}>관리자</span>}

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

      {/* Main Header */}

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

          {/* 상단 가로 메뉴 */}

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

                  <button
                    type="button"
                    onClick={() => navigate("/price/detail")}
                  >
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

                  <button type="button" onClick={() => navigate("/notice")}>
                    공지사항
                  </button>

                  <button type="button" onClick={() => navigate("/qna")}>
                    질의응답
                  </button>

                  <button type="button" onClick={() => navigate("/faq")}>
                    자주 묻는 질문
                  </button>
                </div>
              </div>
            </div>

            {/* 마이페이지 */}

            <div className={styles.navMenu}>
              <button type="button" className={styles.navItem}>
                마이페이지
              </button>

              <div className={styles.megaMenu}>
                <div className={styles.megaColumn}>
                  <strong>마이페이지</strong>

                  <button
                    type="button"
                    onClick={() => navigate("/mypage/info")}
                  >
                    내 정보 수정
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/mypage/interests")}
                  >
                    관심품목 & 우리동네 설정
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/mypage/alerts")}
                  >
                    가격 변동 타겟 알림
                  </button>
                </div>
              </div>
            </div>

            {/* 전체 메뉴 버튼 */}

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

          {/* 전체 메뉴 */}

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
                    품목별 시세 조회
                  </button>

                  <button
                    type="button"
                    className={styles.allMenuItem}
                    onClick={() => handleAllMenuNavigate("/price/detail")}
                  >
                    가격 추이 그래프
                  </button>

                  <button
                    type="button"
                    className={styles.allMenuItem}
                    onClick={() => handleAllMenuNavigate("/price/detail")}
                  >
                    급상승 / 급락 품목
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
                    자치구간 1:1 비교
                  </button>

                  <button
                    type="button"
                    className={styles.allMenuItem}
                    onClick={() => handleAllMenuNavigate("/region-price")}
                  >
                    시장 / 마트 유형별 비교
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
                    오늘의 알뜰 장바구니
                  </button>

                  <button
                    type="button"
                    className={styles.allMenuItem}
                    onClick={() => handleAllMenuNavigate("/recommendation")}
                  >
                    가격 하락 품목 추천
                  </button>

                  <button
                    type="button"
                    className={styles.allMenuItem}
                    onClick={() => handleAllMenuNavigate("/recommendation")}
                  >
                    이달의 제철 농수산물
                  </button>
                </div>

                {/* 고객센터 */}

                <div className={styles.allMenuGroup}>
                  <strong className={styles.allMenuGroupTitle}>고객센터</strong>

                  <button
                    type="button"
                    className={styles.allMenuItem}
                    onClick={() => handleAllMenuNavigate("/notice")}
                  >
                    공지사항
                  </button>

                  <button
                    type="button"
                    className={styles.allMenuItem}
                    onClick={() => handleAllMenuNavigate("/qna")}
                  >
                    질의응답
                  </button>

                  <button
                    type="button"
                    className={styles.allMenuItem}
                    onClick={() => handleAllMenuNavigate("/faq")}
                  >
                    자주 묻는 질문
                  </button>
                </div>

                {/* 마이페이지 */}

                <div className={styles.allMenuGroup}>
                  <strong className={styles.allMenuGroupTitle}>
                    마이페이지
                  </strong>

                  <button
                    type="button"
                    className={styles.allMenuItem}
                    onClick={() => handleAllMenuNavigate("/mypage/info")}
                  >
                    내 정보 수정
                  </button>

                  <button
                    type="button"
                    className={styles.allMenuItem}
                    onClick={() => handleAllMenuNavigate("/mypage/interests")}
                  >
                    관심품목 & 우리동네 설정
                  </button>

                  <button
                    type="button"
                    className={styles.allMenuItem}
                    onClick={() => handleAllMenuNavigate("/mypage/alerts")}
                  >
                    가격 변동 타겟 알림
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 질의응답 본문 */}

      <main className={styles.container}>
        {/* 페이지 제목 */}

        <section className={styles.pageHeader}>
          <div className={styles.headerText}>
            <h1>질의응답</h1>

            <p>궁금한 점이나 서비스 이용 관련 문의를 남겨주세요.</p>
          </div>
        </section>

        {/* 게시판 탭 */}

        <nav className={styles.boardTabs} aria-label="고객센터 메뉴">
          <button
            type="button"
            className={styles.boardTab}
            onClick={() => navigate("/notice")}
          >
            공지사항
          </button>

          <button
            type="button"
            className={`${styles.boardTab} ${styles.active}`}
            aria-current="page"
          >
            질의응답 게시판
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

        <section className={styles.searchArea} aria-label="질의응답 검색">
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
            className={styles.writeButton}
            onClick={handleWrite}
            title={
              !isLoggedIn ? "로그인 후 글쓰기가 가능합니다." : "질의응답 글쓰기"
            }
          >
            <span className={styles.writeIcon}>+</span>
            글쓰기
          </button>
        </section>

        {/* 검색 결과 */}

        {appliedKeyword && (
          <div className={styles.searchResult} aria-live="polite">
            <span>"{appliedKeyword}"</span> 검색 결과{" "}
            <strong>{totalElements}</strong>건
            <button type="button" onClick={handleResetSearch}>
              검색 초기화
            </button>
          </div>
        )}

        {/* API 오류 */}

        {errorMessage && (
          <div className={styles.empty} role="alert">
            <div className={styles.emptyIcon}>⚠️</div>

            <h3>{errorMessage}</h3>

            <p>잠시 후 다시 시도해주세요.</p>

            <button
              type="button"
              onClick={() => void fetchQnaPosts(currentPage, appliedKeyword)}
            >
              다시 불러오기
            </button>
          </div>
        )}

        {/* 로딩 */}

        {isLoading && !errorMessage && (
          <div className={styles.empty} aria-live="polite">
            <div className={styles.emptyIcon}>⏳</div>

            <h3>Q&A 목록을 불러오는 중입니다.</h3>

            <p>잠시만 기다려주세요.</p>
          </div>
        )}

        {/* 질의응답 게시글 목록 */}

        {!isLoading && !errorMessage && (
          <section className={styles.board} aria-label="질의응답 게시글 목록">
            <div className={styles.tableHeader}>
              <div className={styles.numberColumn}>번호</div>

              <div className={styles.titleColumn}>제목</div>

              <div className={styles.authorColumn}>작성자</div>

              <div className={styles.dateColumn}>날짜</div>

              <div className={styles.viewsColumn}>조회수</div>
            </div>

            {posts.length > 0 ? (
              <div className={styles.tableBody}>
                {posts.map((post, index) => {
                  /*
                   * 게시글 번호
                   */

                  const postNumber =
                    totalElements -
                    ((currentPage - 1) * POSTS_PER_PAGE + index);

                  const answered = hasAnswer(post);

                  const myPost = isMyPost(post);

                  return (
                    <button
                      type="button"
                      key={post.id}
                      className={styles.tableRow}
                      onClick={() => handlePostClick(post)}
                      title={
                        isAdmin
                          ? "관리자 권한으로 게시글 보기"
                          : myPost
                            ? "내 게시글 보기"
                            : isLoggedIn
                              ? "본인이 작성한 게시글만 확인할 수 있습니다."
                              : "로그인 후 게시글을 확인할 수 있습니다."
                      }
                    >
                      <div className={styles.numberColumn}>{postNumber}</div>

                      <div className={styles.titleColumn}>
                        <span className={styles.postTitle}>{post.title}</span>

                        {answered && (
                          <span
                            className={styles.answerStatus}
                            aria-label="답변 완료"
                          >
                            <span className={styles.answerArrow}>↳</span>
                            답변이 완료되었습니다
                          </span>
                        )}

                        {post.attachmentAvailable && (
                          <span
                            aria-label="첨부파일 있음"
                            title="첨부파일 있음"
                          >
                            📎
                          </span>
                        )}
                      </div>

                      <div className={styles.authorColumn}>
                        {post.writerName}
                      </div>

                      <div className={styles.dateColumn}>
                        {formatDate(post.createdAt)}
                      </div>

                      <div className={styles.viewsColumn}>{post.viewCount}</div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>🔍</div>

                <h3>등록된 질의응답이 없습니다.</h3>

                <p>궁금한 내용을 질의응답 글쓰기로 등록해주세요.</p>
              </div>
            )}
          </section>
        )}

        {/* 페이지네이션 */}

        {!isLoading && !errorMessage && totalElements > 0 && (
          <nav className={styles.pagination} aria-label="질의응답 페이지 이동">
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
            전체 <strong>{totalElements}</strong>건
          </span>

          <span className={styles.loginInfo}>
            {isAdmin
              ? "🛡️ 관리자 계정은 모든 질의응답 게시글을 확인할 수 있습니다."
              : "🔒 게시글 내용은 작성자 본인만 확인할 수 있습니다."}
          </span>
        </div>
      </main>
    </div>
  );
}

export default QnaPage;
