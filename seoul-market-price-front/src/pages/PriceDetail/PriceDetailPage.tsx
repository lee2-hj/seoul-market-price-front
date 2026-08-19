import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Map,
  BarChart3,
  Layers,
  Search,
  TrendingUp,
  TrendingDown,
  Calendar,
  Sparkles,
  HelpCircle,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  Loader2,
  MapPin,
} from "lucide-react";

import {
  getSggsApi,
  getDongsApi,
  getComplexesApi,
  type SggItem,
  type DongItem,
  type ComplexDetailItem as ComplexInfo,
} from "@/api/api";
import styles from "./PriceDetailPage.module.css";

/* 사이드바 네비게이션 */
const NAV_ITEMS = [
  { label: "지역별 비교(리스트)", to: "/price/compare-list", icon: BarChart3 },
  { label: "지역별 비교(지도)", to: "/region-map", icon: Map },
  { label: "단지별 시세", to: "/price/detail", icon: Building2 },
  { label: "아파트별 비교", to: "/price/compare-apartment", icon: Layers },
];

/* 금액 포맷 유틸리티 (e.g. 348000 -> 34억 8,000만 원) */
function formatPriceKRW(priceInMan: number): string {
  const eok = Math.floor(priceInMan / 10000);
  const remainderMan = priceInMan % 10000;
  if (eok === 0) return `${remainderMan.toLocaleString()}만 원`;
  if (remainderMan === 0) return `${eok}억 원`;
  return `${eok}억 ${remainderMan.toLocaleString()}만 원`;
}

export default function PriceDetailPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  /* 1. 자치구 API 조회 */
  const { data: apiSggs = [], isLoading: isSggLoading } = useQuery<SggItem[]>({
    queryKey: ["locationSggs"],
    queryFn: getSggsApi,
    staleTime: 1000 * 60 * 30, // 30분
  });

  const sggList = apiSggs;

  /* 콤보박스 선택 상태 */
  const [selectedSggCd, setSelectedSggCd] = useState<string>("");
  const [selectedDongNm, setSelectedDongNm] = useState<string>("");

  /* URL 파라미터가 있을 경우 초기값 설정 */
  useEffect(() => {
    const paramSgg = searchParams.get("sgg");
    const paramDong = searchParams.get("dong");
    if (paramSgg && sggList.length > 0) {
      const foundSgg = sggList.find((s) => s.sggNm === paramSgg || s.sggCd === paramSgg);
      if (foundSgg) {
        queueMicrotask(() => {
          setSelectedSggCd(foundSgg.sggCd);
          if (paramDong) {
            setSelectedDongNm(paramDong);
          }
        });
      }
    }
  }, [searchParams, sggList]);

  /* 현재 선택된 자치구 객체 */
  const selectedSgg = useMemo(() => {
    if (!selectedSggCd) return null;
    return sggList.find((s) => s.sggCd === selectedSggCd) || null;
  }, [selectedSggCd, sggList]);

  /* 2. 자치동 API 조회 */
  const { data: apiDongs = [], isLoading: isDongLoading } = useQuery<DongItem[]>({
    queryKey: ["locationDongs", selectedSggCd],
    queryFn: () => getDongsApi(selectedSggCd),
    enabled: Boolean(selectedSggCd),
    staleTime: 1000 * 60 * 30,
  });

  /* 동 목록 생성 (DB API 결과 사용) */
  const dongList: DongItem[] = apiDongs;

  /* 검색 키워드 & 선택된 단지 및 평형 */
  const [keyword, setKeyword] = useState("");
  const [selectedComplexId, setSelectedComplexId] = useState<string | null>(null);
  const [selectedPyungIndex, setSelectedPyungIndex] = useState(1); // Default 84㎡

  /* 3. 아파트 단지 목록 DB API 조회 */
  const { data: apiComplexes = [], isLoading: isComplexesLoading } = useQuery<ComplexInfo[]>({
    queryKey: ["locationComplexes", selectedSgg?.sggNm, selectedDongNm],
    queryFn: () => getComplexesApi(selectedSgg?.sggNm || "", selectedDongNm),
    enabled: Boolean(selectedSgg?.sggNm && selectedDongNm),
    staleTime: 1000 * 60 * 10,
  });

  const complexes = apiComplexes;

  /* 키워드 필터링된 단지 목록 */
  const filteredComplexes = useMemo(() => {
    if (!keyword.trim()) return complexes;
    return complexes.filter((c) => c.name.toLowerCase().includes(keyword.toLowerCase().trim()));
  }, [complexes, keyword]);

  /* 현재 선택된 아파트 단지 */
  const currentComplex = useMemo(() => {
    if (!complexes.length) return null;
    if (selectedComplexId) {
      const found = complexes.find((c) => c.id === selectedComplexId);
      if (found) return found;
    }
    return filteredComplexes[0] || complexes[0];
  }, [selectedComplexId, complexes, filteredComplexes]);

  /* 콤보 박스: 자치구 변경 이벤트 */
  const handleSggChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextSggCd = e.target.value;
    setSelectedSggCd(nextSggCd);
    setSelectedDongNm(""); // 동 선택 초기화
    setSelectedComplexId(null);
    setSelectedPyungIndex(1);

    const foundSgg = sggList.find((s) => s.sggCd === nextSggCd);
    if (foundSgg) {
      setSearchParams({ sgg: foundSgg.sggNm });
    } else {
      setSearchParams({});
    }
  };

  /* 콤보 박스: 자치동 변경 이벤트 */
  const handleDongChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextDongNm = e.target.value;
    setSelectedDongNm(nextDongNm);
    setSelectedComplexId(null);
    setSelectedPyungIndex(1);

    if (selectedSgg) {
      if (nextDongNm) {
        setSearchParams({ sgg: selectedSgg.sggNm, dong: nextDongNm });
      } else {
        setSearchParams({ sgg: selectedSgg.sggNm });
      }
    }
  };

  /* 초기화 */
  const handleReset = () => {
    setSelectedSggCd("");
    setSelectedDongNm("");
    setSelectedComplexId(null);
    setSearchParams({});
  };

  const activePyung = currentComplex?.pyungs[selectedPyungIndex] || currentComplex?.pyungs[0];

  /* 12개월 시세 추이 데이터 계산 */
  const chartPoints = useMemo(() => {
    if (!activePyung) return [];
    const baseSale = activePyung.salePrice;
    const baseRent = activePyung.rentPrice;
    const months = [
      "25.09", "25.10", "25.11", "25.12",
      "26.01", "26.02", "26.03", "26.04",
      "26.05", "26.06", "26.07", "26.08",
    ];

    const fluctuations = [-0.03, -0.025, -0.015, -0.01, 0, 0.008, 0.015, 0.022, 0.028, 0.035, 0.042, 0.05];

    return months.map((month, idx) => {
      const factor = 1 + fluctuations[idx];
      return {
        month,
        sale: Math.round((baseSale * factor) / 100) * 100,
        rent: Math.round((baseRent * (1 + fluctuations[idx] * 0.7)) / 100) * 100,
      };
    });
  }, [activePyung]);

  /* 실거래 내역 샘플 */
  const recentTrades = useMemo(() => {
    if (!activePyung) return [];
    const base = activePyung.salePrice;
    return [
      { date: "2026.08.10", floor: "19층", type: "매매", price: base, change: "+6,000만", isUp: true },
      { date: "2026.08.02", floor: "14층", type: "전세", price: activePyung.rentPrice, change: "+2,000만", isUp: true },
      { date: "2026.07.28", floor: "23층", type: "매매", price: base - 4000, change: "+1,500만", isUp: true },
      { date: "2026.07.15", floor: "8층", type: "매매", price: base - 7000, change: "-1,000만", isUp: false },
      { date: "2026.07.01", floor: "11층", type: "전세", price: activePyung.rentPrice - 3000, change: "보합", isUp: null },
    ];
  }, [activePyung]);

  return (
    <main className={styles.pageContainer}>
      <div className={styles.mainGrid}>
        {/* =========================================
            좌측 사이드바 메뉴
        ========================================= */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <h2 className={styles.sidebarTitle}>가격정보</h2>
            <nav className={styles.sidebarNav} aria-label="가격정보 메뉴">
              {NAV_ITEMS.map(({ label, to, icon: Icon }) => {
                const active = to === "/price/detail";
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                  >
                    <Icon className="size-4" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className={styles.sidebarGuide}>
              <div className={styles.guideHeader}>
                <HelpCircle className="size-3.5 text-[#0F8AA8]" />
                <span>이용 안내</span>
              </div>
              <p className={styles.guideText}>
                콤보 박스에서 자치구와 자치동을 선택하면 해당 지역의 아파트 단지 목록과 실거래 시세를 분석해 드립니다.
              </p>
            </div>
          </div>
        </aside>

        {/* =========================================
            우측 메인 콘텐츠
        ========================================= */}
        <section className="min-w-0 space-y-6">
          {/* 헤더 타이틀 */}
          <header className={styles.sectionHeader}>
            <div>
              <div className={styles.breadcrumb}>
                <span>서울시 아파트 시세 정보</span>
                <ChevronRight className="size-3 text-[#94A3B8]" />
                <span>{selectedSgg ? selectedSgg.sggNm : "자치구 선택"}</span>
                <ChevronRight className="size-3 text-[#94A3B8]" />
                <span>{selectedDongNm ? selectedDongNm : "자치동 선택"}</span>
              </div>
              <h1 className={styles.pageTitle}>단지별 시세 분석</h1>
              <p className={styles.pageSubtitle}>
                선택한 자치구와 동 내 아파트 단지들의 최신 실거래가, 매매/전세 시세, 12개월 추이를 한눈에 비교하세요.
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className={styles.resetBtn}
            >
              <RotateCcw className="size-3.5" />
              선택 초기화
            </button>
          </header>

          {/* =========================================
              지역 선택 카드 (자치구 & 자치동 콤보 박스)
          ========================================= */}
          <div className={styles.selectCard}>
            <div className={styles.selectHeader}>
              <h3 className={styles.selectTitle}>
                <MapPin className="size-4 text-[#0F8AA8]" />
                <span>지역 선택 (자치구 / 자치동)</span>
              </h3>
              <span className={styles.selectedRegionText}>
                선택된 지역:{" "}
                <strong className="text-[#0F8AA8]">
                  {selectedSgg ? selectedSgg.sggNm : "선택 안됨"}{" "}
                  {selectedDongNm ? selectedDongNm : ""}
                </strong>
              </span>
            </div>

            {/* 콤보 박스 셀렉트 영역 */}
            <div className={styles.selectGrid}>
              {/* 1. 자치구 콤보 박스 */}
              <div>
                <label htmlFor="sgg-select" className={styles.selectLabel}>
                  1. 자치구 선택 {isSggLoading && <Loader2 className="inline size-3 animate-spin text-[#0F8AA8]" />}
                </label>
                <div className={styles.selectWrapper}>
                  <select
                    id="sgg-select"
                    value={selectedSggCd}
                    onChange={handleSggChange}
                    className={styles.selectInput}
                  >
                    <option value="">자치구를 선택해 주세요</option>
                    {sggList.map((sgg) => (
                      <option key={sgg.sggCd} value={sgg.sggCd}>
                        {sgg.sggNm}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className={styles.selectArrowIcon} />
                </div>
              </div>

              {/* 2. 자치동 콤보 박스 */}
              <div>
                <label htmlFor="dong-select" className={styles.selectLabel}>
                  2. 자치동 선택 {isDongLoading && <Loader2 className="inline size-3 animate-spin text-[#0F8AA8]" />}
                </label>
                <div className={styles.selectWrapper}>
                  <select
                    id="dong-select"
                    value={selectedDongNm}
                    onChange={handleDongChange}
                    disabled={!selectedSggCd}
                    className={`${styles.selectInput} ${!selectedSggCd ? styles.selectInputDisabled : ""}`}
                  >
                    <option value="">
                      {selectedSggCd ? "자치동을 선택해 주세요" : "자치동을 선택해 주세요"}
                    </option>
                    {dongList.map((dong) => (
                      <option key={dong.dongCd} value={dong.dongNm}>
                        {dong.dongNm}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className={styles.selectArrowIcon} />
                </div>
              </div>
            </div>
          </div>

          {/* =========================================
              지역 선택 미완료 시 안내 카드
          ========================================= */}
          {(!selectedSggCd || !selectedDongNm) ? (
            <div className={styles.emptyCard}>
              <div className={styles.emptyIconCircle}>
                <Building2 className="size-7" />
              </div>
              <h3 className={styles.emptyTitle}>자치구와 자치동을 선택해 주세요</h3>
              <p className={styles.emptySubtitle}>
                상단의 콤보 박스에서 자치구와 자치동을 선택하시면 해당 동에 위치한 아파트 단지 목록과 최신 실거래 시세 분석 결과를 확인하실 수 있습니다.
              </p>
            </div>
          ) : (
            /* =========================================
                아파트 단지 목록 & 상세 대시보드 메인 레이아웃
            ========================================= */
            <div className={styles.contentSplit}>
              {/* 좌측: 단지 목록 & 검색 */}
              <div className="space-y-4">
                <div className={styles.complexListCard}>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-[14px] font-extrabold text-[#0F172A]">
                      {selectedDongNm} 단지 목록 <span className="text-[12px] font-bold text-[#0F8AA8]">({filteredComplexes.length})</span>
                    </h3>
                  </div>

                  {/* 단지 검색창 */}
                  <div className={styles.searchBoxWrapper}>
                    <Search className={styles.searchIcon} />
                    <input
                      type="text"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="단지명 검색 (e.g. 래미안)"
                      className={styles.searchControl}
                    />
                  </div>

                  {/* 단지 리스트 */}
                  <div className={styles.complexItemScroll}>
                    {isComplexesLoading ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center text-[12px] text-[#94A3B8]">
                        <Loader2 className="mb-2 size-5 animate-spin text-[#0F8AA8]" />
                        <span>단지 목록 불러오는 중...</span>
                      </div>
                    ) : filteredComplexes.length === 0 ? (
                      <div className="py-8 text-center text-[12px] text-[#94A3B8]">
                        검색된 아파트 단지가 없습니다.
                      </div>
                    ) : (
                      filteredComplexes.map((item) => {
                        const isSelected = currentComplex?.id === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSelectedComplexId(item.id)}
                            className={`${styles.complexItemBtn} ${isSelected ? styles.complexItemBtnActive : ""}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className={`text-[14px] font-extrabold ${isSelected ? "text-[#0F8AA8]" : "text-[#0F172A]"}`}>
                                  {item.name}
                                </h4>
                                <p className="mt-0.5 text-[11px] font-medium text-[#64748B]">
                                  {item.buildYear}년 준공 · {item.totalHouseholds.toLocaleString()}세대
                                </p>
                              </div>
                              {isSelected && (
                                <span className={styles.complexBadge}>
                                  선택됨
                                </span>
                              )}
                            </div>
                            <div className="mt-2.5 flex items-center justify-between border-t border-[#E2E8F0]/60 pt-2 text-[12px]">
                              <span className="font-semibold text-[#64748B]">최근 실거래가</span>
                              <span className="font-black text-[#0F172A]">{formatPriceKRW(item.baseSalePrice)}</span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* 우측: 선택된 단지의 시세 상세 대시보드 */}
              {currentComplex ? (
                <div className="space-y-6">
                  {/* 단지 상단 프로필 카드 */}
                  <div className={styles.profileCard}>
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#F1F5F9] pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-[#123047] px-2.5 py-0.5 text-[11px] font-extrabold text-white">
                            아파트 단지
                          </span>
                          <span className="text-[12px] font-medium text-[#64748B]">{currentComplex.address}</span>
                        </div>
                        <h2 className="mt-2 text-[24px] font-black text-[#0F172A]">{currentComplex.name}</h2>
                      </div>

                      <div className="flex flex-wrap gap-2 text-[12px]">
                        <div className="rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 font-bold text-[#475569]">
                          준공: <span className="text-[#0F172A]">{currentComplex.buildYear}년</span>
                        </div>
                        <div className="rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 font-bold text-[#475569]">
                          총 세대수: <span className="text-[#0F172A]">{currentComplex.totalHouseholds.toLocaleString()}세대</span>
                        </div>
                        <div className="rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 font-bold text-[#475569]">
                          동 수: <span className="text-[#0F172A]">{currentComplex.totalBuildings}개동</span>
                        </div>
                      </div>
                    </div>

                    {/* 평형(전용면적) 선택 탭 */}
                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      <span className="mr-2 text-[12px] font-black text-[#475569]">전용면적 선택:</span>
                      {currentComplex.pyungs.map((p, idx) => {
                        const isSelected = selectedPyungIndex === idx;
                        return (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => setSelectedPyungIndex(idx)}
                            className={`${styles.pyungTab} ${isSelected ? styles.pyungTabActive : ""}`}
                          >
                            {p.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 시세 핵심 지표 Grid (5개 카운터) */}
                  <div className={styles.metricsGrid}>
                    {/* 카드가 1: 최근 실거래가 */}
                    <div className={styles.metricCard}>
                      <div className={styles.metricTitle}>최근 실거래가 ({activePyung?.name.split(" ")[1]})</div>
                      <div className={styles.metricValuePrimary}>
                        {activePyung ? formatPriceKRW(activePyung.salePrice) : "-"}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[11px] font-extrabold text-[#059669]">
                        <TrendingUp className="size-3" />
                        <span>전월 대비 +1.8%</span>
                      </div>
                    </div>

                    {/* 카드가 2: 평균 매매 시세 */}
                    <div className={styles.metricCard}>
                      <div className={styles.metricTitle}>평균 매매가</div>
                      <div className={styles.metricValueDark}>
                        {activePyung ? formatPriceKRW(Math.round(activePyung.salePrice * 0.99)) : "-"}
                      </div>
                      <div className="mt-1 text-[11px] font-medium text-[#64748B]">
                        시세 범위 ±3%
                      </div>
                    </div>

                    {/* 카드가 3: 평균 전세 시세 */}
                    <div className={styles.metricCard}>
                      <div className={styles.metricTitle}>평균 전세가</div>
                      <div className={styles.metricValueAmber}>
                        {activePyung ? formatPriceKRW(activePyung.rentPrice) : "-"}
                      </div>
                      <div className="mt-1 text-[11px] font-medium text-[#64748B]">
                        전월 대비 +0.8%
                      </div>
                    </div>

                    {/* 카드가 4: 3.3㎡(평)당가 */}
                    <div className={styles.metricCard}>
                      <div className={styles.metricTitle}>3.3㎡(평)당가</div>
                      <div className={styles.metricValueDark}>
                        {activePyung ? `${activePyung.pricePerPyung.toLocaleString()}만 원` : "-"}
                      </div>
                      <div className="mt-1 text-[11px] font-medium text-[#64748B]">전용면적 기준</div>
                    </div>

                    {/* 카드가 5: 전세가율 */}
                    <div className={styles.metricCard}>
                      <div className={styles.metricTitle}>전세가율</div>
                      <div className={styles.metricValueBlue}>
                        {activePyung ? `${((activePyung.rentPrice / activePyung.salePrice) * 100).toFixed(1)}%` : "-"}
                      </div>
                      <div className="mt-1 text-[11px] font-medium text-[#64748B]">안정적 시세 형성</div>
                    </div>
                  </div>

                  {/* 12개월 시세 추이 차트 카드 */}
                  <div className={styles.chartCard}>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F1F5F9] pb-4">
                      <div>
                        <h3 className="flex items-center gap-2 text-[16px] font-black text-[#0F172A]">
                          <BarChart3 className="size-4 text-[#0F8AA8]" />
                          <span>12개월 매매 / 전세 시세 추이</span>
                        </h3>
                        <p className="mt-0.5 text-[12px] font-medium text-[#64748B]">
                          {currentComplex.name} · {activePyung?.name} 월별 가격 흐름
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-[12px] font-bold">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block size-3 rounded-full bg-[#0F8AA8]" />
                          <span>매매가</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block size-3 rounded-full bg-[#F59E0B]" />
                          <span>전세가</span>
                        </div>
                      </div>
                    </div>

                    {/* SVG 차트 바/라인 표현 */}
                    <div className="pt-2">
                      <div className="relative h-[220px] w-full border-b border-[#E2E8F0] pb-6 pt-4">
                        {/* 차트 가이드선 */}
                        <div className="absolute inset-x-0 top-0 border-b border-dashed border-[#F1F5F9]" />
                        <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-[#F1F5F9]" />

                        {/* 차트 바 및 데이터 포인트 */}
                        <div className="flex h-full items-end justify-between px-2">
                          {chartPoints.map((pt) => {
                            const maxSale = chartPoints[chartPoints.length - 1].sale * 1.1;
                            const saleHeightPercent = Math.max(20, (pt.sale / maxSale) * 100);
                            const rentHeightPercent = Math.max(10, (pt.rent / maxSale) * 100);

                            return (
                              <div key={pt.month} className="group relative flex flex-col items-center flex-1 h-full justify-end">
                                {/* 툴팁 */}
                                <div className="absolute -top-12 z-20 hidden rounded-md bg-[#123047] px-2.5 py-1 text-[11px] font-extrabold text-white shadow-md group-hover:block whitespace-nowrap">
                                  <div>매매: {formatPriceKRW(pt.sale)}</div>
                                  <div>전세: {formatPriceKRW(pt.rent)}</div>
                                </div>

                                <div className="flex items-end gap-1 w-full justify-center">
                                  {/* 매매 막대 */}
                                  <div
                                    style={{ height: `${saleHeightPercent}%` }}
                                    className="w-2.5 sm:w-3.5 rounded-t-sm bg-[#0F8AA8] transition-all group-hover:bg-[#0D7E99]"
                                  />
                                  {/* 전세 막대 */}
                                  <div
                                    style={{ height: `${rentHeightPercent}%` }}
                                    className="w-2.5 sm:w-3.5 rounded-t-sm bg-[#F59E0B] transition-all group-hover:bg-[#D97706]"
                                  />
                                </div>
                                <span className="mt-2 text-[10px] font-bold text-[#64748B]">{pt.month}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 최근 실거래가 내역 테이블 */}
                  <div className="rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)] space-y-4">
                    <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
                      <h3 className="flex items-center gap-2 text-[16px] font-black text-[#0F172A]">
                        <Calendar className="size-4 text-[#0F8AA8]" />
                        <span>최근 실거래 신고 내역</span>
                      </h3>
                      <span className="text-[12px] font-medium text-[#64748B]">국토교통부 실거래가 공개시스템 기준</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[13px]">
                        <thead>
                          <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[12px] font-extrabold text-[#475569]">
                            <th className="py-3 px-4">계약일</th>
                            <th className="py-3 px-4">층수</th>
                            <th className="py-3 px-4">거래 유형</th>
                            <th className="py-3 px-4">거래 금액</th>
                            <th className="py-3 px-4">직전 거래 대비</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9] font-medium">
                          {recentTrades.map((trade, i) => (
                            <tr key={i} className="hover:bg-[#F8FAFC]/80 transition-colors">
                              <td className="py-3 px-4 text-[#64748B]">{trade.date}</td>
                              <td className="py-3 px-4 text-[#0F172A] font-bold">{trade.floor}</td>
                              <td className="py-3 px-4">
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[11px] font-extrabold ${trade.type === "매매" ? "bg-[#E8F6F9] text-[#0F8AA8]" : "bg-[#FEF3C7] text-[#D97706]"
                                    }`}
                                >
                                  {trade.type}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-black text-[#0F172A]">{formatPriceKRW(trade.price)}</td>
                              <td className="py-3 px-4">
                                {trade.isUp === true && (
                                  <span className="flex items-center gap-1 font-bold text-[#059669]">
                                    <TrendingUp className="size-3" />
                                    {trade.change}
                                  </span>
                                )}
                                {trade.isUp === false && (
                                  <span className="flex items-center gap-1 font-bold text-[#DC2626]">
                                    <TrendingDown className="size-3" />
                                    {trade.change}
                                  </span>
                                )}
                                {trade.isUp === null && <span className="font-bold text-[#64748B]">{trade.change}</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 싸부 AI 시세 인사이트 */}
                  <div className={styles.aiReportCard}>
                    <div className="flex items-center gap-2 text-[14px] font-black text-[#0F8AA8]">
                      <Sparkles className="size-4" />
                      <span>싸부(SSABU) AI 시세 분석 리포트</span>
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-[#334155]">
                      <strong>{currentComplex.name}</strong> 단지는 <strong>{selectedSgg?.sggNm} {selectedDongNm}</strong> 내 우수한 상권과 대중교통 접근성을 갖추고 있으며,
                      최근 6개월간 거래량이 꾸준히 증가하며 상승세를 유지하고 있습니다. {activePyung?.name} 기준 실거래가는 동일 평형 지역 평균 대비 약 <strong>3.4% 높은 수준</strong>에 형성되어 있습니다.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
