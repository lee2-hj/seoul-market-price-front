import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Building2,
  ChevronRight,
  Heart,
  Lightbulb,
  MapPin,
  Search,
} from "lucide-react";

import styles from "./MainPage.module.css";

const APARTMENTS = [
  { name: "래미안 원베일리", district: "서초구", price: "42억 5,000만", area: "84㎡", change: "-3.8%", image: "/apartments/apartment-1.jpg" },
  { name: "마포래미안푸르지오", district: "마포구", price: "18억 7,000만", area: "84㎡", change: "-5.2%", image: "/apartments/apartment-2.jpg" },
  { name: "헬리오시티", district: "송파구", price: "24억 5,000만", area: "84㎡", change: "-4.7%", image: "/apartments/apartment-3.jpg" },
  { name: "고덕그라시움", district: "강동구", price: "16억 8,000만", area: "84㎡", change: "-3.6%", image: "/apartments/apartment-4.jpg" },
  { name: "DMC파크뷰자이", district: "서대문구", price: "13억 5,000만", area: "84㎡", change: "-4.1%", image: "/apartments/apartment-5.jpg" },
];

const DISTRICTS = [
  { name: "강남구", price: "27억 8,000만", level: 5 },
  { name: "서초구", price: "26억 5,000만", level: 5 },
  { name: "송파구", price: "19억 8,000만", level: 4 },
  { name: "용산구", price: "18억 9,000만", level: 4 },
  { name: "성동구", price: "15억 8,000만", level: 3 },
];

const TREND = [41, 41.8, 42.6, 43.1, 42.7, 42.9, 42.5];

export default function MainPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("7일");
  const [favorites, setFavorites] = useState<string[]>([]);

  const chartPoints = useMemo(
    () => TREND.map((value, index) => `${35 + index * 66},${112 - (value - 40) * 18}`).join(" "),
    [],
  );

  const handleSearch = () => {
    const keyword = search.trim();
    navigate(keyword ? `/price?keyword=${encodeURIComponent(keyword)}` : "/price");
  };

  const toggleFavorite = (name: string) => {
    setFavorites((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  };

  return (
    <div className={styles.dashboard}>
      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>SMART REAL ESTATE</span>
            <h1>오늘 가장 저렴한<br /><strong>아파트를 한눈에</strong></h1>
            <p>서울 아파트 실거래가를 비교하고,<br />시세보다 저렴한 매물을 찾아보세요.</p>
          </div>

          <div className={styles.searchArea}>
            <div className={styles.searchBox}>
              <Search aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleSearch()}
                placeholder="아파트명 또는 자치구를 검색해보세요"
                aria-label="아파트 검색"
              />
              <button type="button" onClick={handleSearch}>검색</button>
            </div>
          </div>

          <div className={styles.heroVisual} aria-hidden="true">
            <img src="/apartment-hero.png" alt="" />
          </div>
        </section>

        <section className={styles.summary} aria-label="대표 단지 가격 요약">
          <div className={styles.apartmentSummary}>
            <div className={styles.apartmentImage}><Building2 /></div>
            <div><span>오늘의 대표 단지</span><h2>래미안 원베일리</h2><p>서초구 반포동 · 전용 84㎡</p></div>
          </div>
          <div className={styles.metrics}>
            <article><span>최근 실거래가</span><strong>42억 5,000만</strong><small>2026.08.10 거래</small></article>
            <article className={styles.savingMetric}><span>시세 대비</span><strong>3.8% <em>저렴</em></strong><small>지역 평균보다 1억 7,000만 낮음</small></article>
          </div>
        </section>

        <section className={styles.middleGrid}>
          <article className={styles.card}>
            <header><h2>서울 지역별 평균가 비교</h2><button type="button" onClick={() => navigate("/price")}>전체 보기 <ChevronRight /></button></header>
            <div className={styles.districtBody}>
              <div className={styles.mapVisual} aria-label="서울 자치구 가격 지도">
                <div className={styles.mapLegend}><span>낮음</span><i /><i /><i /><i /><i /><span>높음</span></div>
                <img src="/seoul-district-map.svg" alt="서울 25개 자치구 실거래가 비교 지도" />
                <span className={styles.mapPin}><MapPin /> 강북구 최저가</span>
              </div>
              <ol className={styles.ranking}>
                {DISTRICTS.map((district, index) => <li key={district.name}><b>{index + 1}</b><span>{district.name}</span><strong>{district.price}</strong></li>)}
              </ol>
            </div>
          </article>

          <article className={styles.card}>
            <header><h2>실거래가 추이</h2><div className={styles.rangeTabs}>{["7일", "30일", "90일"].map((item) => <button type="button" key={item} data-active={range === item} onClick={() => setRange(item)}>{item}</button>)}</div></header>
            <div className={styles.chart}>
              <span className={styles.chartUnit}>억 원</span>
              <svg viewBox="0 0 470 150" role="img" aria-label="래미안 원베일리 실거래가 추이">
                {[35, 70, 105].map((y) => <line key={y} x1="28" y1={y} x2="445" y2={y} />)}
                <polyline points={chartPoints} />
                {TREND.map((value, index) => <g key={value + index}><circle cx={35 + index * 66} cy={112 - (value - 40) * 18} r="4" /><text x={35 + index * 66} y={100 - (value - 40) * 18}>{value}</text><text className={styles.date} x={35 + index * 66} y="139">8/{4 + index}</text></g>)}
              </svg>
              <p>래미안 원베일리 전용 84㎡ 최근 실거래 기준</p>
            </div>
          </article>

          <article className={`${styles.card} ${styles.insight}`}>
            <header><h2>싸부의 한마디</h2><span>분석 완료</span></header>
            <div><i><Lightbulb /></i><h3>최근 거래가가 지역<br />평균보다 낮아<br /><strong>지금 비교하기 좋습니다.</strong></h3></div>
            <button type="button" onClick={() => navigate("/price")}>자세히 보기 <ChevronRight /></button>
          </article>
        </section>

        <section className={styles.bottomGrid}>
          <article className={`${styles.card} ${styles.bargains}`}>
            <header><h2>급매 후보 TOP 5</h2><button type="button" onClick={() => navigate("/price")}>더보기 <ChevronRight /></button></header>
            <div className={styles.bargainList}>
              {APARTMENTS.map((item, index) => (
                <button type="button" key={item.name} className={styles.bargainItem} onClick={() => navigate(`/price?keyword=${encodeURIComponent(item.name)}`)}>
                  <b>{index + 1}</b><span className={styles.tower}><img src={item.image} alt={`${item.name} 아파트`} /></span><strong>{item.name}</strong><small>{item.price}</small><em>{item.change}</em>
                  <span role="button" tabIndex={0} className={styles.favorite} data-active={favorites.includes(item.name)} onClick={(event) => { event.stopPropagation(); toggleFavorite(item.name); }} onKeyDown={(event) => { if (event.key === "Enter") toggleFavorite(item.name); }}><Heart /></span>
                </button>
              ))}
            </div>
          </article>

          <article className={`${styles.card} ${styles.recommendation}`}>
            <header><h2>오늘의 추천</h2><button type="button" onClick={() => navigate("/price")}>더보기 <ChevronRight /></button></header>
            <div><i><MapPin /></i><p><span>가격 좋은 지역</span><strong>노원구에서<br /><em>7억원대</em> 아파트를 확인해보세요</strong><small>노원구 평균 84㎡ 시세 7억 9,000만</small></p></div>
            <nav>{["노원구", "도봉구", "강북구", "중랑구"].map((district) => <button key={district} type="button" onClick={() => navigate(`/price?keyword=${district}`)}>{district}</button>)}</nav>
          </article>

          <article className={`${styles.card} ${styles.alert}`}>
            <header><h2>가격 알림</h2></header>
            <div><i><Bell /></i><p>관심 단지의 가격 변동을<br />실시간으로 알려드려요.</p></div>
            <button type="button" onClick={() => navigate("/mypage?tab=NOTIFICATION")}>가격 알림 설정하기</button>
          </article>
        </section>

        <div className={styles.source}>본 가격 정보는 국토교통부 실거래가 공개시스템 데이터를 기반으로 하며, 목 데이터로 표시됩니다.<span>최종 업데이트 2026.08.11</span></div>
      </main>
    </div>
  );
}
