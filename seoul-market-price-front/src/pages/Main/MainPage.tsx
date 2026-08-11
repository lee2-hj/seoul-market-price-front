import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import styles from "./MainPage.module.css";

/* 자주 찾는 인기 아파트 단지 */

const POPULAR_ITEMS = [
  {
    name: "래미안 원베일리",
    emoji: "🏢",
    category: "서초구",
    price: "42억 5,000",
    unit: "전용 84㎡",
    change: "+1.7%",
    type: "up",
  },
  {
    name: "마포래미안푸르지오",
    emoji: "🏢",
    category: "마포구",
    price: "18억 7,000",
    unit: "전용 84㎡",
    change: "+2.7%",
    type: "up",
  },
  {
    name: "잠실엘스",
    emoji: "🏢",
    category: "송파구",
    price: "24억 5,000",
    unit: "전용 84㎡",
    change: "-1.6%",
    type: "down",
  },
  {
    name: "헬리오시티",
    emoji: "🏢",
    category: "송파구",
    price: "21억 3,000",
    unit: "전용 84㎡",
    change: "+2.4%",
    type: "up",
  },
  {
    name: "고덕그라시움",
    emoji: "🏢",
    category: "강동구",
    price: "16억 8,000",
    unit: "전용 84㎡",
    change: "+1.8%",
    type: "up",
  },
  {
    name: "DMC파크뷰자이",
    emoji: "🏢",
    category: "서대문구",
    price: "13억 5,000",
    unit: "전용 84㎡",
    change: "+1.5%",
    type: "up",
  },
];

/* 지역 카테고리 */

const CATEGORIES = ["전체", "서초구", "마포구", "송파구", "강동구", "서대문구"];

/* 가격 비교 데이터 (마포래미안푸르지오 84㎡) */

const PRICE_DATA = {
  current: "18억 7,000만",
  yesterday: "18억 2,000만",
  lastMonth: "17억 8,000만",
  lastYear: "16억 5,000만",
  average: "15억 8,000만",
};

/* 서울 자치구별 아파트 평균 실거래가 (84㎡ 기준) */

const DISTRICTS = [
  { name: "강남구", price: "27억 8,000만", change: "+2.1%" },
  { name: "서초구", price: "26억 5,000만", change: "+1.8%" },
  { name: "송파구", price: "19억 8,000만", change: "+1.5%" },
  { name: "용산구", price: "18억 9,000만", change: "+1.6%" },
  { name: "성동구", price: "15억 8,000만", change: "+1.4%" },
  { name: "마포구", price: "14억 5,000만", change: "+1.2%" },
  { name: "광진구", price: "13억 9,000만", change: "+0.8%" },
  { name: "양천구", price: "13억 5,000만", change: "+0.7%" },
  { name: "영등포구", price: "12억 8,000만", change: "+0.9%" },
  { name: "강동구", price: "12억 2,000만", change: "+0.6%" },
  { name: "동작구", price: "11억 9,000만", change: "+0.5%" },
  { name: "중구", price: "11억 5,000만", change: "+0.3%" },
  { name: "종로구", price: "11억 2,000만", change: "+0.2%" },
  { name: "서대문구", price: "10억 5,000만", change: "+0.4%" },
  { name: "동대문구", price: "9억 8,000만", change: "+0.3%" },
  { name: "성북구", price: "9억 2,000만", change: "-0.2%" },
  { name: "은평구", price: "8억 9,000만", change: "-0.4%" },
  { name: "강서구", price: "8억 8,000만", change: "+0.3%" },
  { name: "관악구", price: "8억 5,000만", change: "-0.1%" },
  { name: "구로구", price: "8억 2,000만", change: "-0.3%" },
  { name: "노원구", price: "7억 9,000만", change: "-0.5%" },
  { name: "중랑구", price: "7억 5,000만", change: "-0.2%" },
  { name: "강북구", price: "7억 2,000만", change: "-0.4%" },
  { name: "금천구", price: "6억 9,000만", change: "-0.6%" },
  { name: "도봉구", price: "6억 8,000만", change: "-0.8%" },
];

/* 공지사항 */

const NOTICES = [
  {
    id: 1,
    title: "싸부 서비스 이용 안내입니다.",
    date: "2026.08.04",
    important: true,
  },
  {
    id: 2,
    title: "부동산 실거래가 가격정보 업데이트 안내",
    date: "2026.08.03",
    important: true,
  },
  {
    id: 3,
    title: "부동산 가격정보 서비스 오픈 안내",
    date: "2026.08.01",
    important: false,
  },
  {
    id: 4,
    title: "싸부 홈페이지 이용약관 변경 안내",
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

/* 질의응답 */

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
    title: "회원가입 후 이용 가능한 기능은 무엇인가요?",
    date: "2026.08.02",
    status: "답변대기",
  },
  {
    id: 4,
    title: "데이터 출처는 어디인가요?",
    date: "2026.07.31",
    status: "답변완료",
  },
  {
    id: 5,
    title: "서비스 오류 제보는 어디로 하나요?",
    date: "2026.07.29",
    status: "답변완료",
  },
];

export default function MainPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("전체");
  const [region, setRegion] = useState("서울");

  /* 검색 실행 */

  const handleSearch = () => {
    const keyword = search.trim();

    if (!keyword) {
      alert("검색할 아파트 단지명 또는 평형을 입력해주세요.");
      return;
    }

    navigate(`/price?keyword=${encodeURIComponent(keyword)}`);
  };

  /* 선택된 카테고리의 단지 목록 */

  const filteredItems =
    category === "전체"
      ? POPULAR_ITEMS
      : POPULAR_ITEMS.filter((item) => item.category === category);

  return (
    <div className={styles.mainPage}>
      {/* Hero */}

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <h1>
              내 주변의
              <br />
              <strong>싸게 보는 부동산</strong>
            </h1>

            <p>
              싸부에서 아파트의 현재 실거래가와
              <br />
              지역별 시세 차이를 한눈에 비교해보세요.
            </p>

            {/* 검색 */}

            <div className={styles.searchBox}>
              <span>🔍</span>

              <input
                type="text"
                value={search}
                placeholder="원하시는 아파트 단지 또는 평형을 검색해보세요"
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
              <span>자주 찾는 평형</span>

              <button
                type="button"
                onClick={() => setSearch("전용 84㎡(구 34평형)")}
              >
                전용 84㎡(구 34평형)
              </button>

              <button
                type="button"
                onClick={() => setSearch("전용 59㎡(구 24평형)")}
              >
                전용 59㎡(구 24평형)
              </button>

              <button
                type="button"
                onClick={() => setSearch("전용 49㎡(구 21평형)")}
              >
                전용 49㎡(구 21평형)
              </button>
            </div>
          </div>

          {/* 오늘의 대표 실거래가 */}

          <div className={styles.heroPrice}>
            <div className={styles.heroPriceHeader}>
              <span>오늘의 대표 실거래가</span>
              <small>서울 / 실거래 기준</small>
            </div>

            <div className={styles.heroProduct}>
              <span className={styles.heroEmoji}>🏢</span>

              <div>
                <span>마포구</span>
                <strong>마포래미안푸르지오</strong>
              </div>
            </div>

            <div className={styles.heroPriceValue}>
              18억 7,000
              <small>만원 / 전용 84㎡</small>
            </div>

            <div className={styles.heroPriceChange}>
              <span>전월 대비</span>
              <strong>▲ 2.7%</strong>
            </div>

            <button
              type="button"
              className={styles.heroDetail}
              onClick={() => navigate("/price")}
            >
              단지 실거래가 확인 →
            </button>
          </div>
        </div>
      </section>

      {/* Quick Menu */}

      <section className={styles.quickSection}>
        <div className={styles.quickMenu}>
          <Link to="/price" className={styles.quickCard}>
            <span>🏢</span>

            <div>
              <strong>단지별 실거래가</strong>
              <small>현재가격과 등락률을 한눈에</small>
            </div>

            <b>→</b>
          </Link>

          <Link to="/region-price" className={styles.quickCard}>
            <span>📍</span>

            <div>
              <strong>자치구별 아파트 시세</strong>
              <small>서울 25개 자치구 시세 비교</small>
            </div>

            <b>→</b>
          </Link>

          <Link to="/recommendation" className={styles.quickCard}>
            <span>📊</span>

            <div>
              <strong>스마트 알뜰 추천</strong>
              <small>저평가 & 급매 아파트 추천</small>
            </div>

            <b>→</b>
          </Link>

          <Link to="/qna" className={styles.quickCard}>
            <span>💬</span>

            <div>
              <strong>고객센터</strong>
              <small>공지사항과 질의응답을 확인하세요</small>
            </div>

            <b>→</b>
          </Link>
        </div>
      </section>

      {/* 오늘의 단지별 시세 현황 */}

      <section className={styles.section}>
        <div className={styles.sectionTitle}>
          <div>
            <span>PRICE DASHBOARD</span>
            <h2>오늘의 단지별 시세 현황</h2>
            <p>서울 주요 인기 아파트 단지의 실거래가와 가격 변동을 확인하세요.</p>
          </div>

          <Link to="/price">전체 단지 시세 →</Link>
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
                <small>만원 / {item.unit}</small>
              </div>

              <div className={styles.productChange}>
                <span>전월 대비</span>

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
            <h2>마포래미안푸르지오 시세 비교</h2>
            <p>기준시점별 실거래가를 비교하여 현재 가격 수준을 확인하세요.</p>
          </div>

          <button type="button" onClick={() => navigate("/price")}>
            단지 상세 시세 →
          </button>
        </div>

        <div className={styles.comparisonGrid}>
          <div className={styles.currentPriceCard}>
            <span>최근 실거래가</span>

            <strong>
              {PRICE_DATA.current}
              <small>원</small>
            </strong>

            <em>▲ 2.7%</em>

            <p>서울 마포구 아현동 / 전용 84㎡ 기준</p>
          </div>

          <div className={styles.referenceCard}>
            <div>
              <span>전월 실거래</span>
              <strong>{PRICE_DATA.yesterday}원</strong>
              <em>+5,000만원</em>
            </div>

            <div>
              <span>3개월 전</span>
              <strong>{PRICE_DATA.lastMonth}원</strong>
              <em>+9,000만원</em>
            </div>

            <div>
              <span>전년 동기</span>
              <strong>{PRICE_DATA.lastYear}원</strong>
              <em>+2억 2,000만원</em>
            </div>

            <div>
              <span>2년 전</span>
              <strong>{PRICE_DATA.average}원</strong>
              <em>+2억 9,000만원</em>
            </div>
          </div>
        </div>
      </section>

      {/* 자치구별 아파트 시세 */}

      <section className={styles.section}>
        <div className={styles.sectionTitle}>
          <div>
            <span>SEOUL DISTRICT PRICE</span>
            <h2>우리 동네 아파트 평균 시세는 얼마일까요?</h2>
            <p>자치구별 84㎡ 기준 평균 실거래가를 비교하여 합리적인 지역을 찾아보세요.</p>
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

            <h3>서울 자치구 평균가</h3>

            <strong>
              13억 2,000
              <small>만원</small>
            </strong>

            <p>
              현재 가장 합리적인 지역은
              <b> 도봉구</b>입니다.
            </p>

            <button type="button" onClick={() => navigate("/region-price")}>
              자치구별 상세 비교
            </button>
          </div>
        </div>
      </section>

      {/* 공지사항 및 질의응답 */}

      <section className={styles.boardSection}>
        <div className={styles.boardHeader}>
          <div>
            <span>COMMUNITY</span>
            <h2>싸부 소식과 궁금한 이야기</h2>
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

          {/* 질의응답 */}

          <div className={styles.boardBox}>
            <div className={styles.boardBoxHeader}>
              <div>
                <span>Q&amp;A</span>
                <h3>질의응답</h3>
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
            <strong>질의응답 게시판</strong>
            <p>궁금한 내용을 문의하고 답변을 확인하세요.</p>
          </div>

          <Link to="/qna">바로가기 →</Link>
        </div>
      </section>

      {/* API 안내 */}

      <section className={styles.apiNotice}>
        <div>
          <span>📊</span>

          <div>
            <strong>국토교통부 실거래가 공개시스템 연동</strong>

            <p>
              국토교통부 및 서울시 부동산 실거래가 정보를 기반으로 투명한 시세 서비스를 제공합니다.
            </p>
          </div>
        </div>

        <span className={styles.apiStatus}>● 데이터 서비스 정상</span>
      </section>
    </div>
  );
}
