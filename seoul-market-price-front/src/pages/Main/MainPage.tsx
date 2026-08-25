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
  X,
} from "lucide-react";

import styles from "./MainPage.module.css";
import {
  searchNaturalWithAiApi,
  type AiSearchResponse,
  type DistrictRankingResponse,
  type DongRegionResponse,
  type PriceRankingResponse,
  type TradeVolumeRankingResponse,
} from "@/api/api";

const AI_MODEL_LABEL = import.meta.env.VITE_AI_MODEL || "gpt-5.6-luna";

function formatAiMoneyText(text?: string): string {
  if (!text) return "";
  return text.replace(/(?<![\d,])(\d{5,})(?![\d,])/g, (value) =>
    Number(value).toLocaleString("ko-KR"),
  );
}

function isTradeVolumeRankingResponse(
  result: AiSearchResponse | TradeVolumeRankingResponse | PriceRankingResponse | DistrictRankingResponse,
): result is TradeVolumeRankingResponse {
  return "totalDealCount" in result;
}

function isPriceRankingResponse(
  result: AiSearchResponse | TradeVolumeRankingResponse | PriceRankingResponse | DistrictRankingResponse,
): result is PriceRankingResponse {
  return "metricType" in result && result.metricType !== "district_pyeong";
}

function isDistrictRankingResponse(
  result: AiSearchResponse | TradeVolumeRankingResponse | PriceRankingResponse | DistrictRankingResponse,
): result is DistrictRankingResponse {
  return "metricType" in result && result.metricType === "district_pyeong";
}

function toAiDisplayResult(
  result: AiSearchResponse | TradeVolumeRankingResponse | PriceRankingResponse | DistrictRankingResponse,
): AiSearchResponse {
  if (isDistrictRankingResponse(result)) {
    return {
      summary: "서울시 자치구 평균 평단가 순위입니다.",
      criteria: result.criteria,
      keyPoints: result.items.map(
        (item) => `${item.rank}. ${item.districtName} · 평균 평단가 ${item.averagePyeongAmount.toLocaleString("ko-KR")}만원/평 · 거래 ${item.dealCount.toLocaleString("ko-KR")}건`,
      ),
      cautions: result.baseDate ? [`기준일: ${result.baseDate}`] : [],
    };
  }
  if (isPriceRankingResponse(result)) {
    const metricLabel = result.metricType === "pyeong" ? "평당가" : "평균 거래가";
    const metricUnit = result.metricType === "pyeong" ? "만원/평" : "만원";
    return {
      summary: `${result.regionName} ${metricLabel} 상위 아파트입니다.`,
      criteria: result.criteria,
      keyPoints: result.items.map(
        (item) => `${item.rank}. ${item.regionName ? `${item.regionName} · ` : ""}${item.apartmentName} · ${metricLabel} ${item.metricValue?.toLocaleString("ko-KR") ?? "정보 없음"}${metricUnit} · 거래 ${item.dealCount}건`,
      ),
      cautions: result.baseDate ? [`기준일: ${result.baseDate}`] : [],
    };
  }
  if (!isTradeVolumeRankingResponse(result)) return result;

  return {
    summary: `${result.regionName} 거래량 상위 아파트입니다.`,
    criteria: result.criteria,
    keyPoints: result.items.map(
      (item) => `${item.rank}. ${item.regionName ? `${item.regionName} · ` : ""}${item.apartmentName} · 거래 ${item.dealCount}건 · 평균 거래가 ${item.averageTradeAmount?.toLocaleString("ko-KR") ?? "정보 없음"}만원`,
    ),
    cautions: [
      `조회 기간: ${result.periodStart} ~ ${result.periodEnd}`,
      `해당 지역 전체 거래량: ${result.totalDealCount.toLocaleString("ko-KR")}건`,
    ],
  };
}

const APARTMENTS = [
  {
    name: "래미안 원베일리",
    district: "서초구",
    price: "42억 5,000만",
    area: "84㎡",
    change: "-3.8%",
    image: "/apartments/apartment-1.jpg",
  },
  {
    name: "마포래미안푸르지오",
    district: "마포구",
    price: "18억 7,000만",
    area: "84㎡",
    change: "-5.2%",
    image: "/apartments/apartment-2.jpg",
  },
  {
    name: "헬리오시티",
    district: "송파구",
    price: "24억 5,000만",
    area: "84㎡",
    change: "-4.7%",
    image: "/apartments/apartment-3.jpg",
  },
  {
    name: "고덕그라시움",
    district: "강동구",
    price: "16억 8,000만",
    area: "84㎡",
    change: "-3.6%",
    image: "/apartments/apartment-4.jpg",
  },
  {
    name: "DMC파크뷰자이",
    district: "서대문구",
    price: "13억 5,000만",
    area: "84㎡",
    change: "-4.1%",
    image: "/apartments/apartment-5.jpg",
  },
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
  const [aiResult, setAiResult] = useState<AiSearchResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [candidateGroups, setCandidateGroups] = useState<
    DongRegionResponse[][]
  >([]);
  const [candidateStep, setCandidateStep] = useState(0);
  const [selectedRegions, setSelectedRegions] = useState<DongRegionResponse[]>(
    [],
  );
  const [singleCandidates, setSingleCandidates] = useState<DongRegionResponse[]>([]);

  const runNaturalSearch = async (question: string) => {
    const response = await searchNaturalWithAiApi(question);
    if (response.status === "SUCCESS" && response.result) {
      setAiResult({
        ...toAiDisplayResult(response.result),
        interpretation: response.interpretation,
      });
      setAiError(null);
      setSearch("");
      return;
    }
    if (response.status === "NEED_CLARIFICATION") {
      const slots = [...new Set(response.candidates.map((candidate) => candidate.slot))];
      const groups = slots.map((slot) => response.candidates.filter((candidate) => candidate.slot === slot));
      if (groups.length === 1) setSingleCandidates(groups[0]);
      else {
        setCandidateGroups(groups);
        setSelectedRegions([]);
        setCandidateStep(0);
      }
      setAiError(null);
      return;
    }
    setAiResult(null);
    setAiError(response.message || "검색 결과를 찾을 수 없습니다.");
    setSearch("");
  };

  const chartPoints = useMemo(
    () =>
      TREND.map(
        (value, index) => `${35 + index * 66},${112 - (value - 40) * 18}`,
      ).join(" "),
    [],
  );

  const handleSearch = async () => {
    const keyword = search.trim();
    if (!keyword) return;
    setAiLoading(true);
    setAiError(null);
    try {
      await runNaturalSearch(keyword);
    } catch (error: any) {
      setAiResult(null);
      setAiError(error?.response?.data?.message || error?.response?.data?.detail || "검색 결과를 찾을 수 없습니다.");
    } finally {
      setAiLoading(false);
    }
  };

  const chooseCandidate = async (candidate: DongRegionResponse) => {
    const next = [...selectedRegions];
    next[candidateStep] = candidate;
    const nextStep = candidateStep + 1;
    const unresolved = candidateGroups.findIndex(
      (group, index) => index >= nextStep && group.length > 1,
    );
    if (unresolved >= 0) {
      setSelectedRegions(next);
      setCandidateStep(unresolved);
      return;
    }
    const selected = candidateGroups.map(
      (group, index) => next[index] || group[0],
    );
    setCandidateGroups([]);
    setAiLoading(true);
    try {
      await runNaturalSearch(
          `${selected[0].sggName} ${selected[0].dongName}과 ${selected[1].sggName} ${selected[1].dongName} 가격 비교해줘`,
      );
    } catch {
      setAiError("AI 분석에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setAiLoading(false);
    }
  };

  const explainSingleCandidate = async (candidate: DongRegionResponse) => {
    setSingleCandidates([]);
    setAiLoading(true);
    setAiError(null);
    try {
      await runNaturalSearch(`${candidate.sggName} ${candidate.dongName} 가격 알려줘`);
    } catch (error: any) {
      setAiError(error?.response?.data?.message || error?.response?.data?.detail || "단일 지역 AI 분석에 실패했습니다.");
    } finally {
      setAiLoading(false);
    }
  };

  const toggleFavorite = (name: string) => {
    setFavorites((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
  };

  return (
    <div className={styles.dashboard}>
      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>SMART REAL ESTATE</span>
            <h1>
              오늘 가장 저렴한
              <br />
              <strong>아파트를 한눈에</strong>
            </h1>
            <p>
              서울 아파트 실거래가를 비교하고,
              <br />
              시세보다 저렴한 매물을 찾아보세요.
            </p>
          </div>

          <div className={styles.searchArea}>
            <div className={styles.searchBox}>
              <Search aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => { setSearch(event.target.value); setAiError(null); }}
                onKeyDown={(event) => event.key === "Enter" && handleSearch()}
                placeholder="자치구 자치동을 입력하여 비교해보세요"
                aria-label="아파트 검색"
              />
              <button type="button" onClick={handleSearch}>
                검색
              </button>
            </div>
            {aiLoading && <p>AI가 가격을 비교하고 있습니다...</p>}
            {aiError && <p role="alert">{aiError}</p>}
          </div>

          <div className={styles.heroVisual} aria-hidden="true">
            <img src="/apartment-hero.png" alt="" />
          </div>
        </section>

        {singleCandidates.length > 0 && (
          <div className={styles.aiModalBackdrop}>
            <section className={styles.aiModal} role="dialog" aria-modal="true" aria-label="단일 지역 선택">
              <button className={styles.aiModalClose} type="button" aria-label="선택 닫기" onClick={() => setSingleCandidates([])}><X /></button>
              <span className={styles.aiModalEyebrow}>SELECT REGION</span>
              <h2>{singleCandidates[0]?.requestedName}의 지역을 선택해주세요</h2>
              <p className={styles.aiChoiceHint}>같은 이름의 동이 여러 자치구에 있습니다.</p>
              <div className={styles.aiCandidateList}>
                {singleCandidates.map((candidate) => <button key={`${candidate.sggCode}-${candidate.dongCode}`} type="button" className={styles.aiCandidateButton} onClick={() => void explainSingleCandidate(candidate)}><strong>{candidate.sggName}</strong><span>{candidate.dongName}</span><ChevronRight /></button>)}
              </div>
            </section>
          </div>
        )}
        {candidateGroups.length > 0 && (
          <div className={styles.aiModalBackdrop}>
            <section
              className={styles.aiModal}
              role="dialog"
              aria-modal="true"
              aria-label="지역 선택"
            >
              <button
                className={styles.aiModalClose}
                type="button"
                aria-label="선택 닫기"
                onClick={() => setCandidateGroups([])}
              >
                <X />
              </button>
              <span className={styles.aiModalEyebrow}>SELECT REGION</span>
              <h2>
                {candidateGroups[candidateStep]?.[0]?.requestedName}의 지역을
                선택해주세요
              </h2>
              <p className={styles.aiChoiceHint}>
                같은 이름의 동이 여러 지역에 있습니다.
              </p>
              <div className={styles.aiCandidateList}>
                {candidateGroups[candidateStep]?.map((candidate) => (
                  <button
                    key={`${candidate.sggCode}-${candidate.dongCode}`}
                    type="button"
                    className={styles.aiCandidateButton}
                    onClick={() => void chooseCandidate(candidate)}
                  >
                    <strong>{candidate.sggName}</strong>
                    <span>{candidate.dongName}</span>
                    <ChevronRight />
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
        {aiResult && (
          <div
            className={styles.aiModalBackdrop}
            role="presentation"
            onClick={() => setAiResult(null)}
          >
            <section
              className={styles.aiModal}
              role="dialog"
              aria-modal="true"
              aria-label="AI 가격 비교 결과"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className={styles.aiModalClose}
                type="button"
                aria-label="결과 닫기"
                onClick={() => setAiResult(null)}
              >
                <X />
              </button>
              <span className={styles.aiModalEyebrow}>AI PRICE INSIGHT</span>
              <span className={styles.aiModalModel}>
                model · {AI_MODEL_LABEL}
              </span>
              <h2>{formatAiMoneyText(aiResult.summary)}</h2>
              {aiResult.interpretation && (
                <div className={styles.aiInterpretation} aria-label="AI 질문 해석 기준">
                  <Lightbulb aria-hidden="true" />
                  <div>
                    <strong>
                      ‘{aiResult.interpretation.originalConcept}’을(를){" "}
                      {aiResult.interpretation.appliedMetric} 기준으로 해석했습니다.
                    </strong>
                    <p>{aiResult.interpretation.reason}</p>
                    <span>
                      해석 신뢰도 {Math.round(aiResult.interpretation.confidence * 100)}%
                      {aiResult.interpretation.proxy ? " · 대체 지표" : ""}
                    </span>
                  </div>
                </div>
              )}
              {aiResult.criteria && (
                <div className={styles.aiModalCriteria} aria-label="결과 기준">
                  <strong>결과 기준</strong>
                  <div>
                    <span>{aiResult.criteria.metric}</span>
                    <span>{aiResult.criteria.unit}</span>
                    <span>{aiResult.criteria.period}</span>
                    <span>거래 {aiResult.criteria.minimumTradeCount}건 이상</span>
                    <span>{aiResult.criteria.sortDirection}</span>
                  </div>
                </div>
              )}
              <h3>핵심 포인트</h3>
              <ul>
                {aiResult.keyPoints.map((point) => (
                  <li key={point}>{formatAiMoneyText(point)}</li>
                ))}
              </ul>
              {aiResult.cautions.length > 0 && (
                <div className={styles.aiModalCaution}>
                  <b>참고사항</b>
                  <p>{formatAiMoneyText(aiResult.cautions.join(" "))}</p>
                </div>
              )}
            </section>
          </div>
        )}

        <section className={styles.summary} aria-label="대표 단지 가격 요약">
          <div className={styles.apartmentSummary}>
            <div className={styles.apartmentImage}>
              <Building2 />
            </div>
            <div>
              <span>오늘의 대표 단지</span>
              <h2>래미안 원베일리</h2>
              <p>서초구 반포동 · 전용 84㎡</p>
            </div>
          </div>
          <div className={styles.metrics}>
            <article>
              <span>최근 실거래가</span>
              <strong>42억 5,000만</strong>
              <small>2026.08.10 거래</small>
            </article>
            <article className={styles.savingMetric}>
              <span>시세 대비</span>
              <strong>
                3.8% <em>저렴</em>
              </strong>
              <small>지역 평균보다 1억 7,000만 낮음</small>
            </article>
          </div>
        </section>

        <section className={styles.middleGrid}>
          <article className={styles.card}>
            <header>
              <h2>서울 지역별 평균가 비교</h2>
              <button type="button" onClick={() => navigate("/price")}>
                전체 보기 <ChevronRight />
              </button>
            </header>
            <div className={styles.districtBody}>
              <div
                className={styles.mapVisual}
                aria-label="서울 자치구 가격 지도"
              >
                <div className={styles.mapLegend}>
                  <span>낮음</span>
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <span>높음</span>
                </div>
                <img
                  src="/seoul-district-map.svg"
                  alt="서울 25개 자치구 실거래가 비교 지도"
                />
                <span className={styles.mapPin}>
                  <MapPin /> 강북구 최저가
                </span>
              </div>
              <ol className={styles.ranking}>
                {DISTRICTS.map((district, index) => (
                  <li key={district.name}>
                    <b>{index + 1}</b>
                    <span>{district.name}</span>
                    <strong>{district.price}</strong>
                  </li>
                ))}
              </ol>
            </div>
          </article>

          <article className={styles.card}>
            <header>
              <h2>실거래가 추이</h2>
              <div className={styles.rangeTabs}>
                {["7일", "30일", "90일"].map((item) => (
                  <button
                    type="button"
                    key={item}
                    data-active={range === item}
                    onClick={() => setRange(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </header>
            <div className={styles.chart}>
              <span className={styles.chartUnit}>억 원</span>
              <svg
                viewBox="0 0 470 150"
                role="img"
                aria-label="래미안 원베일리 실거래가 추이"
              >
                {[35, 70, 105].map((y) => (
                  <line key={y} x1="28" y1={y} x2="445" y2={y} />
                ))}
                <polyline points={chartPoints} />
                {TREND.map((value, index) => (
                  <g key={value + index}>
                    <circle
                      cx={35 + index * 66}
                      cy={112 - (value - 40) * 18}
                      r="4"
                    />
                    <text x={35 + index * 66} y={100 - (value - 40) * 18}>
                      {value}
                    </text>
                    <text className={styles.date} x={35 + index * 66} y="139">
                      8/{4 + index}
                    </text>
                  </g>
                ))}
              </svg>
              <p>래미안 원베일리 전용 84㎡ 최근 실거래 기준</p>
            </div>
          </article>

          <article className={`${styles.card} ${styles.insight}`}>
            <header>
              <h2>싸부의 한마디</h2>
              <span>분석 완료</span>
            </header>
            <div>
              <i>
                <Lightbulb />
              </i>
              <h3>
                관심 아파트의 실거래가를
                <br />
                1:1로 맞비교하고
                <br />
                <strong>최적의 매물을 찾아보세요.</strong>
              </h3>
            </div>
            <button
              type="button"
              onClick={() => navigate("/price/compare-apartment")}
            >
              아파트별 비교하기 <ChevronRight />
            </button>
          </article>
        </section>

        <section className={styles.bottomGrid}>
          <article className={`${styles.card} ${styles.bargains}`}>
            <header>
              <h2>급매 후보 TOP 5</h2>
              <button type="button" onClick={() => navigate("/price")}>
                더보기 <ChevronRight />
              </button>
            </header>
            <div className={styles.bargainList}>
              {APARTMENTS.map((item, index) => (
                <button
                  type="button"
                  key={item.name}
                  className={styles.bargainItem}
                  onClick={() =>
                    navigate(`/price?keyword=${encodeURIComponent(item.name)}`)
                  }
                >
                  <b>{index + 1}</b>
                  <span className={styles.tower}>
                    <img src={item.image} alt={`${item.name} 아파트`} />
                  </span>
                  <strong>{item.name}</strong>
                  <small>{item.price}</small>
                  <em>{item.change}</em>
                  <span
                    role="button"
                    tabIndex={0}
                    className={styles.favorite}
                    data-active={favorites.includes(item.name)}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleFavorite(item.name);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") toggleFavorite(item.name);
                    }}
                  >
                    <Heart />
                  </span>
                </button>
              ))}
            </div>
          </article>

          <article className={`${styles.card} ${styles.recommendation}`}>
            <header>
              <h2>오늘의 추천</h2>
              <button type="button" onClick={() => navigate("/price")}>
                더보기 <ChevronRight />
              </button>
            </header>
            <div>
              <i>
                <MapPin />
              </i>
              <p>
                <span>가격 좋은 지역</span>
                <strong>
                  노원구에서
                  <br />
                  <em>7억원대</em> 아파트를 확인해보세요
                </strong>
                <small>노원구 평균 84㎡ 시세 7억 9,000만</small>
              </p>
            </div>
            <nav>
              {["노원구", "도봉구", "강북구", "중랑구"].map((district) => (
                <button
                  key={district}
                  type="button"
                  onClick={() => navigate(`/price?keyword=${district}`)}
                >
                  {district}
                </button>
              ))}
            </nav>
          </article>

          <article className={`${styles.card} ${styles.alert}`}>
            <header>
              <h2>가격 알림</h2>
            </header>
            <div>
              <i>
                <Bell />
              </i>
              <p>
                관심 단지의 가격 변동을
                <br />
                실시간으로 알려드려요.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/mypage?tab=NOTIFICATION")}
            >
              가격 알림 설정하기
            </button>
          </article>
        </section>

        <div className={styles.source}>
          본 가격 정보는 국토교통부 실거래가 공개시스템 데이터를 기반으로 하며,
          목 데이터로 표시됩니다.<span>최종 업데이트 2026.08.11</span>
        </div>
      </main>
    </div>
  );
}
