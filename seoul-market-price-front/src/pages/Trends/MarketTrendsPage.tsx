import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import {
  getMarketTrendsData,
  formatPriceKorean,
} from "@/features/trends/services/trendsService";
import { getDongs, getSggs } from "@/features/location/services/locationService";
import type { MonthlyPriceTrendPoint } from "@/features/trends/types/trends.types";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";

function getStoredPreferredDistrict(userId?: string): string | null {
  try {
    const cleanId = (userId || "").trim().toLowerCase();
    const key = cleanId ? `myPageSettings_${cleanId}` : "myPageSettings_guest";
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed?.preferredDistrict === "string" && parsed.preferredDistrict.trim()) {
        return parsed.preferredDistrict as string;
      }
    }
  } catch (e) {
    console.warn("선호지역 로드 오류:", e);
  }
  return null;
}

function getInitialGu(userId?: string): string {
  return getStoredPreferredDistrict(userId) ?? "송파구";
}

export default function MarketTrendsPage() {
  const loginUser = useAuthStore((state) => state.user);
  const loginUserId = loginUser?.userId;

  // 마이페이지에 저장된 선호지역 감지
  const preferredDistrict = useMemo(
    () => getStoredPreferredDistrict(loginUserId),
    [loginUserId],
  );

  const [selectedGu, setSelectedGu] = useState<string>(() =>
    getInitialGu(loginUserId),
  );
  const [selectedDong, setSelectedDong] = useState<string>("전체");
  const [selectedComplex, setSelectedComplex] = useState<string>("전체");
  const [guSearch, setGuSearch] = useState<string>(() => getInitialGu(loginUserId));
  const [dongSearch, setDongSearch] = useState<string>("전체");
  const [hoveredPoint, setHoveredPoint] = useState<MonthlyPriceTrendPoint | null>(null);

  const {
    data: sggs = [],
    isLoading: isSggsLoading,
    isError: isSggsError,
  } = useQuery({
    queryKey: ["location", "sggs"],
    queryFn: getSggs,
    staleTime: Infinity,
  });

  const selectedSggCode =
    sggs.find((sgg) => sgg.sggNm === selectedGu)?.sggCd ?? "";
  const {
    data: dongs = [],
    isLoading: isDongsLoading,
    isError: isDongsError,
  } = useQuery({
    queryKey: ["location", "dongs", selectedSggCode],
    queryFn: () => getDongs(selectedSggCode),
    enabled: Boolean(selectedSggCode),
    staleTime: Infinity,
  });

  // 선택된 구의 동 목록
  const currentDongList = useMemo(
    () => ["전체", ...new Set(dongs.map((dong) => dong.dongNm))],
    [dongs],
  );

  const guOptions = useMemo(() => sggs.map((sgg) => sgg.sggNm), [sggs]);

  const { data: trendsData, isLoading } = useQuery({
    queryKey: ["marketTrends", selectedGu, selectedDong, selectedComplex],
    queryFn: () =>
      getMarketTrendsData(selectedGu, selectedDong, selectedComplex),
  });

  // 구 변경 시 동 및 단지 초기화
  const handleGuChange = (gu: string) => {
    setSelectedGu(gu);
    setGuSearch(gu);
    setSelectedDong("전체");
    setSelectedComplex("전체");
    setDongSearch("전체");
  };

  // 동 변경 시 단지 초기화
  const handleDongChange = (dong: string) => {
    setSelectedDong(dong);
    setDongSearch(dong);
    setSelectedComplex("전체");
  };

  // 차트 계산용 파라미터
  const chartPoints = trendsData?.monthlyTrends || [];
  const prices = chartPoints
    .map((p) => (p.actualAvgPrice !== null ? p.actualAvgPrice : p.predictedAvgPrice || 0))
    .filter((v) => v > 0);
  const minPrice = prices.length ? Math.min(...prices) * 0.96 : 100000;
  const maxPrice = prices.length ? Math.max(...prices) * 1.04 : 350000;
  const priceRange = maxPrice - minPrice || 1;

  const maxVolume = Math.max(...chartPoints.map((p) => p.txVolume), 500);
  const rankingItems = trendsData?.rankings ?? [];
  const risingComplexes = [...rankingItems]
    .filter((item) => item.changeFromLastMonth > 0)
    .sort((a, b) => b.changeFromLastMonth - a.changeFromLastMonth)
    .slice(0, 3);
  const fallingComplexes = [...rankingItems]
    .filter((item) => item.changeFromLastMonth < 0)
    .sort((a, b) => a.changeFromLastMonth - b.changeFromLastMonth)
    .slice(0, 3);
  const areaPriceComparison = Array.from(
    rankingItems.reduce((groups, item) => {
      const current = groups.get(item.pyeongType) ?? { totalPrice: 0, count: 0 };
      groups.set(item.pyeongType, {
        totalPrice: current.totalPrice + item.recentTradePrice,
        count: current.count + 1,
      });
      return groups;
    }, new Map<string, { totalPrice: number; count: number }>()),
  ).map(([area, value]) => ({
    area,
    averagePrice: Math.round(value.totalPrice / value.count),
    complexCount: value.count,
  }));

  return (
    <div className="w-full min-h-screen bg-[#F5FAFC] text-[#13202B] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1140px] mx-auto space-y-8">
        {/* 상단 타이틀 영역 */}
        <div className="bg-[#FFFFFF] border border-[#DCE8ED] rounded-[16px] p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[12px] font-extrabold text-[#0F8AA8] uppercase tracking-wider">
                  SSABU MARKET INTELLIGENCE
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E6F4F2] text-[#0F766E]">
                  서울시 25개 자치구 · 법정동 DB 연동
                </span>
              </div>
              <h1 className="text-[24px] sm:text-[28px] font-extrabold text-[#123047] tracking-tight">
                서울시 아파트 거래동향 & AI 시세 추이
              </h1>
              <p className="text-[14px] text-[#6B7280] mt-1.5 leading-relaxed">
                국토교통부 실거래 빅데이터와 머신러닝 예측 모델을 결합하여 서울 자치구·법정동·단지별 거래량과 예상 시세를 한눈에 확인하세요.
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[12px] text-[#6B7280] block">데이터 기준일</span>
              <span className="text-[13px] font-bold text-[#123047]">
                {trendsData?.lastUpdated || "2026.08.12"} (일일 갱신)
              </span>
            </div>
          </div>
        </div>

        {/* 3단계 인터랙티브 필터 (구 ➔ 동 ➔ 아파트 단지) */}
        <div className="bg-[#FFFFFF] border border-[#DCE8ED] rounded-[16px] p-6 shadow-xs space-y-5">
          {/* 1. 자치구 선택 */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[12px] font-bold text-[#6B7280] block">
                1. 자치구 선택 ({isSggsLoading ? "조회 중" : `${sggs.length}개 자치구`})
              </span>
              {preferredDistrict && (
                <span className="text-[12px] font-bold text-[#0F766E]">
                  회원님의 관심 선호지역: <strong className="text-[#0F8AA8]">{preferredDistrict}</strong>
                </span>
              )}
            </div>
            <div className="max-w-[420px]">
              {isSggsError && (
                <p className="mb-2 text-[12px] font-semibold text-rose-500">
                  자치구 목록을 불러오지 못했습니다.
                </p>
              )}
              <AutocompleteInput
                value={guSearch}
                options={guOptions}
                disabled={isSggsLoading || isSggsError}
                requiredSelection
                placeholder="자치구 검색..."
                onChange={(value) => {
                  setGuSearch(value);
                  if (guOptions.includes(value)) handleGuChange(value);
                }}
                onInvalidBlur={() => setGuSearch(selectedGu)}
                className="h-[46px] rounded-[9px] border border-[#DCE8ED] bg-white px-4 text-[14px] font-bold text-[#13202B] outline-none focus:border-[#0F8AA8] disabled:bg-[#F0F7FA]"
              />
              <p className="mt-1.5 text-[11px] font-medium text-[#6B7280]">
                검색 결과에서 자치구를 선택해 주세요.
              </p>
            </div>
          </div>

          {/* 2. 법정동 선택 */}
          <div className="pt-3.5 border-t border-[#DCE8ED]">
            <div className="mb-2.5">
              <span className="text-[12px] font-bold text-[#6B7280]">
                2. 법정동 선택 ({selectedGu}, 총 {currentDongList.length - 1}개 동)
              </span>
            </div>
            <div className="max-w-[420px]">
              {isDongsLoading && (
                <p className="mb-2 text-[12px] font-semibold text-[#6B7280]">
                  법정동 목록을 불러오는 중입니다.
                </p>
              )}
              {isDongsError && (
                <p className="mb-2 text-[12px] font-semibold text-rose-500">
                  법정동 목록을 불러오지 못했습니다.
                </p>
              )}
              <AutocompleteInput
                value={dongSearch}
                options={currentDongList}
                disabled={!selectedSggCode || isDongsLoading || isDongsError}
                requiredSelection
                placeholder="법정동 검색..."
                onChange={(value) => {
                  setDongSearch(value);
                  if (currentDongList.includes(value)) handleDongChange(value);
                }}
                onInvalidBlur={() => setDongSearch(selectedDong)}
                className="h-[46px] rounded-[9px] border border-[#DCE8ED] bg-white px-4 text-[14px] font-bold text-[#13202B] outline-none focus:border-[#0F8AA8] disabled:bg-[#F0F7FA]"
              />
              <p className="mt-1.5 text-[11px] font-medium text-[#6B7280]">
                DB에 등록된 법정동만 선택할 수 있습니다.
              </p>
            </div>
          </div>

          {/* 3. 아파트 단지 선택 */}
          {trendsData && trendsData.complexList.length > 0 && (
            <div className="pt-3.5 border-t border-[#DCE8ED]">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[12px] font-bold text-[#6B7280]">
                  3. 아파트 단지 선택 ({selectedGu} {selectedDong})
                </span>
                {selectedComplex !== "전체" && (
                  <button
                    type="button"
                    onClick={() => setSelectedComplex("전체")}
                    className="text-[11px] text-[#0F8AA8] font-bold hover:underline cursor-pointer"
                  >
                    전체 단지 보기
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                {trendsData.complexList.map((cName) => {
                  const isActive = cName === selectedComplex;
                  return (
                    <button
                      key={cName}
                      type="button"
                      onClick={() => setSelectedComplex(cName)}
                      className={`px-3 py-1.5 rounded-[6px] text-[12px] font-medium transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#0B5E73] text-white font-bold shadow-xs"
                          : "bg-white border border-[#DCE8ED] text-[#13202B] hover:bg-[#F5FAFC]"
                      }`}
                    >
                      {cName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 주요 핵심 지표 카드 4종 */}
        {trendsData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 카드 1: 이번 달 거래량 */}
            <div className="bg-[#FFFFFF] border border-[#DCE8ED] rounded-[14px] p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#6B7280]">월간 거래량</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#FEF2F2] text-[#DC2626]">
                  +{trendsData.summary.txChangeRate}% 증감
                </span>
              </div>
              <div className="mt-3">
                <div className="text-[26px] font-extrabold text-[#123047]">
                  {trendsData.summary.totalTransactions.toLocaleString()}
                  <span className="text-[14px] font-normal text-[#6B7280] ml-1">건</span>
                </div>
                <span className="text-[12px] text-[#6B7280] mt-0.5 block">
                  {selectedGu} {selectedDong} 기준
                </span>
              </div>
            </div>

            {/* 카드 2: 평균 평당가 */}
            <div className="bg-[#FFFFFF] border border-[#DCE8ED] rounded-[14px] p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#6B7280]">평균 평당 거래가</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#FEF2F2] text-[#DC2626]">
                  +{trendsData.summary.priceChangeRate}% 상승
                </span>
              </div>
              <div className="mt-3">
                <div className="text-[26px] font-extrabold text-[#123047]">
                  {trendsData.summary.avgPricePerPyeong.toLocaleString()}
                  <span className="text-[14px] font-normal text-[#6B7280] ml-1">만원 / 평</span>
                </div>
                <span className="text-[12px] text-[#6B7280] mt-0.5 block">전용면적 기준 환산</span>
              </div>
            </div>

            {/* 카드 3: 최고가 거래 단지 */}
            <div className="bg-[#FFFFFF] border border-[#DCE8ED] rounded-[14px] p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#6B7280]">최고 실거래 단지</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
                  신고가 경신
                </span>
              </div>
              <div className="mt-3">
                <div className="text-[20px] font-extrabold text-[#123047] truncate">
                  {trendsData.summary.highestTradeComplex}
                </div>
                <span className="text-[14px] font-bold text-[#0F8AA8] mt-0.5 block">
                  {formatPriceKorean(trendsData.summary.highestTradePrice)}
                </span>
              </div>
            </div>

            {/* 카드 4: AI 시장 심리 지수 */}
            <div className="bg-[#FFFFFF] border border-[#DCE8ED] rounded-[14px] p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#6B7280]">AI 시세 전망 지수</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#E6F4F2] text-[#0F766E]">
                  안정적 상승세
                </span>
              </div>
              <div className="mt-3">
                <div className="text-[22px] font-extrabold text-[#0B5E73]">
                  매수 심리 우세
                </div>
                <span className="text-[12px] text-[#6B7280] mt-0.5 block">
                  향후 3개월간 완만한 상승 예측
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 가격 추이 & AI 예측 인터랙티브 그래프 */}
        <div className="bg-[#FFFFFF] border border-[#DCE8ED] rounded-[16px] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-extrabold text-[#123047]">
                {selectedGu} {selectedDong !== "전체" ? selectedDong : ""} {selectedComplex !== "전체" ? `· ${selectedComplex}` : ""} 월별 실거래가 & AI 예상 시세 추이
              </h2>
              <p className="text-[13px] text-[#6B7280] mt-0.5">
                과거 12개월 실거래 평균가 추이와 향후 3개월간의 머신러닝 예측 가격입니다.
              </p>
            </div>
            {/* 범례 */}
            <div className="flex items-center gap-4 text-[12px] font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#0F8AA8]" />
                <span className="text-[#13202B]">실거래 평균가</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#7CC9D8] border border-dashed border-[#0B5E73]" />
                <span className="text-[#0B5E73]">🔮 AI 예측 시세</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#DCE8ED]" />
                <span className="text-[#6B7280]">거래량 (건)</span>
              </div>
            </div>
          </div>

          {/* SVG 차트 컨테이너 */}
          <div className="relative w-full h-[320px] pt-6 pb-2">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center text-[#6B7280] text-[14px]">
                데이터를 분석하고 있습니다...
              </div>
            ) : (
              <div className="w-full h-full relative">
                {/* 배경 가이드라인 */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-50">
                  <div className="border-b border-[#DCE8ED] w-full" />
                  <div className="border-b border-[#DCE8ED] w-full" />
                  <div className="border-b border-[#DCE8ED] w-full" />
                  <div className="border-b border-[#DCE8ED] w-full" />
                </div>

                {/* SVG 차트 */}
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                  {/* 1. 거래량 바 (배경) */}
                  {chartPoints.map((pt, idx) => {
                    const xPercent = (idx / (chartPoints.length - 1)) * 94 + 3;
                    const barHeight = (pt.txVolume / maxVolume) * 120;
                    return (
                      <rect
                        key={`vol-${pt.month}`}
                        x={`${xPercent - 1.5}%`}
                        y={320 - barHeight - 35}
                        width="3%"
                        height={barHeight}
                        rx="3"
                        fill={pt.isPrediction ? "#E1EFF5" : "#E2EEF2"}
                        className="transition-all hover:opacity-80"
                      />
                    );
                  })}

                  {/* 2. 실거래가 라인 (과거 12개월) */}
                  <polyline
                    fill="none"
                    stroke="#0F8AA8"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={chartPoints
                      .filter((p) => p.actualAvgPrice !== null)
                      .map((p, idx) => {
                        const x = (idx / (chartPoints.length - 1)) * 94 + 3;
                        const y =
                          320 -
                          (((p.actualAvgPrice || 0) - minPrice) / priceRange) * 230 -
                          45;
                        return `${(x / 100) * 1000},${y}`;
                      })
                      .join(" ")}
                    viewBox="0 0 1000 320"
                    vectorEffect="non-scaling-stroke"
                  />

                  {/* 3. AI 예상가 라인 (연결 점선) */}
                  <polyline
                    fill="none"
                    stroke="#0B5E73"
                    strokeWidth="3"
                    strokeDasharray="6 4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={chartPoints
                      .filter((p) => p.predictedAvgPrice !== null)
                      .map((p) => {
                        const idx = chartPoints.findIndex((item) => item.month === p.month);
                        const x = (idx / (chartPoints.length - 1)) * 94 + 3;
                        const y =
                          320 -
                          (((p.predictedAvgPrice || 0) - minPrice) / priceRange) * 230 -
                          45;
                        return `${(x / 100) * 1000},${y}`;
                      })
                      .join(" ")}
                    viewBox="0 0 1000 320"
                    vectorEffect="non-scaling-stroke"
                  />

                  {/* 4. 데이터 포인트 점 및 호버 트리거 */}
                  {chartPoints.map((pt, idx) => {
                    const xPercent = (idx / (chartPoints.length - 1)) * 94 + 3;
                    const priceVal =
                      pt.actualAvgPrice !== null ? pt.actualAvgPrice : pt.predictedAvgPrice || 0;
                    const yPos = 320 - ((priceVal - minPrice) / priceRange) * 230 - 45;
                    const isPred = pt.isPrediction;

                    return (
                      <g
                        key={`pt-${pt.month}`}
                        onMouseEnter={() => setHoveredPoint(pt)}
                        onMouseLeave={() => setHoveredPoint(null)}
                        className="cursor-pointer"
                      >
                        <circle
                          cx={`${xPercent}%`}
                          cy={yPos}
                          r={isPred ? "5" : "5.5"}
                          fill={isPred ? "#7CC9D8" : "#0F8AA8"}
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          className="transition-transform hover:scale-150"
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* X축 월 라벨 */}
                <div className="absolute bottom-0 inset-x-0 flex justify-between px-2 text-[11px] font-medium text-[#6B7280]">
                  {chartPoints.map((pt) => (
                    <span
                      key={`lbl-${pt.month}`}
                      className={`text-center ${
                        pt.isPrediction ? "text-[#0B5E73] font-bold" : ""
                      }`}
                    >
                      {pt.month}
                      {pt.month === "26.08" && " (현재)"}
                    </span>
                  ))}
                </div>

                {/* 툴팁 오버레이 */}
                {hoveredPoint && (
                  <div
                    className="absolute top-2 right-4 bg-[#123047] text-white p-3 rounded-[10px] shadow-lg text-[12px] space-y-1 pointer-events-none z-10"
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <span>{hoveredPoint.month}월 데이터</span>
                      {hoveredPoint.isPrediction && (
                        <span className="px-1.5 py-0.2 rounded bg-[#0F8AA8] text-[10px] font-bold">
                          AI 예측
                        </span>
                      )}
                    </div>
                    <div>
                      평균 가격:{" "}
                      <span className="font-extrabold text-[#7CC9D8]">
                        {formatPriceKorean(
                          hoveredPoint.actualAvgPrice || hoveredPoint.predictedAvgPrice || 0
                        )}
                      </span>
                    </div>
                    <div className="text-[#DCE8ED]">
                      거래량: <span className="font-bold text-white">{hoveredPoint.txVolume}건</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 구/동별 인기 아파트 단지 실거래 랭킹 TOP 10 */}
        <div className="bg-[#FFFFFF] border border-[#DCE8ED] rounded-[16px] overflow-hidden shadow-xs">
          <div className="p-6 border-b border-[#DCE8ED] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-[18px] font-extrabold text-[#123047]">
                {selectedGu} {selectedDong} 실거래 순위 TOP
              </h2>
              <p className="text-[13px] text-[#6B7280] mt-0.5">
                최근 1개월간 거래량이 가장 많았던 단지와 평균 체결 금액입니다.
              </p>
            </div>
            <span className="text-[12px] font-bold text-[#0F8AA8] px-3 py-1 bg-[#E6F4F2] rounded-full self-start sm:self-auto">
              정렬: 거래량 순
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left border-collapse">
              <thead>
                <tr className="bg-[#F0F7FA] border-b border-[#DCE8ED] text-[13px] text-[#123047] font-bold">
                  <th className="py-3.5 px-4 text-center w-[70px]">순위</th>
                  <th className="py-3.5 px-4">단지명 및 소재지</th>
                  <th className="py-3.5 px-4 text-center w-[130px]">평형 / 면적</th>
                  <th className="py-3.5 px-4 text-center w-[110px]">월간 거래건수</th>
                  <th className="py-3.5 px-4 text-right w-[150px]">평균 거래가</th>
                  <th className="py-3.5 px-4 text-right w-[150px]">최근 실거래가</th>
                  <th className="py-3.5 px-4 text-center w-[110px]">전월 대비</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE8ED] text-[13px]">
                {trendsData?.rankings.map((item) => (
                  <tr key={`${item.complexName}-${item.rank}`} className="hover:bg-[#F5FAFC] transition-colors">
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-extrabold ${
                          item.rank === 1
                            ? "bg-[#123047] text-white"
                            : item.rank === 2
                            ? "bg-[#0F8AA8] text-white"
                            : item.rank === 3
                            ? "bg-[#7CC9D8] text-[#123047]"
                            : "bg-[#E1EFF5] text-[#123047]"
                        }`}
                      >
                        {item.rank}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-bold text-[#13202B]">
                      <div className="flex items-center gap-2">
                        <span>{item.complexName}</span>
                        {item.isNewHighPrice && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                            신고가
                          </span>
                        )}
                      </div>
                      <span className="text-[12px] text-[#6B7280] font-normal block mt-0.5">
                        {selectedGu} {item.dong}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center text-[#6B7280] font-medium">
                      {item.pyeongType}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="font-extrabold text-[#123047]">{item.txCount}</span>
                      <span className="text-[12px] text-[#6B7280]">건</span>
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-[#6B7280]">
                      {formatPriceKorean(item.avgTradePrice)}
                    </td>
                    <td className="py-4 px-4 text-right font-extrabold text-[#123047]">
                      {formatPriceKorean(item.recentTradePrice)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-[#FEF2F2] text-[#DC2626]">
                        +{formatPriceKorean(item.changeFromLastMonth)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 급상승·급락 단지 */}
        <section className="bg-white border border-[#DCE8ED] rounded-[16px] p-6 shadow-xs space-y-5">
          <div>
            <h2 className="text-[18px] font-extrabold text-[#123047]">급상승·급락 단지</h2>
            <p className="text-[13px] text-[#6B7280] mt-0.5">
              선택 지역 단지의 전월 대비 실거래가 변동 폭을 비교합니다.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[12px] border border-[#FECACA] bg-[#FEF2F2] p-4">
              <strong className="text-[14px] font-extrabold text-[#DC2626]">상승 폭이 큰 단지</strong>
              <div className="mt-3 space-y-2">
                {risingComplexes.length > 0 ? risingComplexes.map((item) => (
                  <div key={`rise-${item.complexName}`} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="truncate font-bold text-[#13202B]">{item.complexName}</span>
                    <span className="shrink-0 font-extrabold text-[#DC2626]">
                      +{formatPriceKorean(item.changeFromLastMonth)}
                    </span>
                  </div>
                )) : <p className="text-[12px] text-[#6B7280]">상승 단지가 없습니다.</p>}
              </div>
            </div>
            <div className="rounded-[12px] border border-[#7CC9D8] bg-[#E8F6F9] p-4">
              <strong className="text-[14px] font-extrabold text-[#0B5E73]">하락 폭이 큰 단지</strong>
              <div className="mt-3 space-y-2">
                {fallingComplexes.length > 0 ? fallingComplexes.map((item) => (
                  <div key={`fall-${item.complexName}`} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="truncate font-bold text-[#13202B]">{item.complexName}</span>
                    <span className="shrink-0 font-extrabold text-[#0891B2]">
                      -{formatPriceKorean(Math.abs(item.changeFromLastMonth))}
                    </span>
                  </div>
                )) : <p className="text-[12px] text-[#6B7280]">하락 단지가 없습니다.</p>}
              </div>
            </div>
          </div>
        </section>

        {/* 평형대별 시세 비교 */}
        <section className="bg-white border border-[#DCE8ED] rounded-[16px] p-6 shadow-xs space-y-5">
          <div>
            <h2 className="text-[18px] font-extrabold text-[#123047]">평형대별 시세 비교</h2>
            <p className="text-[13px] text-[#6B7280] mt-0.5">
              선택 지역의 단지 실거래가를 전용면적 유형별로 비교합니다.
            </p>
          </div>
          {areaPriceComparison.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {areaPriceComparison.map((item) => (
                <div key={item.area} className="rounded-[12px] border border-[#DCE8ED] bg-[#F5FAFC] p-4">
                  <span className="text-[12px] font-bold text-[#6B7280]">{item.area}</span>
                  <strong className="mt-2 block text-[19px] font-black text-[#123047]">
                    {formatPriceKorean(item.averagePrice)}
                  </strong>
                  <small className="mt-1 block text-[11px] font-semibold text-[#0F8AA8]">
                    {item.complexCount}개 단지 평균
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-[10px] bg-[#F5FAFC] p-5 text-center text-[13px] text-[#6B7280]">
              비교할 단지 데이터가 없습니다.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
