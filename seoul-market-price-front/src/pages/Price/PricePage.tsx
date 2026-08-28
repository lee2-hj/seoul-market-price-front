import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getLoginUser, logout } from "@/features/auth/utils/auth";
import styles from "./PricePage.module.css";

/* 단지별 실거래가 시세 데이터 */

interface PriceItem {
  id: number;
  category: string;
  name: string;
  unit: string;
  price: number; // 만원 단위 (예: 425000 = 42억 5,000만원)
  previousPrice: number;
  market: string;
  date: string;
}

/* 검색 조건 */

type SearchType = "all" | "name" | "category";

/* 아파트 단지별 실거래가 데이터 */

const PRICE_ITEMS: PriceItem[] = [
  {
    id: 1,
    category: "서초구",
    name: "래미안 원베일리",
    unit: "84㎡ (34평)",
    price: 425000,
    previousPrice: 418000,
    market: "서초구",
    date: "2026.08.10",
  },
  {
    id: 2,
    category: "서초구",
    name: "아크로리버파크",
    unit: "84㎡ (34평)",
    price: 398000,
    previousPrice: 402000,
    market: "서초구",
    date: "2026.08.09",
  },
  {
    id: 3,
    category: "마포구",
    name: "마포래미안푸르지오",
    unit: "84㎡ (34평)",
    price: 187000,
    previousPrice: 182000,
    market: "마포구",
    date: "2026.08.09",
  },
  {
    id: 4,
    category: "송파구",
    name: "잠실엘스",
    unit: "84㎡ (34평)",
    price: 245000,
    previousPrice: 249000,
    market: "송파구",
    date: "2026.08.08",
  },
  {
    id: 5,
    category: "송파구",
    name: "헬리오시티",
    unit: "84㎡ (34평)",
    price: 213000,
    previousPrice: 208000,
    market: "송파구",
    date: "2026.08.08",
  },
  {
    id: 6,
    category: "강동구",
    name: "고덕그라시움",
    unit: "84㎡ (34평)",
    price: 168000,
    previousPrice: 165000,
    market: "강동구",
    date: "2026.08.07",
  },
  {
    id: 7,
    category: "서대문구",
    name: "DMC파크뷰자이",
    unit: "84㎡ (34평)",
    price: 135000,
    previousPrice: 133000,
    market: "서대문구",
    date: "2026.08.07",
  },
  {
    id: 8,
    category: "강남구",
    name: "래미안대치팰리스",
    unit: "84㎡ (34평)",
    price: 335000,
    previousPrice: 328000,
    market: "강남구",
    date: "2026.08.06",
  },
  {
    id: 9,
    category: "성동구",
    name: "옥수리버젠",
    unit: "84㎡ (34평)",
    price: 175000,
    previousPrice: 178000,
    market: "성동구",
    date: "2026.08.06",
  },
  {
    id: 10,
    category: "마포구",
    name: "신촌그랑자이",
    unit: "59㎡ (24평)",
    price: 152000,
    previousPrice: 149000,
    market: "마포구",
    date: "2026.08.05",
  },
  {
    id: 11,
    category: "양천구",
    name: "목동신시가지7단지",
    unit: "66㎡ (27평)",
    price: 198000,
    previousPrice: 202000,
    market: "양천구",
    date: "2026.08.05",
  },
  {
    id: 12,
    category: "노원구",
    name: "상계주공7단지",
    unit: "59㎡ (24평)",
    price: 68000,
    previousPrice: 69500,
    market: "노원구",
    date: "2026.08.04",
  },
];

/* 가격 변화 계산 */

const getPriceChange = (price: number, previousPrice: number): number => {
  if (previousPrice === 0) {
    return 0;
  }

  return ((price - previousPrice) / previousPrice) * 100;
};

/* 가격 표시 (억/만 단위 포맷) */

const formatPrice = (price: number): string => {
  if (price >= 10000) {
    const eok = Math.floor(price / 10000);
    const man = price % 10000;
    return man > 0 ? `${eok}억 ${man.toLocaleString("ko-KR")}만` : `${eok}억`;
  }
  return `${price.toLocaleString("ko-KR")}만원`;
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
          item.category.toLowerCase().includes(keyword) ||
          item.unit.toLowerCase().includes(keyword)
        );
      }

      /* 단지명 검색 */

      if (searchType === "name") {
        return item.name.toLowerCase().includes(keyword);
      }

      /* 자치구 검색 */

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

  /* 자치구 목록 */

  const categories = [
    "전체",
    "서초구",
    "강남구",
    "송파구",
    "마포구",
    "강동구",
    "서대문구",
    "성동구",
    "양천구",
    "노원구",
  ];

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
            aria-label="싸부 홈으로 이동"
          >
            싸부
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
                단지별 실거래가
              </button>

              <div className={styles.megaMenu}>
                <div className={styles.megaColumn}>
                  <strong>단지 시세정보</strong>

                  <button type="button" onClick={() => navigate("/price")}>
                    단지별 실거래가 조회
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/price/detail")}
                  >
                    가격 추이 그래프
                  </button>

                  <button type="button" onClick={() => navigate("/price")}>
                    급상승 / 급락 단지
                  </button>
                </div>
              </div>
            </div>

            {/* 자치구별 가격정보 */}

            <div className={styles.navMenu}>
              <button type="button" className={styles.navItem}>
                자치구별 아파트 시세
              </button>

              <div className={styles.megaMenu}>
                <div className={styles.megaColumn}>
                  <strong>자치구별 시세 비교</strong>

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
                    평형대별 시세 비교
                  </button>
                </div>
              </div>
            </div>

            {/* 스마트 추천 */}

            <div className={styles.navMenu}>
              <button type="button" className={styles.navItem}>
                스마트 알뜰 추천
              </button>

              <div className={styles.megaMenu}>
                <div className={styles.megaColumn}>
                  <strong>스마트 추천</strong>

                  <button
                    type="button"
                    onClick={() => navigate("/recommendation")}
                  >
                    오늘의 알뜰 추천 단지
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/recommendation")}
                  >
                    저평가 & 급매 단지 추천
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/recommendation")}
                  >
                    입주 예정 인기 단지
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

            <h1>단지별 실거래가 시세 조회</h1>

            <p>서울 지역 아파트 실거래가 및 매매/전세 시세를 단지별로 확인할 수 있습니다.</p>
          </div>
        </section>

        {/* 검색 영역 */}

        <section className={styles.searchCard}>
          <div className={styles.searchHeader}>
            <div>
              <h2>아파트 단지 검색</h2>

              <p>확인하고 싶은 아파트 단지의 실거래 가격을 검색해보세요.</p>
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
              <option value="name">단지명</option>
              <option value="category">자치구</option>
            </select>

            <input
              type="text"
              className={styles.searchInput}
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="아파트 단지명을 입력해주세요. (예: 래미안, 자이, 힐스테이트)"
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
            <span className={styles.categoryLabel}>자치구</span>

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

              <h2>오늘의 단지별 실거래가</h2>

              <p>
                {searched
                  ? "검색 조건에 맞는 아파트 실거래가 정보입니다."
                  : "서울 지역 기준 최근 아파트 실거래가 정보입니다."}
              </p>
            </div>

            <div className={styles.resultInfo}>
              총 <strong>{filteredItems.length}</strong>개 단지
            </div>
          </div>

          {/* 가격 테이블 */}

          <div className={styles.tableWrapper}>
            <table className={styles.priceTable}>
              <thead>
                <tr>
                  <th>자치구</th>
                  <th>단지명</th>
                  <th>전용면적</th>
                  <th>최근 실거래가</th>
                  <th>직전 거래가</th>
                  <th>변동률</th>
                  <th>지역</th>
                  <th>거래일자</th>
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

                      <p>다른 아파트 단지명이나 자치구로 다시 검색해주세요.</p>
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
            <strong>부동산 실거래가 정보 안내</strong>

            <p>
              현재 표시되는 가격은 서울시 열린데이터광장 부동산 실거래가 공개시스템 데이터를 기반으로
              제공됩니다.
              <br />
              싸부(SSABU)는 실시간 아파트 실거래가와 단지별 시세 비교 정보를 투명하게
              제공합니다.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default PricePage;
