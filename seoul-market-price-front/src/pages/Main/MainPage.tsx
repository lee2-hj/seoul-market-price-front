import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getLoginUser, logout } from "@/features/auth/utils/auth";

import styles from "./MainPage.module.css";

/* 자주 찾는 품목 */

const POPULAR_ITEMS = [
  {
    name: "쌀",
    emoji: "🌾",
    category: "식량작물",
    price: "62,700",
    unit: "20kg",
    change: "+0.4%",
    type: "up",
  },
  {
    name: "사과",
    emoji: "🍎",
    category: "과일류",
    price: "8,900",
    unit: "1kg",
    change: "-2.1%",
    type: "down",
  },
  {
    name: "배추",
    emoji: "🥬",
    category: "채소류",
    price: "3,980",
    unit: "1포기",
    change: "+4.2%",
    type: "up",
  },
  {
    name: "감귤",
    emoji: "🍊",
    category: "과일류",
    price: "5,400",
    unit: "1kg",
    change: "-1.8%",
    type: "down",
  },
  {
    name: "고등어",
    emoji: "🐟",
    category: "수산물",
    price: "7,800",
    unit: "1마리",
    change: "-2.7%",
    type: "down",
  },
];

/* 가격 카테고리 */

const CATEGORIES = ["전체", "채소류", "과일류", "수산물"];

/* 가격 비교 데이터 */

const PRICE_DATA = {
  current: "8,900",
  yesterday: "9,100",
  lastMonth: "10,120",
  lastYear: "9,450",
  average: "9,780",
};

/* 서울 자치구 가격 */

const DISTRICTS = [
  { name: "강남구", price: "9,120", change: "+2.1%" },
  { name: "강동구", price: "8,780", change: "-1.2%" },
  { name: "강북구", price: "8,450", change: "-0.8%" },
  { name: "강서구", price: "8,920", change: "+1.4%" },
  { name: "관악구", price: "8,650", change: "-0.4%" },
  { name: "광진구", price: "9,080", change: "+2.8%" },
  { name: "구로구", price: "8,520", change: "-1.7%" },
  { name: "금천구", price: "8,390", change: "-2.1%" },
  { name: "노원구", price: "8,470", change: "+0.6%" },
  { name: "도봉구", price: "8,310", change: "-1.1%" },
  { name: "동대문구", price: "8,960", change: "+1.8%" },
  { name: "동작구", price: "8,820", change: "+0.9%" },
  { name: "마포구", price: "9,240", change: "+3.2%" },
  { name: "서대문구", price: "8,930", change: "-0.6%" },
  { name: "서초구", price: "9,380", change: "+3.8%" },
  { name: "성동구", price: "9,050", change: "+2.4%" },
  { name: "성북구", price: "8,690", change: "-0.9%" },
  { name: "송파구", price: "9,270", change: "+2.9%" },
  { name: "양천구", price: "8,840", change: "+0.7%" },
  { name: "영등포구", price: "9,010", change: "+1.9%" },
  { name: "용산구", price: "9,420", change: "+3.6%" },
  { name: "은평구", price: "8,570", change: "-1.3%" },
  { name: "종로구", price: "9,180", change: "+2.2%" },
  { name: "중구", price: "9,210", change: "+2.5%" },
  { name: "중랑구", price: "8,500", change: "-0.7%" },
];

/* 공지사항 */

const NOTICES = [
  {
    id: 1,
    title: "싸농 서비스 이용 안내입니다.",
    date: "2026.08.04",
    important: true,
  },
  {
    id: 2,
    title: "KAMIS 가격정보 업데이트 안내",
    date: "2026.08.03",
    important: true,
  },
  {
    id: 3,
    title: "농수산물 가격정보 서비스 오픈 안내",
    date: "2026.08.01",
    important: false,
  },
  {
    id: 4,
    title: "싸농 홈페이지 이용약관 변경 안내",
    date: "2026.07.30",
    important: false,
  },
  {
    id: 5,
    title: "서비스 점검 일정 안내",
    date: "2026.07.28",
    important: false,
  },
];

/* Q&A */

const QNA_LIST = [
  {
    id: 1,
    title: "가격정보는 얼마나 자주 업데이트되나요?",
    date: "2026.08.04",
    status: "답변완료",
  },
  {
    id: 2,
    title: "우리 동네 가격은 어떻게 확인하나요?",
    date: "2026.08.03",
    status: "답변완료",
  },
  {
    id: 3,
    title: "가격 데이터 기준이 궁금합니다.",
    date: "2026.08.02",
    status: "답변완료",
  },
  {
    id: 4,
    title: "관심 품목 가격 알림을 받을 수 있나요?",
    date: "2026.08.01",
    status: "답변대기",
  },
  {
    id: 5,
    title: "회원정보 수정은 어디에서 하나요?",
    date: "2026.07.30",
    status: "답변완료",
  },
];

function MainPage() {
  const navigate = useNavigate();

  /* 로그인 사용자 정보 */

  const loginUser = getLoginUser();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("전체");
  const [region, setRegion] = useState("서울");

  /* 로그아웃 */

  const handleLogout = () => {
    logout();

    alert("로그아웃 되었습니다.");

    window.location.href = "/";
  };

  /* 가격 검색 */

  const handleSearch = () => {
    const keyword = search.trim();

    if (!keyword) {
      alert("검색할 품목을 입력해주세요.");
      return;
    }

    navigate(`/price?keyword=${encodeURIComponent(keyword)}`);
  };

  /* 선택된 카테고리의 품목 */

  const filteredItems =
    category === "전체"
      ? POPULAR_ITEMS
      : POPULAR_ITEMS.filter((item) => item.category === category);

  return (
    <div className={styles.mainPage}>
      {/* Header */}

      <header className={styles.header}>
        <div className={styles.headerInner}>
          {/* Logo */}

          <Link to="/" className={styles.logo}>
            <span className={styles.logoIcon}>🥕</span>
            <span className={styles.logoName}>싸.농</span>
            <span className={styles.logoDesc}>싸게 보는 농수산물</span>
          </Link>

          {/* Navigation */}

          <nav className={styles.nav}>
            <Link to="/main" className={styles.navItem}>
              홈
            </Link>

            {/* 가격정보 */}

            <div className={styles.navDropdown}>
              <Link to="/price" className={styles.navItem}>
                가격 상세 정보
                <span className={styles.arrow}>▼</span>
              </Link>

              <div className={styles.dropdownMenu}>
                <Link to="/price">품목별 시세 조회</Link>
                <Link to="/price/detail">가격 추이 그래프</Link>
                <Link to="/price/detail">급상승 / 급락 품목</Link>
              </div>
            </div>

            {/* 자치구별 가격정보 */}

            <div className={styles.navDropdown}>
              <Link to="/region-price" className={styles.navItem}>
                자치구별 가격정보
                <span className={styles.arrow}>▼</span>
              </Link>

              <div className={styles.dropdownMenu}>
                <Link to="/region-price">자치구 지도 비교</Link>
                <Link to="/region-price/my-area">자치구간 1: 1 비교</Link>
              </div>
            </div>

            {/* 스마트 추천 */}

            <div className={styles.navDropdown}>
              <Link to="/region-price" className={styles.navItem}>
                스마트 추천
                <span className={styles.arrow}>▼</span>
              </Link>

              <div className={styles.dropdownMenu}>
                <Link to="/region-price">오늘의 알뜰 품목</Link>
                <Link to="/region-price/my-area">
                  오늘의 가격하락 품목 추천
                </Link>
                <Link to="/region-price/my-area">이달의 제철 농수산물</Link>
              </div>
            </div>

            {/* 고객 센터 */}

            <div className={styles.navDropdown}>
              <span className={styles.navItem}>
                고객센터
                <span className={styles.arrow}>▼</span>
              </span>

              <div className={styles.dropdownMenu}>
                <Link to="/notice">공지사항</Link>
                <Link to="/qna">Q&A</Link>
                <Link to="/faq">자주 묻는 질문</Link>
              </div>
            </div>

            {/* 마이페이지 */}

            <div className={styles.navDropdown}>
              <span className={styles.navItem}>
                마이페이지
                <span className={styles.arrow}>▼</span>
              </span>

              <div className={styles.dropdownMenu}>
                <Link to="/notice">내 정보 수정</Link>
                <Link to="/qna">관심품목&우리동네 설정</Link>
                <Link to="/faq">가격변동 타겟 알림설정</Link>
              </div>
            </div>
          </nav>

          {/* 사용자 영역 */}

          <div className={styles.userArea}>
            <button
              type="button"
              className={styles.userButton}
              onClick={() => navigate("/mypage")}
            >
              <span>👤</span>

              <strong>{loginUser?.name ?? "사용자"}님</strong>
            </button>

            <button
              type="button"
              className={styles.logoutButton}
              onClick={handleLogout}
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <h1>
              내 주변의
              <br />
              <strong>농수산물 어디가 싸농?</strong>
            </h1>

            <p>
              싸농에서 농수산물의 현재 가격과
              <br />
              지역별 가격 차이를 한눈에 비교해보세요.
            </p>

            {/* 검색 */}

            <div className={styles.searchBox}>
              <span>🔍</span>

              <input
                type="text"
                value={search}
                placeholder="사과, 배추, 쌀, 고등어 등을 검색해보세요"
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSearch();
                  }
                }}
              />

              <button type="button" onClick={handleSearch}>
                검색
              </button>
            </div>

            {/* 빠른 검색 */}

            <div className={styles.quickSearch}>
              <span>자주 찾는 품목</span>

              <button type="button" onClick={() => setSearch("쌀")}>
                쌀
              </button>

              <button type="button" onClick={() => setSearch("사과")}>
                사과
              </button>

              <button type="button" onClick={() => setSearch("배추")}>
                배추
              </button>

              <button type="button" onClick={() => setSearch("고등어")}>
                고등어
              </button>
            </div>
          </div>

          {/* 오늘의 대표 가격 */}

          <div className={styles.heroPrice}>
            <div className={styles.heroPriceHeader}>
              <span>오늘의 대표 가격</span>
              <small>서울 / 소매가격</small>
            </div>

            <div className={styles.heroProduct}>
              <span className={styles.heroEmoji}>🍎</span>

              <div>
                <span>과일류</span>
                <strong>사과</strong>
              </div>
            </div>

            <div className={styles.heroPriceValue}>
              8,900
              <small>원 / 1kg</small>
            </div>

            <div className={styles.heroPriceChange}>
              <span>전일 대비</span>
              <strong>▼ 2.1%</strong>
            </div>

            <button
              type="button"
              className={styles.heroDetail}
              onClick={() => navigate("/price")}
            >
              상세 가격 확인 →
            </button>
          </div>
        </div>
      </section>

      {/* Quick Menu */}

      <section className={styles.quickSection}>
        <div className={styles.quickMenu}>
          <Link to="/price" className={styles.quickCard}>
            <span>💰</span>

            <div>
              <strong>간편상세정보</strong>
              <small>현재가격과 등락률을 한눈에</small>
            </div>

            <b>→</b>
          </Link>

          <Link to="/region-price" className={styles.quickCard}>
            <span>📍</span>

            <div>
              <strong>자치구별 가격정보</strong>
              <small>서울 지역별 가격 비교</small>
            </div>

            <b>→</b>
          </Link>

          <Link to="/price/detail" className={styles.quickCard}>
            <span>📊</span>

            <div>
              <strong>스마트 추천</strong>
              <small>가격 하락 품목 추천받기</small>
            </div>

            <b>→</b>
          </Link>

          <Link to="/qna" className={styles.quickCard}>
            <span>💬</span>

            <div>
              <strong>고객센터</strong>
              <small>공지사항과 Q&A를 확인하세요</small>
            </div>

            <b>→</b>
          </Link>
        </div>
      </section>

      {/* 오늘의 가격 현황 */}

      <section className={styles.section}>
        <div className={styles.sectionTitle}>
          <div>
            <span>PRICE DASHBOARD</span>
            <h2>오늘의 가격 현황</h2>
            <p>주요 농수산물의 현재가격과 가격 변동을 확인하세요.</p>
          </div>

          <Link to="/price">전체 가격정보 →</Link>
        </div>

        <div className={styles.filterTabs}>
          {CATEGORIES.map((item) => (
            <button
              type="button"
              key={item}
              className={category === item ? styles.activeTab : ""}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className={styles.productGrid}>
          {filteredItems.map((item) => (
            <button
              type="button"
              key={item.name}
              className={styles.productCard}
              onClick={() =>
                navigate(`/price?keyword=${encodeURIComponent(item.name)}`)
              }
            >
              <div className={styles.productTop}>
                <span className={styles.productEmoji}>{item.emoji}</span>

                <span className={styles.productCategory}>{item.category}</span>
              </div>

              <h3>{item.name}</h3>

              <div className={styles.productPrice}>
                {item.price}
                <small>원 / {item.unit}</small>
              </div>

              <div className={styles.productChange}>
                <span>전일 대비</span>

                <strong
                  className={item.type === "up" ? styles.up : styles.down}
                >
                  {item.type === "up" ? "▲" : "▼"}{" "}
                  {item.change.replace(/[+-]/g, "")}
                </strong>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 가격 비교 */}

      <section className={styles.comparisonSection}>
        <div className={styles.sectionTitle}>
          <div>
            <span>PRICE COMPARISON</span>
            <h2>사과 가격 비교</h2>
            <p>기준시점별 가격을 비교하여 현재 가격 수준을 확인하세요.</p>
          </div>

          <button type="button" onClick={() => navigate("/price")}>
            가격 상세보기 →
          </button>
        </div>

        <div className={styles.comparisonGrid}>
          <div className={styles.currentPriceCard}>
            <span>현재가격</span>

            <strong>
              {PRICE_DATA.current}
              <small>원</small>
            </strong>

            <em>▼ 2.1%</em>

            <p>서울 / 소매가격 / 상품 기준</p>
          </div>

          <div className={styles.referenceCard}>
            <div>
              <span>전일</span>
              <strong>{PRICE_DATA.yesterday}원</strong>
              <em>+200원</em>
            </div>

            <div>
              <span>전월</span>
              <strong>{PRICE_DATA.lastMonth}원</strong>
              <em>-1,220원</em>
            </div>

            <div>
              <span>전년</span>
              <strong>{PRICE_DATA.lastYear}원</strong>
              <em>-550원</em>
            </div>

            <div>
              <span>평년</span>
              <strong>{PRICE_DATA.average}원</strong>
              <em>-880원</em>
            </div>
          </div>
        </div>
      </section>

      {/* 자치구별 가격 */}

      <section className={styles.section}>
        <div className={styles.sectionTitle}>
          <div>
            <span>SEOUL DISTRICT PRICE</span>
            <h2>우리 동네 가격은 얼마일까요?</h2>
            <p>자치구별 가격을 비교하여 저렴한 지역을 찾아보세요.</p>
          </div>

          <select
            value={region}
            onChange={(event) => setRegion(event.target.value)}
            className={styles.regionSelect}
          >
            <option value="서울">서울</option>
          </select>
        </div>

        <div className={styles.districtLayout}>
          <div className={styles.districtGrid}>
            {DISTRICTS.map((district) => (
              <button
                type="button"
                key={district.name}
                className={styles.districtCard}
                onClick={() =>
                  navigate(
                    `/region-price?district=${encodeURIComponent(
                      district.name,
                    )}`,
                  )
                }
              >
                <span>{district.name}</span>

                <strong>
                  {district.price}
                  <small>원</small>
                </strong>

                <em
                  className={
                    district.change.startsWith("+") ? styles.up : styles.down
                  }
                >
                  {district.change}
                </em>
              </button>
            ))}
          </div>

          <div className={styles.districtSummary}>
            <span>현재 선택 기준</span>

            <h3>서울 자치구 가격</h3>

            <strong>
              8,390
              <small>원</small>
            </strong>

            <p>
              현재 가장 저렴한 지역은
              <b> 금천구</b>입니다.
            </p>

            <button type="button" onClick={() => navigate("/region-price")}>
              자치구별 상세 비교
            </button>
          </div>
        </div>
      </section>

      {/* 공지사항 및 Q&A */}

      <section className={styles.boardSection}>
        <div className={styles.boardHeader}>
          <div>
            <span>COMMUNITY</span>
            <h2>싸농 소식과 궁금한 이야기</h2>
            <p>서비스 공지사항과 이용자들의 질문을 확인해보세요.</p>
          </div>
        </div>

        <div className={styles.boardGrid}>
          {/* 공지사항 */}

          <div className={styles.boardBox}>
            <div className={styles.boardBoxHeader}>
              <div>
                <span>NOTICE</span>
                <h3>공지사항</h3>
              </div>

              <Link to="/notice">더보기 →</Link>
            </div>

            <div className={styles.boardList}>
              {NOTICES.map((notice) => (
                <button
                  type="button"
                  key={notice.id}
                  className={styles.boardItem}
                  onClick={() => navigate(`/notice/${notice.id}`)}
                >
                  <div className={styles.boardItemTitle}>
                    {notice.important && (
                      <span className={styles.noticeBadge}>중요</span>
                    )}

                    <strong>{notice.title}</strong>
                  </div>

                  <span className={styles.boardDate}>{notice.date}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Q&A */}

          <div className={styles.boardBox}>
            <div className={styles.boardBoxHeader}>
              <div>
                <span>Q&A</span>
                <h3>Q&A</h3>
              </div>

              <Link to="/qna">더보기 →</Link>
            </div>

            <div className={styles.boardList}>
              {QNA_LIST.map((qna) => (
                <button
                  type="button"
                  key={qna.id}
                  className={styles.boardItem}
                  onClick={() => navigate(`/qna/${qna.id}`)}
                >
                  <div className={styles.boardItemTitle}>
                    <span
                      className={
                        qna.status === "답변완료"
                          ? styles.answerComplete
                          : styles.answerWaiting
                      }
                    >
                      {qna.status}
                    </span>

                    <strong>{qna.title}</strong>
                  </div>

                  <span className={styles.boardDate}>{qna.date}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 서비스 메뉴 */}

      <section className={styles.serviceSection}>
        <div className={styles.serviceCard}>
          <span>❓</span>

          <div>
            <strong>자주 묻는 질문</strong>
            <p>가격정보와 서비스 이용방법을 확인하세요.</p>
          </div>

          <Link to="/faq">바로가기 →</Link>
        </div>

        <div className={styles.serviceCard}>
          <span>💬</span>

          <div>
            <strong>Q&A 게시판</strong>
            <p>궁금한 내용을 문의하고 답변을 확인하세요.</p>
          </div>

          <Link to="/qna">바로가기 →</Link>
        </div>

        <div className={styles.serviceCard}>
          <span>👤</span>

          <div>
            <strong>마이페이지</strong>
            <p>관심 품목과 가격 알림을 관리하세요.</p>
          </div>

          <Link to="/mypage">바로가기 →</Link>
        </div>
      </section>

      {/* API 안내 */}

      <section className={styles.apiNotice}>
        <div>
          <span>📊</span>

          <div>
            <strong>KAMIS 농수산물 가격정보 연동</strong>

            <p>
              농수산물유통정보(KAMIS)의 가격정보를 기반으로 서비스를 제공합니다.
            </p>
          </div>
        </div>

        <span className={styles.apiStatus}>● 데이터 서비스 정상</span>
      </section>

      {/* Footer */}

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLogo}>
            <span>🥕</span>
            <strong>싸.농</strong>
            <small>싸게 보는 농수산물</small>
          </div>

          <div className={styles.footerLinks}>
            <Link to="/price">가격정보</Link>
            <Link to="/region-price">지역별 가격</Link>
            <Link to="/notice">공지사항</Link>
            <Link to="/qna">Q&A</Link>
            <Link to="/mypage">마이페이지</Link>
          </div>

          <p>© 2026 싸농. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default MainPage;
