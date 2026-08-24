import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  BarChart3,
  Search,
  TrendingUp,
  TrendingDown,
  Calendar,
  Sparkles,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  Loader2,
  MapPin,
  Check,
} from "lucide-react";
import {
  getSggsApi,
  getDongsApi,
  getComplexesApi,
  type SggItem,
  type DongItem,
  type ComplexDetailItem,
} from "@/api/api";
import styles from "./PriceDetailPage.module.css";
import SectionSidebarLayout from "@/components/SectionSidebarLayout";
import { PRICE_NAVIGATION } from "@/config/sectionNavigation";

/* 금액 포맷 유틸리티 (e.g. 348000 -> 34억 8,000만 원) */
function formatPriceKRW(priceInMan: number): string {
  if (!priceInMan || priceInMan <= 0) return "-";
  const eok = Math.floor(priceInMan / 10000);
  const remainderMan = priceInMan % 10000;
  if (eok === 0) return `${remainderMan.toLocaleString()}만 원`;
  if (remainderMan === 0) return `${eok}억 원`;
  return `${eok}억 ${remainderMan.toLocaleString()}만 원`;
}

export default function PriceDetailPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  /* 1. 자치구 API 조회 (100.98.111.49 DB tb_sgg_master: sgg_cd, sgg_nm) */
  const { data: sggList = [], isLoading: isSggLoading } = useQuery<SggItem[]>({
    queryKey: ["locationSggs"],
    queryFn: getSggsApi,
    staleTime: 1000 * 60 * 30, // 30분
  });

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
  const { data: dongList = [], isLoading: isDongLoading } = useQuery<DongItem[]>({
    queryKey: ["locationDongs", selectedSggCd],
    queryFn: () => getDongsApi(selectedSggCd),
    enabled: Boolean(selectedSggCd),
    staleTime: 1000 * 60 * 30,
  });

  /* 검색 키워드 & 선택된 단지 및 평형 */
  const [keyword, setKeyword] = useState("");
  const [selectedComplexId, setSelectedComplexId] = useState<string | null>(null);
  const [selectedPyungIndex, setSelectedPyungIndex] = useState(0);

  /* 3. 자치동 관할 아파트 단지 목록 조회 API */
  const { data: complexList = [], isLoading: isComplexesLoading } = useQuery<ComplexDetailItem[]>({
    queryKey: ["locationComplexes", selectedSgg?.sggNm, selectedDongNm],
    queryFn: () => getComplexesApi(selectedSgg?.sggNm || "", selectedDongNm),
    enabled: Boolean(selectedSgg?.sggNm && selectedDongNm),
    staleTime: 1000 * 60 * 10,
  });

  /* 키워드 필터링된 단지 목록 */
  const filteredComplexes = useMemo(() => {
    if (!keyword.trim()) return complexList;
    return complexList.filter((c) =>
      c.name.toLowerCase().includes(keyword.toLowerCase().trim()),
    );
  }, [complexList, keyword]);

  /* 현재 선택된 아파트 단지 */
  const currentComplex = useMemo(() => {
    if (!complexList.length) return null;
    if (selectedComplexId) {
      const found = complexList.find((c) => c.id === selectedComplexId);
      if (found) return found;
    }
    return filteredComplexes[0] || complexList[0];
  }, [selectedComplexId, complexList, filteredComplexes]);

  /* 콤보 박스: 자치구 변경 이벤트 */
  const handleSggChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextSggCd = e.target.value;
    setSelectedSggCd(nextSggCd);
    setSelectedDongNm(""); // 동 선택 초기화
    setSelectedComplexId(null);
    setSelectedPyungIndex(0);

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
    setSelectedPyungIndex(0);

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
    setSelectedPyungIndex(0);
    setKeyword("");
    setSearchParams({});
  };

  const activePyung = currentComplex?.pyungs?.[selectedPyungIndex] || currentComplex?.pyungs?.[0];

  /* 12개월 시세 추이 데이터 계산 */
  const chartPoints = useMemo(() => {
    if (!activePyung) return [];
    if (currentComplex?.chartPoints && currentComplex.chartPoints.length > 0) {
      return currentComplex.chartPoints;
    }
    const baseSale = activePyung.salePrice || currentComplex?.baseSalePrice || 100000;
    const baseRent = activePyung.rentPrice || currentComplex?.baseRentPrice || Math.round(baseSale * 0.6);
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
  }, [activePyung, currentComplex]);

  /* 실거래 내역 샘플 / 서버 데이터 */
  const recentTrades = useMemo(() => {
    if (!activePyung) return [];
    if (currentComplex?.recentTrades && currentComplex.recentTrades.length > 0) {
      return currentComplex.recentTrades;
    }
    const base = activePyung.salePrice || 100000;
    const rentBase = activePyung.rentPrice || Math.round(base * 0.6);
    return [
      { date: "2026.08.10", floor: `${activePyung.recentFloor || 19}층`, type: "매매", price: base, change: "+6,000만", isUp: true },
      { date: "2026.08.02", floor: "14층", type: "전세", price: rentBase, change: "+2,000만", isUp: true },
      { date: "2026.07.28", floor: "23층", type: "매매", price: Math.round(base * 0.98), change: "+1,500만", isUp: true },
      { date: "2026.07.15", floor: "8층", type: "매매", price: Math.round(base * 0.95), change: "-1,000만", isUp: false },
      { date: "2026.07.01", floor: "11층", type: "전세", price: Math.round(rentBase * 0.96), change: "보합", isUp: null },
    ];
  }, [activePyung, currentComplex]);

  /* 전세가율 계산 */
  const jeonseRate = useMemo(() => {
    if (!activePyung || !activePyung.salePrice || !activePyung.rentPrice) return null;
    return Math.round((activePyung.rentPrice / activePyung.salePrice) * 100);
  }, [activePyung]);

  return (
    <SectionSidebarLayout
      sectionTitle={PRICE_NAVIGATION.sectionTitle}
      menuItems={PRICE_NAVIGATION.menuItems}
    >
      <main className={styles.pageContainer}>
        <div className={styles.mainGrid}>
          {/* =========================================
              메인 콘텐츠
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
                        {selectedSggCd ? "자치동을 선택해 주세요" : "자치구를 먼저 선택해 주세요"}
                      </option>
                      {dongList.map((dong) => (
                        <option key={dong.dongCd || dong.dongNm} value={dong.dongNm}>
                          {dong.dongNm}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className={styles.selectArrowIcon} />
                  </div>
                </div>
              </div>
            </div>

            {/* 자치구 및 동이 선택되지 않았을 때 표시되는 안내 카드 */}
            {!selectedSggCd || !selectedDongNm ? (
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
                        {selectedDongNm} 단지 목록{" "}
                        <span className="text-[12px] font-bold text-[#0F8AA8]">
                          ({filteredComplexes.length})
                        </span>
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
                          등록된 아파트 단지가 없습니다.
                        </div>
                      ) : (
                        filteredComplexes.map((item) => {
                          const isSelected = currentComplex?.id === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setSelectedComplexId(item.id);
                                setSelectedPyungIndex(0);
                              }}
                              className={`${styles.complexItemBtn} ${isSelected ? styles.complexItemBtnActive : ""}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className={`text-[14px] font-extrabold ${isSelected ? "text-[#0F8AA8]" : "text-[#0F172A]"}`}>
                                    {item.name}
                                  </h4>
                                  <p className="mt-0.5 text-[11px] font-medium text-[#64748B]">
                                    {item.buildYear ? `${item.buildYear}년 준공` : ""}
                                    {item.totalHouseholds ? ` · ${item.totalHouseholds.toLocaleString()}세대` : ""}
                                  </p>
                                </div>
                                {isSelected && (
                                  <span className={styles.complexBadge}>
                                    선택됨
                                  </span>
                                )}
                              </div>
                              <div className="mt-2.5 flex items-center justify-between border-t border-[#E2E8F0]/60 pt-2 text-[12px]">
                                <span className="font-semibold text-[#64748B]">기준 실거래가</span>
                                <span className="font-black text-[#0F172A]">
                                  {formatPriceKRW(item.baseSalePrice || item.pyungs?.[0]?.salePrice || 0)}
                                </span>
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
                            <span className="text-[12px] font-medium text-[#64748B]">
                              {currentComplex.address || `${selectedSgg?.sggNm} ${selectedDongNm}`}
                            </span>
                          </div>
                          <h2 className="mt-2 text-[24px] font-black text-[#0F172A]">
                            {currentComplex.name}
                          </h2>
                        </div>

                        <div className="flex flex-wrap gap-2 text-[12px]">
                          {currentComplex.buildYear ? (
                            <div className="rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 font-bold text-[#475569]">
                              준공: <span className="text-[#0F172A]">{currentComplex.buildYear}년</span>
                            </div>
                          ) : null}
                          {currentComplex.totalHouseholds ? (
                            <div className="rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 font-bold text-[#475569]">
                              총 세대수: <span className="text-[#0F172A]">{currentComplex.totalHouseholds.toLocaleString()}세대</span>
                            </div>
                          ) : null}
                          {currentComplex.totalBuildings ? (
                            <div className="rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 font-bold text-[#475569]">
                              동 수: <span className="text-[#0F172A]">{currentComplex.totalBuildings}개동</span>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* 평형(전용면적) 선택 탭 */}
                      {currentComplex.pyungs && currentComplex.pyungs.length > 0 && (
                        <div className="mt-5 flex flex-wrap items-center gap-2">
                          <span className="mr-2 text-[12px] font-black text-[#475569]">전용면적 선택:</span>
                          {currentComplex.pyungs.map((p, idx) => {
                            const isSelected = selectedPyungIndex === idx;
                            return (
                              <button
                                key={p.name || idx}
                                type="button"
                                onClick={() => setSelectedPyungIndex(idx)}
                                className={`${styles.pyungTab} ${isSelected ? styles.pyungTabActive : ""}`}
                              >
                                {p.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* 시세 핵심 지표 Grid (5개 카드) */}
                    <div className={styles.metricsGrid}>
                      {/* 카드가 1: 최근 실거래가 */}
                      <div className={styles.metricCard}>
                        <div className={styles.metricTitle}>
                          최근 실거래가 {activePyung?.name ? `(${activePyung.name})` : ""}
                        </div>
                        <div className={styles.metricValuePrimary}>
                          {activePyung ? formatPriceKRW(activePyung.salePrice) : formatPriceKRW(currentComplex.baseSalePrice)}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-[11px] font-extrabold text-[#059669]">
                          <TrendingUp className="size-3" />
                          <span>최근 거래 기준</span>
                        </div>
                      </div>

                      {/* 카드가 2: 평균 매매 시세 */}
                      <div className={styles.metricCard}>
                        <div className={styles.metricTitle}>평균 매매가</div>
                        <div className={styles.metricValueDark}>
                          {activePyung
                            ? formatPriceKRW(Math.round(activePyung.salePrice * 0.99))
                            : formatPriceKRW(currentComplex.baseSalePrice)}
                        </div>
                        <div className="mt-1 text-[11px] font-medium text-[#64748B]">
                          시세 범위 ±3%
                        </div>
                      </div>

                      {/* 카드가 3: 평균 전세 시세 */}
                      <div className={styles.metricCard}>
                        <div className={styles.metricTitle}>평균 전세가</div>
                        <div className={styles.metricValueAmber}>
                          {activePyung
                            ? formatPriceKRW(activePyung.rentPrice)
                            : formatPriceKRW(currentComplex.baseRentPrice)}
                        </div>
                        <div className="mt-1 text-[11px] font-medium text-[#64748B]">
                          전세 거래가
                        </div>
                      </div>

                      {/* 카드가 4: 3.3㎡(평)당가 */}
                      <div className={styles.metricCard}>
                        <div className={styles.metricTitle}>3.3㎡(평)당가</div>
                        <div className={styles.metricValueDark}>
                          {activePyung?.pricePerPyung
                            ? `${activePyung.pricePerPyung.toLocaleString()}만 원`
                            : "-"}
                        </div>
                        <div className="mt-1 text-[11px] font-medium text-[#64748B]">전용면적 기준</div>
                      </div>

                      {/* 카드가 5: 전세가율 */}
                      <div className={styles.metricCard}>
                        <div className={styles.metricTitle}>전세가율</div>
                        <div className={styles.metricValueBlue}>
                          {jeonseRate !== null ? `${jeonseRate}%` : "60%"}
                        </div>
                        <div className="mt-1 text-[11px] font-medium text-[#64748B]">
                          매매가 대비 전세가
                        </div>
                      </div>
                    </div>

                    {/* 12개월 시세 추이 차트 카드 */}
                    <div className={styles.chartCard}>
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h3 className="text-[16px] font-extrabold text-[#0F172A]">
                            최근 12개월 시세 추이
                          </h3>
                          <p className="text-[12px] font-medium text-[#64748B]">
                            월별 매매 및 전세 실거래 가격 변화 추이
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-[12px] font-bold">
                          <span className="flex items-center gap-1.5 text-[#0F8AA8]">
                            <span className="inline-block size-2.5 rounded-full bg-[#0F8AA8]" />
                            매매가
                          </span>
                          <span className="flex items-center gap-1.5 text-[#D97706]">
                            <span className="inline-block size-2.5 rounded-full bg-[#D97706]" />
                            전세가
                          </span>
                        </div>
                      </div>

                      {/* 바 차트 렌더링 */}
                      <div className="h-64 w-full pt-4">
                        <div className="flex h-48 items-end justify-between gap-1 border-b border-[#E2E8F0] pb-2">
                          {chartPoints.map((pt) => {
                            const maxVal = Math.max(...chartPoints.map((p) => p.sale), 100000);
                            const saleHeight = Math.round((pt.sale / maxVal) * 100);
                            const rentHeight = Math.round((pt.rent / maxVal) * 100);
                            return (
                              <div key={pt.month} className="group relative flex flex-1 flex-col items-center justify-end h-full">
                                {/* 호버 툴팁 */}
                                <div className="absolute -top-12 z-10 hidden whitespace-nowrap rounded-lg bg-[#0F172A] px-2 py-1 text-[10px] text-white shadow-lg group-hover:block">
                                  <div>매매: {formatPriceKRW(pt.sale)}</div>
                                  <div>전세: {formatPriceKRW(pt.rent)}</div>
                                </div>
                                <div className="flex items-end gap-0.5 w-full justify-center">
                                  <div
                                    style={{ height: `${saleHeight}%` }}
                                    className="w-2.5 sm:w-3.5 rounded-t bg-[#0F8AA8] transition-all hover:opacity-80"
                                  />
                                  <div
                                    style={{ height: `${rentHeight}%` }}
                                    className="w-2.5 sm:w-3.5 rounded-t bg-[#D97706] transition-all hover:opacity-80"
                                  />
                                </div>
                                <span className="mt-2 text-[10px] font-semibold text-[#64748B]">
                                  {pt.month}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* AI 종합 분석 카드 */}
                    <div className={styles.aiReportCard}>
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-4 text-[#0F8AA8]" />
                        <h3 className="text-[14px] font-extrabold text-[#0F172A]">
                          AI 단지 시세 종합 분석
                        </h3>
                      </div>
                      <p className="mt-2 text-[13px] leading-relaxed text-[#334155]">
                        <strong>{currentComplex.name}</strong> 단지는 최근 1년간 매매 실거래가가 완만한 우상향 흐름을 보이고 있으며,
                        전세가율은 약 <strong>{jeonseRate ?? 60}%</strong> 수준으로 안정적인 실수요 기반을 형성하고 있습니다.
                        주변 인프라 및 단지 규모를 고려했을 때 향후에도 견조한 가격 방어력이 예상됩니다.
                      </p>
                    </div>

                    {/* 최근 실거래 내역 테이블 */}
                    <div className={styles.chartCard}>
                      <h3 className="mb-3 text-[16px] font-extrabold text-[#0F172A]">
                        최근 실거래 상세 내역
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[12px]">
                          <thead>
                            <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                              <th className="py-2.5 font-bold">계약일</th>
                              <th className="py-2.5 font-bold">구분</th>
                              <th className="py-2.5 font-bold">층수</th>
                              <th className="py-2.5 font-bold">거래금액</th>
                              <th className="py-2.5 font-bold">변동</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F1F5F9]">
                            {recentTrades.map((t, idx) => (
                              <tr key={idx} className="hover:bg-[#F8FAFC]">
                                <td className="py-2.5 font-medium text-[#475569]">{t.date}</td>
                                <td className="py-2.5">
                                  <span
                                    className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${
                                      t.type === "매매"
                                        ? "bg-[#E8F6F9] text-[#0F8AA8]"
                                        : "bg-[#FEF3C7] text-[#D97706]"
                                    }`}
                                  >
                                    {t.type}
                                  </span>
                                </td>
                                <td className="py-2.5 text-[#475569]">{t.floor}</td>
                                <td className="py-2.5 font-extrabold text-[#0F172A]">
                                  {formatPriceKRW(t.price)}
                                </td>
                                <td className="py-2.5">
                                  {t.isUp === true && (
                                    <span className="flex items-center gap-0.5 font-bold text-[#059669]">
                                      <TrendingUp className="size-3" />
                                      {t.change}
                                    </span>
                                  )}
                                  {t.isUp === false && (
                                    <span className="flex items-center gap-0.5 font-bold text-[#DC2626]">
                                      <TrendingDown className="size-3" />
                                      {t.change}
                                    </span>
                                  )}
                                  {t.isUp === null && (
                                    <span className="font-bold text-[#64748B]">{t.change}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-12 text-center">
                    <Building2 className="mb-2 size-8 text-[#94A3B8]" />
                    <p className="text-[14px] font-bold text-[#475569]">
                      선택된 아파트 단지가 없습니다.
                    </p>
                    <p className="text-[12px] text-[#94A3B8]">
                      좌측 단지 목록에서 아파트를 선택해 주세요.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </SectionSidebarLayout>
  );
}
