import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getLoginUser, logout } from "@/features/auth/utils/auth";
import styles from "./PricePage.module.css";

/* 품목별 시세 데이터 */

interface PriceItem {
  id: number;
  category: string;
  name: string;
  unit: string;
  price: number;
  previousPrice: number;
  market: string;
  date: string;
}

/* 검색 조건 */

type SearchType = "all" | "name" | "category";

/* 테스트용 품목별 시세 데이터 */

const PRICE_ITEMS: PriceItem[] = [
  {
    id: 1,
    category: "과일",
    name: "사과",
    unit: "1kg",
    price: 3980,
    previousPrice: 3800,
    market: "서울",
    date: "2026.08.06",
  },
  {
    id: 2,
    category: "과일",
    name: "배",
    unit: "1kg",
    price: 4520,
    previousPrice: 4600,
    market: "서울",
    date: "2026.08.06",
  },
  {
    id: 3,
    category: "채소",
    name: "배추",
    unit: "1포기",
    price: 2300,
    previousPrice: 2240,
    market: "서울",
    date: "2026.08.06",
  },
  {
    id: 4,
    category: "채소",
    name: "무",
    unit: "1개",
    price: 1680,
    previousPrice: 1750,
    market: "서울",
    date: "2026.08.06",
  },
  {
    id: 5,
    category: "채소",
    name: "양파",
    unit: "1kg",
    price: 1980,
    previousPrice: 1900,
    market: "서울",
    date: "2026.08.06",
  },
  {
    id: 6,
    category: "채소",
    name: "감자",
    unit: "1kg",
    price: 2450,
    previousPrice: 2520,
    market: "서울",
    date: "2026.08.06",
  },
  {
    id: 7,
    category: "과일",
    name: "수박",
    unit: "1개",
    price: 15900,
    previousPrice: 16500,
    market: "서울",
    date: "2026.08.06",
  },
  {
    id: 8,
    category: "과일",
    name: "복숭아",
    unit: "1kg",
    price: 6980,
    previousPrice: 6500,
    market: "서울",
    date: "2026.08.06",
  },
  {
    id: 9,
    category: "수산물",
    name: "고등어",
    unit: "1마리",
    price: 3200,
    previousPrice: 3500,
    market: "서울",
    date: "2026.08.06",
  },
  {
    id: 10,
    category: "수산물",
    name: "오징어",
    unit: "1마리",
    price: 4980,
    previousPrice: 4700,
    market: "서울",
    date: "2026.08.06",
  },
  {
    id: 11,
    category: "수산물",
    name: "갈치",
    unit: "1마리",
    price: 8500,
    previousPrice: 8900,
    market: "서울",
    date: "2026.08.06",
  },
  {
    id: 12,
    category: "채소",
    name: "대파",
    unit: "1kg",
    price: 2980,
    previousPrice: 2900,
    market: "서울",
    date: "2026.08.06",
  },
];

/* 가격 변화 계산 */

const getPriceChange = (price: number, previousPrice: number): number => {
  if (previousPrice === 0) {
    return 0;
  }

  return ((price - previousPrice) / previousPrice) * 100;
};

/* 가격 표시 */

const formatPrice = (price: number): string => {
  return `${price.toLocaleString("ko-KR")}원`;
};

/* Price Page */

function PricePage() {
  const navigate = useNavigate();

  /* 검색 */

  const [searchType, setSearchType] = useState<SearchType>("all");

  const [searchKeyword, setSearchKeyword] = useState("");

  /* 카테고리 */

  const [selectedCategory, setSelectedCategory] = useState("전체");

  /* 조회 결과 */

  const [searched, setSearched] = useState(false);

  /* 로그인 사용자 (zustand 기준) */

  const loginUser = getLoginUser();

  const loginUserName = loginUser?.name || loginUser?.userId || "사용자";

  /* 관리자 여부 */

  const isAdminUser = (): boolean => {
    const role = loginUser?.role;

    if (!role) {
      return false;
    }

    const normalizedRole = role.toUpperCase();

    return normalizedRole === "ADMIN" || normalizedRole === "ROLE_ADMIN";
  };

  const isAdmin = isAdminUser();

  /* 검색 결과 */

  const filteredItems = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return PRICE_ITEMS.filter((item) => {
      /* 카테고리 필터 */

      if (selectedCategory !== "전체" && item.category !== selectedCategory) {
        return false;
      }

      /* 검색어가 없으면 카테고리 결과만 반환 */

      if (!keyword) {
        return true;
      }

      /* 전체 검색 */

      if (searchType === "all") {
        return (
          item.name.toLowerCase().includes(keyword) ||
          item.category.toLowerCase().includes(keyword)
        );
      }

      /* 품목명 검색 */

      if (searchType === "name") {
        return item.name.toLowerCase().includes(keyword);
      }

      /* 카테고리 검색 */

      if (searchType === "category") {
        return item.category.toLowerCase().includes(keyword);
      }

      return true;
    });
  }, [searchKeyword, searchType, selectedCategory]);

  /* 조회 버튼 */

  const handleSearch = () => {
    setSearched(true);
  };

  /* Enter 검색 */

  const handleSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  /* 로그아웃 */

  const handleLogout = async () => {
    await logout();

    navigate("/");
  };

  /* 페이지 새로고침 */

  const handleRefresh = () => {
    setSearchKeyword("");
    setSearchType("all");
    setSelectedCategory("전체");
    setSearched(false);
  };

  /* 카테고리 목록 */

  const categories = ["전체", "과일", "채소", "수산물"];

  return (
    <div className={styles.page}>
      {/* 사용자 영역 */}

      <div className={styles.topUserBar}>
        <div className={styles.topUserInner}>
          <div className={styles.userArea}>
            <span className={styles.userName}>
              {loginUserName}

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
              <button
                type="button"
                className={`${styles.navItem} ${styles.activeNavItem}`}
              >
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
          <div>
            <span className={styles.pageLabel}>PRICE INFORMATION</span>

            <h1>품목별 시세 조회</h1>

            <p>서울 지역 농수산물의 현재 가격을 품목별로 확인할 수 있습니다.</p>
          </div>
        </section>

        {/* 검색 영역 */}

        <section className={styles.searchCard}>
          <div className={styles.searchHeader}>
            <div>
              <h2>품목 검색</h2>

              <p>확인하고 싶은 농수산물의 가격을 검색해보세요.</p>
            </div>
          </div>

          <div className={styles.searchArea}>
            <select
              className={styles.searchSelect}
              value={searchType}
              onChange={(event) =>
                setSearchType(event.target.value as SearchType)
              }
              aria-label="검색 종류"
            >
              <option value="all">전체</option>
              <option value="name">품목명</option>
              <option value="category">분류</option>
            </select>

            <input
              type="text"
              className={styles.searchInput}
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="품목명을 입력해주세요."
            />

            <button
              type="button"
              className={styles.searchButton}
              onClick={handleSearch}
            >
              조회
            </button>

            <button
              type="button"
              className={styles.resetButton}
              onClick={handleRefresh}
            >
              초기화
            </button>
          </div>

          {/* 카테고리 */}

          <div className={styles.categoryArea}>
            <span className={styles.categoryLabel}>분류</span>

            <div className={styles.categoryButtons}>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={
                    selectedCategory === category
                      ? `${styles.categoryButton} ${styles.selectedCategory}`
                      : styles.categoryButton
                  }
                  onClick={() => {
                    setSelectedCategory(category);
                    setSearched(true);
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 가격 정보 */}

        <section className={styles.priceSection}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionLabel}>TODAY PRICE</span>

              <h2>오늘의 품목별 시세</h2>

              <p>
                {searched
                  ? "검색 조건에 맞는 가격 정보입니다."
                  : "서울 지역 기준 테스트 가격 정보입니다."}
              </p>
            </div>

            <div className={styles.resultInfo}>
              총 <strong>{filteredItems.length}</strong>개 품목
            </div>
          </div>

          {/* 가격 테이블 */}

          <div className={styles.tableWrapper}>
            <table className={styles.priceTable}>
              <thead>
                <tr>
                  <th>분류</th>
                  <th>품목</th>
                  <th>단위</th>
                  <th>현재 가격</th>
                  <th>전일 가격</th>
                  <th>전일 대비</th>
                  <th>기준 지역</th>
                  <th>기준일</th>
                </tr>
              </thead>

              <tbody>
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => {
                    const change = getPriceChange(
                      item.price,
                      item.previousPrice,
                    );

                    const isUp = change > 0;
                    const isDown = change < 0;

                    return (
                      <tr key={item.id}>
                        <td>
                          <span className={styles.categoryBadge}>
                            {item.category}
                          </span>
                        </td>

                        <td className={styles.itemName}>{item.name}</td>

                        <td>{item.unit}</td>

                        <td className={styles.currentPrice}>
                          {formatPrice(item.price)}
                        </td>

                        <td>{formatPrice(item.previousPrice)}</td>

                        <td>
                          <span
                            className={
                              isUp
                                ? styles.priceUp
                                : isDown
                                  ? styles.priceDown
                                  : styles.priceSame
                            }
                          >
                            {isUp ? "▲" : isDown ? "▼" : "-"}{" "}
                            {Math.abs(change).toFixed(1)}%
                          </span>
                        </td>

                        <td>{item.market}</td>

                        <td>{item.date}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className={styles.noResult}>
                      <span>🔎</span>

                      <strong>검색 결과가 없습니다.</strong>

                      <p>다른 품목명이나 분류로 다시 검색해주세요.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 가격 안내 */}

        <section className={styles.priceNotice}>
          <div className={styles.noticeIcon}>💡</div>

          <div>
            <strong>가격 정보 안내</strong>

            <p>
              현재 표시되는 가격은 화면 구성 및 기능 확인을 위한 테스트
              데이터입니다.
              <br />
              추후 KAMIS 농산물유통정보 API를 연동하여 실제 농수산물 가격 정보를
              제공합니다.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default PricePage;
