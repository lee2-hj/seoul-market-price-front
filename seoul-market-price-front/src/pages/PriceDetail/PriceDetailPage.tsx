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
} from "lucide-react";
import apiMiddleware from "@/api/middleware";
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

export interface AptTypeCompareRequest {
  apt_name: string;
  aptName: string;
  guCode: string;
  dongCode: string;
  mno: string;
  sno: string;
  sgg_cd: string;
  dong_cd: string;
  sgg_nm: string;
  dong_nm: string;
  type: "PYUNG" | "FLOOR";
  targetA: string;
  targetB: string;
  pyung1?: string;
  pyung2?: string;
  floor1?: string;
  floor2?: string;
}

export interface AptTypeCompareResponse {
  priceA?: number;
  priceB?: number;
  avgPriceA?: number;
  avgPriceB?: number;
  recentPriceA?: number;
  recentPriceB?: number;
  dealCountA?: number;
  dealCountB?: number;
  avgPyeongAmtA?: number;
  avgPyeongAmtB?: number;
  recentFloorA?: string | number;
  recentFloorB?: string | number;
  recentSupplyPyeongA?: string;
  recentSupplyPyeongB?: string;
  recentExclusiveAreaA?: string | number;
  recentExclusiveAreaB?: string | number;
  recentDealDateA?: string;
  recentDealDateB?: string;
}

async function callAptTypeCompareApi(
  params: AptTypeCompareRequest,
): Promise<AptTypeCompareResponse | null> {
  try {
    const response = await apiMiddleware.get<AptTypeCompareResponse>(
      "/api/price/apt-type-compare",
      { params },
    );
    return response.data;
  } catch (error) {
    console.warn("Failed to fetch apt type comparison:", error);
    return null;
  }
}

/* 사이드바 네비게이션 */
/*
const NAV_ITEMS = [
  { label: "지역별 비교(리스트)", to: "/price/compare-list", icon: BarChart3 },
  { label: "지역별 비교(지도)", to: "/region-map", icon: Map },
  { label: "단지별 시세", to: "/price/detail", icon: Building2 },
  { label: "아파트별 비교", to: "/price/compare-apartment", icon: Layers },
];
*/

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

  /* 3. 자치동 관할 아파트 단지 목록 조회 API (검색 버튼 클릭 시에만 호출) */
  const { data: complexList = [], isLoading: isComplexLoading } = useQuery<ComplexDetailItem[]>({
    queryKey: ["locationComplexes", searchQuery?.sggNm, searchQuery?.dongNm],
    queryFn: () =>
      getComplexesApi(
        searchQuery?.sggNm || "",
        searchQuery?.dongNm || "",
      ),
    enabled: Boolean(searchQuery?.sggCd && searchQuery?.dongNm),
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

  /* 선택된 아파트 단지 객체 */
  const selectedComplex = useMemo(
    () => complexList.find((c) => c.name === selectedAptName) || null,
    [complexList, selectedAptName],
  );

  /* 비교 버튼 클릭 핸들러 (사용자가 [비교]를 눌러야만 결과가 나옴) */
  const handleCompareClick = () => {
    if (!selectedAptName) {
      alert("먼저 아파트를 선택해 주세요.");
      return;
    }
    const guCode = selectedSggCd || (selectedComplex as any)?.sggCd || "";
    const dongCode = selectedDongObj?.dongCd || (selectedComplex as any)?.dongCd || "";
    const mno = (selectedComplex as any)?.mno || (selectedComplex as any)?.bonbun || "";
    const sno = (selectedComplex as any)?.sno || (selectedComplex as any)?.bubun || "";

    if (searchType === "PYUNG") {
      if (!selectedPyungA || !selectedPyungB) {
        alert("비교할 2가지 평형을 모두 선택해 주세요.");
        return;
      }
      setCompareTrigger({
        apt_name: selectedAptName,
        aptName: selectedAptName,
        guCode,
        dongCode,
        mno,
        sno,
        sgg_cd: guCode,
        dong_cd: dongCode,
        sgg_nm: selectedSgg?.sggNm || "",
        dong_nm: selectedDongNm,
        type: "PYUNG",
        targetA: `${selectedPyungA}평형대`,
        targetB: `${selectedPyungB}평형대`,
        pyung1: selectedPyungA,
        pyung2: selectedPyungB,
      });
    } else if (searchType === "FLOOR") {
      if (!selectedFloorA || !selectedFloorB) {
        alert("비교할 2가지 층수를 모두 선택해 주세요.");
        return;
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
    <SectionSidebarLayout
      sectionTitle={PRICE_NAVIGATION.sectionTitle}
      menuItems={PRICE_NAVIGATION.menuItems}
    >
    <main className={styles.pageContainer}>
      <div className={styles.mainGrid}>
        {/* =========================================
            좌측 사이드바 메뉴
        ========================================= */}
        {/*
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
        */}

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

            {/* 2행: 아파트 선택 영역 */}
            <div className={styles.aptSectionUnified}>
              <div className={styles.fieldLabelRow}>
                <span className={styles.fieldTitle}>아파트</span>
                <span className={styles.optionalTag}>
                  {selectedAptName ? "선택 완료" : "단지 선택"}
                </span>
                {searchQuery && !selectedAptName && (
                  <span className={styles.aptCountBadge}>
                    총 {complexList.length}개 단지
                  </span>
                )}
                {isComplexLoading && (
                  <Loader2 className="inline size-3 animate-spin text-[#0F8AA8]" />
                )}
              </div>

              <div className={styles.selectWrapper}>
                <select
                  value={selectedAptName}
                  onChange={(e) => {
                    setSelectedAptName(e.target.value);
                    setCompareTrigger(null);
                  }}
                  disabled={!searchQuery || isComplexLoading || complexList.length === 0}
                  className={`${styles.selectInput} ${(!searchQuery || complexList.length === 0) ? styles.selectInputDisabled : ""}`}
                >
                  <option value="">
                    {!searchQuery
                      ? "자치구와 자치동을 선택한 후 [검색] 버튼을 눌러주세요"
                      : isComplexLoading
                        ? "아파트 단지 목록을 불러오는 중입니다..."
                        : complexList.length === 0
                          ? "해당 자치동에 등록된 아파트 단지가 없습니다"
                          : "아파트 단지를 선택해 주세요"}
                  </option>
                  {complexList.map((apt) => (
                    <option key={apt.id} value={apt.name}>
                      {apt.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className={styles.selectArrowIcon} />
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

                return (
                  <div className={styles.metricsCompareGrid}>
                    {/* 대상 A */}
                    <div className={styles.metricCardA}>
                      <div className={styles.metricCardLabel}>
                        {compareTrigger.targetA}
                      </div>
                      <div className={styles.metricCardPrice}>
                        {hasDataA ? (
                          formatPriceKorean(compareResult.priceA || compareResult.avgPriceA || compareResult.recentPriceA)
                        ) : (
                          <span className={styles.noDataPrice}>실거래 데이터 없음</span>
                        )}
                      </div>
                      <div className={styles.metricSubInfo}>
                        <span>{searchType === "PYUNG" ? "90일 이내 평균 실거래가" : "90일 이내 층별 평균 실거래가"}</span>
                      </div>

                      <div className={styles.metricDetailList}>
                        <div className={styles.metricDetailItem}>
                          <span>최근 거래일</span>
                          <span className={styles.metricDetailVal}>
                            {compareResult.recentDealDateA || <span className={styles.noDataVal}>데이터 없음</span>}
                          </span>
                        </div>
                        <div className={styles.metricDetailItem}>
                          <span>최근 거래가</span>
                          <span className={styles.metricDetailVal}>
                            {compareResult.recentPriceA ? (
                              <>
                                {recentPriceDiff > 0 && (
                                  <span className={styles.higherDiffBadge}>
                                    +{formatPriceKorean(recentPriceDiff)}
                                  </span>
                                )}
                                {formatPriceKorean(compareResult.recentPriceA)}
                              </>
                            ) : (
                              <span className={styles.noDataVal}>데이터 없음</span>
                            )}
                          </span>
                        </div>
                        <div className={styles.metricDetailItem}>
                          <span>거래평형 · 층수</span>
                          <span className={styles.metricDetailVal}>
                            {areaTextA || <span className={styles.noDataVal}>데이터 없음</span>}
                          </span>
                        </div>
                        <div className={styles.metricDetailItem}>
                          <span>평균 평단가</span>
                          <span className={styles.metricDetailVal}>
                            {compareResult.avgPyeongAmtA ? (
                              <>
                                {avgPyeongDiff > 0 && (
                                  <span className={styles.higherDiffBadge}>
                                    +{avgPyeongDiff.toLocaleString()}만원/평
                                  </span>
                                )}
                                {compareResult.avgPyeongAmtA.toLocaleString()}만원/평
                              </>
                            ) : (
                              <span className={styles.noDataVal}>데이터 없음</span>
                            )}
                          </span>
                        </div>
                        <div className={styles.metricDetailItem}>
                          <span>거래 건수</span>
                          <span className={styles.metricDetailVal}>
                            {compareResult.dealCountA !== undefined ? `${compareResult.dealCountA}건` : <span className={styles.noDataVal}>0건</span>}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* VS 뱃지 */}
                    <div className={styles.vsBadgeCol}>
                      <div className={styles.vsBadgeCircle}>VS</div>
                    </div>

                    {/* 대상 B */}
                    <div className={styles.metricCardB}>
                      <div className={styles.metricCardLabel}>
                        {compareTrigger.targetB}
                      </div>
                      <div className={styles.metricCardPrice}>
                        {hasDataB ? (
                          formatPriceKorean(compareResult.priceB || compareResult.avgPriceB || compareResult.recentPriceB)
                        ) : (
                          <span className={styles.noDataPrice}>실거래 데이터 없음</span>
                        )}
                      </div>
                      <div className={styles.metricSubInfo}>
                        <span>{searchType === "PYUNG" ? "90일 이내 평균 실거래가" : "90일 이내 층별 평균 실거래가"}</span>
                      </div>

                      <div className={styles.metricDetailList}>
                        <div className={styles.metricDetailItem}>
                          <span>최근 거래일</span>
                          <span className={styles.metricDetailVal}>
                            {compareResult.recentDealDateB || <span className={styles.noDataVal}>데이터 없음</span>}
                          </span>
                        </div>
                        <div className={styles.metricDetailItem}>
                          <span>최근 거래가</span>
                          <span className={styles.metricDetailVal}>
                            {compareResult.recentPriceB ? (
                              <>
                                {recentPriceDiff < 0 && (
                                  <span className={styles.higherDiffBadge}>
                                    +{formatPriceKorean(Math.abs(recentPriceDiff))}
                                  </span>
                                )}
                                {formatPriceKorean(compareResult.recentPriceB)}
                              </>
                            ) : (
                              <span className={styles.noDataVal}>데이터 없음</span>
                            )}
                          </span>
                        </div>
                        <div className={styles.metricDetailItem}>
                          <span>거래평형 · 층수</span>
                          <span className={styles.metricDetailVal}>
                            {areaTextB || <span className={styles.noDataVal}>데이터 없음</span>}
                          </span>
                        </div>
                        <div className={styles.metricDetailItem}>
                          <span>평균 평단가</span>
                          <span className={styles.metricDetailVal}>
                            {compareResult.avgPyeongAmtB ? (
                              <>
                                {avgPyeongDiff < 0 && (
                                  <span className={styles.higherDiffBadge}>
                                    +{Math.abs(avgPyeongDiff).toLocaleString()}만원/평
                                  </span>
                                )}
                                {compareResult.avgPyeongAmtB.toLocaleString()}만원/평
                              </>
                            ) : (
                              <span className={styles.noDataVal}>데이터 없음</span>
                            )}
                          </span>
                        </div>
                        <div className={styles.metricDetailItem}>
                          <span>거래 건수</span>
                          <span className={styles.metricDetailVal}>
                            {compareResult.dealCountB !== undefined ? `${compareResult.dealCountB}건` : <span className={styles.noDataVal}>0건</span>}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })() : (
                <div className={styles.resultEmptyState}>
                  <div className={styles.emptyIconCircle}>
                    <Search className="size-6 text-slate-400" />
                  </div>
                  <div className={styles.emptyTitle}>
                    {compareTrigger.targetA} vs {compareTrigger.targetB} 실거래 데이터 없음
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </main>
    </SectionSidebarLayout>
  );
}
