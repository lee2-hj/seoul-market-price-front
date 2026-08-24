import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Map as MapIcon,
  BarChart3,
  HelpCircle,
  RotateCcw,
  ChevronDown,
  Loader2,
  MapPin,
  Search,
  ArrowRightLeft,
} from "lucide-react";
import {
  getSggsApi,
  getDongsApi,
  getComplexesApi,
  callAptTypeCompareApi,
  type SggItem,
  type DongItem,
  type ComplexDetailItem,
  type AptTypeCompareRequest,
  type AptTypeCompareResponse,
} from "@/api/api";
import styles from "./PriceDetailPage.module.css";

/* 사이드바 네비게이션 */
const NAV_ITEMS = [
  { label: "지역별 비교(리스트)", to: "/price/compare-list", icon: BarChart3 },
  { label: "지역별 비교(지도)", to: "/region-map", icon: MapIcon },
  { label: "단지별 시세", to: "/price/detail", icon: Building2 },
];

/* 평형 선택 옵션 */
const PYUNG_OPTIONS = [
  { value: "", label: "평형을 선택해 주세요" },
  { value: "10", label: "10평형대 (전용 40㎡ 이하)" },
  { value: "20", label: "20평형대 (전용 59㎡ 내외)" },
  { value: "30", label: "30평형대 (전용 84㎡ 내외)" },
  { value: "40", label: "40평형대 이상 (전용 114㎡ 이상)" },
];

/* 층수 선택 옵션 */
const FLOOR_OPTIONS = [
  { value: "", label: "층수를 선택해 주세요" },
  { value: "LOW", label: "저층 (1층 ~ 5층)" },
  { value: "MID", label: "중층 (6층 ~ 15층)" },
  { value: "HIGH", label: "고층 (16층 이상)" },
];

export default function PriceDetailPage() {
  /* 자치구 & 자치동 선택 상태 */
  const [selectedSggCd, setSelectedSggCd] = useState<string>("");
  const [selectedDongNm, setSelectedDongNm] = useState<string>("");
  const [selectedAptName, setSelectedAptName] = useState<string>("");

  /* 검색 타입 (PYUNG: 평형, FLOOR: 층수) */
  const [searchType, setSearchType] = useState<string>("");

  /* 2가지 비교 선택 상태 (좌: A, 우: B) */
  const [selectedPyungA, setSelectedPyungA] = useState<string>("");
  const [selectedPyungB, setSelectedPyungB] = useState<string>("");
  const [selectedFloorA, setSelectedFloorA] = useState<string>("");
  const [selectedFloorB, setSelectedFloorB] = useState<string>("");

  /* 검색 실행 파라미터 */
  const [searchQuery, setSearchQuery] = useState<{
    sggCd: string;
    dongNm: string;
    sggNm: string;
    dongCd?: string;
  } | null>(null);

  /* 비교 실행 파라미터 (비교 버튼 클릭 시 설정) */
  const [compareTrigger, setCompareTrigger] = useState<AptTypeCompareRequest | null>(null);

  /* 1. 자치구 목록 조회 API (GET /api/location/sggs) */
  const { data: sggList = [], isLoading: isSggLoading } = useQuery<SggItem[]>({
    queryKey: ["locationSggs"],
    queryFn: getSggsApi,
    staleTime: 1000 * 60 * 60,
  });

  /* 선택된 자치구 객체 */
  const selectedSgg = useMemo(
    () => sggList.find((s) => s.sggCd === selectedSggCd) || null,
    [sggList, selectedSggCd],
  );

  /* 2. 자치동 목록 조회 API (GET /api/location/dongs?sggCd=...) */
  const { data: dongList = [], isLoading: isDongLoading } = useQuery<DongItem[]>({
    queryKey: ["locationDongs", selectedSggCd],
    queryFn: () => getDongsApi(selectedSggCd),
    enabled: Boolean(selectedSggCd),
    staleTime: 1000 * 60 * 30,
  });

  /* 선택된 자치동 객체 */
  const selectedDongObj = useMemo(
    () => dongList.find((d) => d.dongNm === selectedDongNm) || null,
    [dongList, selectedDongNm],
  );

  /* 3. 자치동 관할 아파트 단지 목록 조회 API (검색 버튼 클릭 시에만 호출) */
  const { data: complexList = [], isLoading: isComplexLoading } = useQuery<ComplexDetailItem[]>({
    queryKey: ["locationComplexes", searchQuery?.sggNm, searchQuery?.dongNm, searchQuery?.dongCd, searchQuery?.sggCd],
    queryFn: () =>
      getComplexesApi(
        searchQuery?.sggNm || "",
        searchQuery?.dongNm || "",
        searchQuery?.dongCd,
        searchQuery?.sggCd,
      ),
    enabled: Boolean(searchQuery?.sggCd && searchQuery?.dongNm),
    staleTime: 1000 * 60 * 10,
  });

  /* 4. 아파트 타입별(평형/층수) 비교 API 호출 (비교 버튼 클릭 시) */
  const { data: compareResult, isFetching: isCompareLoading } = useQuery<AptTypeCompareResponse | null>({
    queryKey: ["aptTypeCompare", compareTrigger],
    queryFn: () => (compareTrigger ? callAptTypeCompareApi(compareTrigger) : null),
    enabled: Boolean(compareTrigger),
    retry: false,
    staleTime: 0,
  });

  /* 검색 버튼 클릭 핸들러 */
  const handleSearchClick = () => {
    if (!selectedSggCd || !selectedDongNm) {
      alert("자치구와 자치동을 모두 선택해 주세요.");
      return;
    }
    setSearchQuery({
      sggCd: selectedSggCd,
      dongNm: selectedDongNm,
      sggNm: selectedSgg?.sggNm || "",
      dongCd: selectedDongObj?.dongCd,
    });
    setSelectedAptName("");
    setCompareTrigger(null);
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
    const guCode = selectedSggCd || selectedComplex?.sggCd || "";
    const dongCode = selectedDongObj?.dongCd || selectedComplex?.dongCd || "";
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
      const floorLabelMap: Record<string, string> = { LOW: "저층", MID: "중층", HIGH: "고층" };
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
        type: "FLOOR",
        targetA: floorLabelMap[selectedFloorA] || selectedFloorA,
        targetB: floorLabelMap[selectedFloorB] || selectedFloorB,
        floor1: selectedFloorA,
        floor2: selectedFloorB,
      });
    }
  };

  /* 선택 초기화 핸들러 */
  const handleReset = () => {
    setSelectedSggCd("");
    setSelectedDongNm("");
    setSelectedAptName("");
    setSearchType("");
    setSelectedPyungA("");
    setSelectedPyungB("");
    setSelectedFloorA("");
    setSelectedFloorB("");
    setSearchQuery(null);
    setCompareTrigger(null);
  };

  /* 가격 포맷터 (억/만원) */
  const formatPriceKorean = (val?: number | string) => {
    if (val === undefined || val === null || val === "" || val === 0 || val === "0") return "-";
    if (typeof val === "string" && (val.includes("억") || val.includes("만원"))) return val;
    const num = typeof val === "string" ? Number(val.replace(/,/g, "").trim()) : Number(val);
    if (!num || isNaN(num) || num <= 0) return "-";

    // 1) 억 단위 소수점 (예: 16.5 -> 16억 5,000만원)
    if (num < 1000) {
      const ukPart = Math.floor(num);
      const manPart = Math.round((num - ukPart) * 10000);
      if (ukPart > 0 && manPart > 0) return `${ukPart}억 ${manPart.toLocaleString()}만원`;
      if (ukPart > 0) return `${ukPart}억원`;
      return `${manPart.toLocaleString()}만원`;
    }

    // 2) 만원 단위(165000) 또는 원 단위(1650000000)
    const normalized = num >= 100_000_000 ? Math.round(num / 10000) : num;
    const uk = Math.floor(normalized / 10000);
    const man = Math.round(normalized % 10000);
    if (uk > 0 && man > 0) return `${uk}억 ${man.toLocaleString()}만원`;
    if (uk > 0) return `${uk}억원`;
    return `${man.toLocaleString()}만원`;
  };

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
                자치구, 자치동, 아파트 및 비교 타입을 선택한 후 [비교] 버튼을 누르면 서버로부터 시세 비교 분석 데이터가 생성됩니다.
              </p>
            </div>
          </div>
        </aside>

        {/* =========================================
            우측 메인 콘텐츠
        ========================================= */}
        <section className="min-w-0 space-y-6">
          {/* 상단 헤더: 타이틀 & 선택 초기화 버튼 */}
          <header className={styles.sectionHeader}>
            <div>
              <h1 className={styles.pageTitle}>단지별 시세 비교</h1>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className={styles.resetBtn}
            >
              <RotateCcw className="size-3.5" />
              <span>선택 초기화</span>
            </button>
          </header>

          {/* 선택 카드 */}
          <div className={styles.selectCard}>
            <div className={styles.selectHeader}>
              <h3 className={styles.selectTitle}>
                <MapPin className="size-4 text-[#0F8AA8]" />
                <span>시세 분석 대상 선택</span>
              </h3>
              {searchQuery && (
                <span className={styles.selectedRegionBadge}>
                  조회 지역: <strong>{searchQuery.sggNm} {searchQuery.dongNm}</strong>
                  {selectedAptName && (
                    <span className="ml-1.5 font-bold text-[#0F8AA8]">
                      • {selectedAptName}
                    </span>
                  )}
                </span>
              )}
            </div>

            {/* 1행: 자치구, 자치동 콤보박스 및 우측 검색 버튼 */}
            <div className={styles.selectorGridWithBtn}>
              {/* 자치구 선택 콤보박스 */}
              <div>
                <div className={styles.fieldLabelRow}>
                  <span className={styles.fieldTitle}>자치구</span>
                  <span className={styles.requiredTag}>필수 선택</span>
                  {isSggLoading && (
                    <Loader2 className="inline size-3 animate-spin text-[#0F8AA8]" />
                  )}
                </div>
                <div className={styles.selectWrapper}>
                  <select
                    value={selectedSggCd}
                    onChange={(e) => {
                      setSelectedSggCd(e.target.value);
                      setSelectedDongNm("");
                      setSearchQuery(null);
                      setSelectedAptName("");
                      setCompareTrigger(null);
                    }}
                    className={styles.selectInput}
                  >
                    <option value="">자치구 선택 (예: 강동구)</option>
                    {sggList.map((sgg) => (
                      <option key={sgg.sggCd} value={sgg.sggCd}>
                        {sgg.sggNm}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className={styles.selectArrowIcon} />
                </div>
              </div>

              {/* 자치동 선택 콤보박스 */}
              <div>
                <div className={styles.fieldLabelRow}>
                  <span className={styles.fieldTitle}>자치동</span>
                  <span className={styles.requiredTag}>필수 선택</span>
                  {isDongLoading && (
                    <Loader2 className="inline size-3 animate-spin text-[#0F8AA8]" />
                  )}
                </div>
                <div className={styles.selectWrapper}>
                  <select
                    value={selectedDongNm}
                    onChange={(e) => {
                      setSelectedDongNm(e.target.value);
                      setSearchQuery(null);
                      setSelectedAptName("");
                      setCompareTrigger(null);
                    }}
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

              {/* 오른쪽 검색 버튼 */}
              <div className={styles.searchBtnCol}>
                <div className={styles.fieldLabelRow}>
                  <span className="invisible text-xs font-semibold">검색</span>
                </div>
                <button
                  type="button"
                  onClick={handleSearchClick}
                  disabled={!selectedSggCd || !selectedDongNm}
                  className={`${styles.searchSubmitBtn} ${!selectedSggCd || !selectedDongNm ? styles.searchSubmitBtnDisabled : ""}`}
                >
                  <Search className="size-4" />
                  <span>검색</span>
                </button>
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
            </div>

            {/* 3행: 검색 타입 선택 (평형 or 층수) */}
            <div className={styles.searchTypeSection}>
              <div className={styles.fieldLabelRow}>
                <span className={styles.fieldTitle}>검색 타입</span>
                <span className={styles.optionalTag}>조건 선택</span>
              </div>

              {/* 검색 타입 콤보박스 */}
              <div className={styles.selectWrapper}>
                <select
                  value={searchType}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setSearchType(newType);
                    setSelectedPyungA("");
                    setSelectedPyungB("");
                    setSelectedFloorA("");
                    setSelectedFloorB("");
                    setCompareTrigger(null);
                  }}
                  className={styles.selectInput}
                >
                  <option value="">평형 또는 층수</option>
                  <option value="PYUNG">평형</option>
                  <option value="FLOOR">층수</option>
                </select>
                <ChevronDown className={styles.selectArrowIcon} />
              </div>

              {/* 평형 선택 시: 좌 / 우 2개 평형 비교 콤보박스 + 우측 비교 버튼 */}
              {searchType === "PYUNG" && (
                <div className={styles.subOptionBox}>
                  <div className={styles.comparisonGridWithBtn}>
                    {/* 좌측: 비교 평형 A */}
                    <div>
                      <div className={styles.subFieldLabelRow}>
                        <span className={styles.subFieldTitle}>비교 평형 A</span>
                      </div>
                      <div className={styles.selectWrapper}>
                        <select
                          value={selectedPyungA}
                          onChange={(e) => {
                            setSelectedPyungA(e.target.value);
                            setCompareTrigger(null);
                          }}
                          className={styles.selectInput}
                        >
                          {PYUNG_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className={styles.selectArrowIcon} />
                      </div>
                    </div>

                    {/* 우측: 비교 평형 B */}
                    <div>
                      <div className={styles.subFieldLabelRow}>
                        <span className={styles.subFieldTitle}>비교 평형 B</span>
                      </div>
                      <div className={styles.selectWrapper}>
                        <select
                          value={selectedPyungB}
                          onChange={(e) => {
                            setSelectedPyungB(e.target.value);
                            setCompareTrigger(null);
                          }}
                          className={styles.selectInput}
                        >
                          {PYUNG_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className={styles.selectArrowIcon} />
                      </div>
                    </div>

                    {/* 오른쪽 비교 버튼 */}
                    <div className={styles.searchBtnCol}>
                      <div className={styles.subFieldLabelRow}>
                        <span className="invisible text-xs font-semibold">비교</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCompareClick}
                        disabled={!selectedAptName || !selectedPyungA || !selectedPyungB || isCompareLoading}
                        className={`${styles.compareSubmitBtn} ${!selectedAptName || !selectedPyungA || !selectedPyungB ? styles.compareSubmitBtnDisabled : ""}`}
                      >
                        {isCompareLoading ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <ArrowRightLeft className="size-4" />
                        )}
                        <span>{isCompareLoading ? "비교 중" : "비교"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 층수 선택 시: 좌 / 우 2개 층수 비교 콤보박스 + 우측 비교 버튼 */}
              {searchType === "FLOOR" && (
                <div className={styles.subOptionBox}>
                  <div className={styles.comparisonGridWithBtn}>
                    {/* 좌측: 비교 층수 A */}
                    <div>
                      <div className={styles.subFieldLabelRow}>
                        <span className={styles.subFieldTitle}>비교 층수 A</span>
                      </div>
                      <div className={styles.selectWrapper}>
                        <select
                          value={selectedFloorA}
                          onChange={(e) => {
                            setSelectedFloorA(e.target.value);
                            setCompareTrigger(null);
                          }}
                          className={styles.selectInput}
                        >
                          {FLOOR_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className={styles.selectArrowIcon} />
                      </div>
                    </div>

                    {/* 우측: 비교 층수 B */}
                    <div>
                      <div className={styles.subFieldLabelRow}>
                        <span className={styles.subFieldTitle}>비교 층수 B</span>
                      </div>
                      <div className={styles.selectWrapper}>
                        <select
                          value={selectedFloorB}
                          onChange={(e) => {
                            setSelectedFloorB(e.target.value);
                            setCompareTrigger(null);
                          }}
                          className={styles.selectInput}
                        >
                          {FLOOR_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className={styles.selectArrowIcon} />
                      </div>
                    </div>

                    {/* 오른쪽 비교 버튼 */}
                    <div className={styles.searchBtnCol}>
                      <div className={styles.subFieldLabelRow}>
                        <span className="invisible text-xs font-semibold">비교</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCompareClick}
                        disabled={!selectedAptName || !selectedFloorA || !selectedFloorB || isCompareLoading}
                        className={`${styles.compareSubmitBtn} ${!selectedAptName || !selectedFloorA || !selectedFloorB ? styles.compareSubmitBtnDisabled : ""}`}
                      >
                        {isCompareLoading ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <ArrowRightLeft className="size-4" />
                        )}
                        <span>{isCompareLoading ? "비교 중" : "비교"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* =========================================
              4. 비교 분석 결과 출력 영역 (AptCompareResponse)
          ========================================= */}
          {compareTrigger && (
            <div className={styles.compareResultCard}>
              <div className={styles.resultHeader}>
                <div className="flex items-center gap-2">
                  <BarChart3 className="size-5 text-[#0F8AA8]" />
                  <h3 className={styles.resultTitle}>
                    <strong>{compareTrigger.apt_name}</strong> {compareTrigger.type === "PYUNG" ? "평형별" : "층수별"} 시세 비교 분석
                  </h3>
                </div>
                <span className={styles.resultTargetBadge}>
                  {compareTrigger.targetA} vs {compareTrigger.targetB}
                </span>
              </div>

              {isCompareLoading ? (
                <div className={styles.resultLoadingState}>
                  <Loader2 className="size-8 animate-spin text-[#0F8AA8]" />
                  <p>비교 데이터를 불러오는 중입니다...</p>
                </div>
              ) : compareResult ? (() => {
                const hasDataA = Boolean(
                  (compareResult.priceA && compareResult.priceA > 0) ||
                  (compareResult.avgPriceA && compareResult.avgPriceA > 0) ||
                  (compareResult.recentPriceA && compareResult.recentPriceA > 0) ||
                  (compareResult.dealCountA && compareResult.dealCountA > 0)
                );
                const hasDataB = Boolean(
                  (compareResult.priceB && compareResult.priceB > 0) ||
                  (compareResult.avgPriceB && compareResult.avgPriceB > 0) ||
                  (compareResult.recentPriceB && compareResult.recentPriceB > 0) ||
                  (compareResult.dealCountB && compareResult.dealCountB > 0)
                );

                if (!hasDataA && !hasDataB) {
                  return (
                    <div className={styles.resultEmptyState}>
                      <div className={styles.emptyIconCircle}>
                        <Search className="size-6 text-slate-400" />
                      </div>
                      <div className={styles.emptyTitle}>
                        {compareTrigger.targetA} vs {compareTrigger.targetB} 실거래 데이터 없음
                      </div>
                      <p className={styles.emptyDesc}>
                        해당 조건의 등록된 데이터가 존재하지 않습니다.
                      </p>
                    </div>
                  );
                }

                const recentPriceDiff = (hasDataA && hasDataB && compareResult.recentPriceA && compareResult.recentPriceB)
                  ? compareResult.recentPriceA - compareResult.recentPriceB
                  : 0;
                const avgPyeongDiff = (hasDataA && hasDataB && compareResult.avgPyeongAmtA && compareResult.avgPyeongAmtB)
                  ? compareResult.avgPyeongAmtA - compareResult.avgPyeongAmtB
                  : 0;

                const areaTextA = [
                  compareResult.recentFloorA,
                  compareResult.recentSupplyPyeongA ? (compareResult.recentSupplyPyeongA.includes("공급") ? compareResult.recentSupplyPyeongA : `공급 ${compareResult.recentSupplyPyeongA}`) : "",
                  compareResult.recentExclusiveAreaA ? `전용 ${compareResult.recentExclusiveAreaA}` : "",
                ].filter(Boolean).join(" · ");

                const areaTextB = [
                  compareResult.recentFloorB,
                  compareResult.recentSupplyPyeongB ? (compareResult.recentSupplyPyeongB.includes("공급") ? compareResult.recentSupplyPyeongB : `공급 ${compareResult.recentSupplyPyeongB}`) : "",
                  compareResult.recentExclusiveAreaB ? `전용 ${compareResult.recentExclusiveAreaB}` : "",
                ].filter(Boolean).join(" · ");

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
              ); })() : (
                <div className={styles.resultEmptyState}>
                  <div className={styles.emptyIconCircle}>
                    <Search className="size-6 text-slate-400" />
                  </div>
                  <div className={styles.emptyTitle}>
                    {compareTrigger.targetA} vs {compareTrigger.targetB} 실거래 데이터 없음
                  </div>
                  <p className={styles.emptyDesc}>
                    해당 조건의 등록된 데이터가 존재하지 않습니다.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
