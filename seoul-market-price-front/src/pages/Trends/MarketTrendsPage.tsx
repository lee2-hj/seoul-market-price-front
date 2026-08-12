import { useState, useEffect, useMemo } from "react";
import {
  SEOUL_GU_DONG_LIST,
  getMarketTrendsData,
  formatPriceKorean,
} from "@/features/trends/services/trendsService";
import type {
  TrendsDataResponse,
  MonthlyPriceTrendPoint,
} from "@/features/trends/types/trends.types";

export default function MarketTrendsPage() {
  const [selectedGu, setSelectedGu] = useState<string>("송파구");
  const [selectedDong, setSelectedDong] = useState<string>("전체");
  const [trendsData, setTrendsData] = useState<TrendsDataResponse | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<MonthlyPriceTrendPoint | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 선택된 구의 동 목록
  const currentDongList = useMemo(() => {
    const found = SEOUL_GU_DONG_LIST.find((item) => item.gu === selectedGu);
    return found ? found.dongs : ["전체"];
  }, [selectedGu]);

  // 데이터 로드
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    getMarketTrendsData(selectedGu, selectedDong).then((res) => {
      if (isMounted) {
        setTrendsData(res);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [selectedGu, selectedDong]);

  // 구 변경 시 동 초기화
  const handleGuChange = (gu: string) => {
    setSelectedGu(gu);
    setSelectedDong("전체");
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

  return (
    <div className="w-full min-h-screen bg-[#f8faf8] text-[#2d3a2f] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1140px] mx-auto space-y-8">
        {/* 상단 타이틀 영역 */}
        <div className="bg-white border border-[#e2ece2] rounded-[16px] p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[12px] font-bold text-[#4c9b55] uppercase tracking-wider">
                  REAL ESTATE MARKET INTELLIGENCE
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#e8f5e9] text-[#2e7d32]">
                  실거래가 + AI 가격 예측
                </span>
              </div>
              <h1 className="text-[24px] sm:text-[28px] font-extrabold text-[#242f25] tracking-tight">
                서울시 아파트 거래동향 & 시세 추이
              </h1>
              <p className="text-[14px] text-[#6b7b6d] mt-1.5 leading-relaxed">
                국토교통부 실거래 빅데이터와 머신러닝 예측 모델을 결합하여 자치구별 거래량과 예상 시세를 한눈에 확인하세요.
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[12px] text-[#88988a] block">데이터 기준일</span>
              <span className="text-[13px] font-bold text-[#4a584c]">
                {trendsData?.lastUpdated || "2026.08.12"} (일일 갱신)
              </span>
            </div>
          </div>
        </div>

        {/* 자치구 및 법정동 선택 필터 */}
        <div className="bg-white border border-[#e2ece2] rounded-[16px] p-6 shadow-xs space-y-4">
          <div>
            <span className="text-[12px] font-bold text-[#78887a] block mb-2.5">
              1. 자치구 선택
            </span>
            <div className="flex flex-wrap gap-2">
              {SEOUL_GU_DONG_LIST.map((item) => {
                const isActive = item.gu === selectedGu;
                return (
                  <button
                    key={item.gu}
                    type="button"
                    onClick={() => handleGuChange(item.gu)}
                    className={`px-4 py-2 rounded-[8px] text-[13px] font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#2d3a2f] text-white shadow-xs"
                        : "bg-[#f4f7f4] text-[#556457] hover:bg-[#e8ede8]"
                    }`}
                  >
                    {item.gu}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-[#edf3ed]">
            <span className="text-[12px] font-bold text-[#78887a] block mb-2.5">
              2. 법정동 선택 ({selectedGu})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {currentDongList.map((dong) => {
                const isActive = dong === selectedDong;
                return (
                  <button
                    key={dong}
                    type="button"
                    onClick={() => setSelectedDong(dong)}
                    className={`px-3 py-1.5 rounded-[6px] text-[12px] font-medium transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#4c9b55] text-white font-bold"
                        : "bg-white border border-[#dce4da] text-[#5a685c] hover:bg-[#f0f4f0]"
                    }`}
                  >
                    {dong}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 주요 핵심 지표 카드 4종 */}
        {trendsData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 카드 1: 이번 달 거래량 */}
            <div className="bg-white border border-[#e2ece2] rounded-[14px] p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#78887a]">월간 거래량</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                  +{trendsData.summary.txChangeRate}% 증감
                </span>
              </div>
              <div className="mt-3">
                <div className="text-[26px] font-extrabold text-[#242f25]">
                  {trendsData.summary.totalTransactions.toLocaleString()}
                  <span className="text-[14px] font-normal text-[#78887a] ml-1">건</span>
                </div>
                <span className="text-[12px] text-[#88988a] mt-0.5 block">
                  {selectedGu} {selectedDong} 기준
                </span>
              </div>
            </div>

            {/* 카드 2: 평균 평당가 */}
            <div className="bg-white border border-[#e2ece2] rounded-[14px] p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#78887a]">평균 평당 거래가</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                  +{trendsData.summary.priceChangeRate}% 상승
                </span>
              </div>
              <div className="mt-3">
                <div className="text-[26px] font-extrabold text-[#242f25]">
                  {trendsData.summary.avgPricePerPyeong.toLocaleString()}
                  <span className="text-[14px] font-normal text-[#78887a] ml-1">만원 / 평</span>
                </div>
                <span className="text-[12px] text-[#88988a] mt-0.5 block">전용면적 기준 환산</span>
              </div>
            </div>

            {/* 카드 3: 최고가 거래 단지 */}
            <div className="bg-white border border-[#e2ece2] rounded-[14px] p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#78887a]">최고 실거래 단지</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800">
                  신고가 경신
                </span>
              </div>
              <div className="mt-3">
                <div className="text-[20px] font-extrabold text-[#242f25] truncate">
                  {trendsData.summary.highestTradeComplex}
                </div>
                <span className="text-[14px] font-bold text-[#4c9b55] mt-0.5 block">
                  {formatPriceKorean(trendsData.summary.highestTradePrice)}
                </span>
              </div>
            </div>

            {/* 카드 4: AI 시장 심리 지수 */}
            <div className="bg-white border border-[#e2ece2] rounded-[14px] p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#78887a]">AI 시세 전망 지수</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                  안정적 상승세
                </span>
              </div>
              <div className="mt-3">
                <div className="text-[22px] font-extrabold text-[#2b6cb0]">
                  매수 심리 우세
                </div>
                <span className="text-[12px] text-[#78887a] mt-0.5 block">
                  향후 3개월간 완만한 상승 예측
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 가격 추이 & AI 예측 인터랙티브 그래프 */}
        <div className="bg-white border border-[#e2ece2] rounded-[16px] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-extrabold text-[#242f25]">
                {selectedGu} 월별 실거래가 & AI 예상 시세 추이
              </h2>
              <p className="text-[13px] text-[#78887a] mt-0.5">
                과거 12개월 실거래 평균가 추이와 향후 3개월간의 머신러닝 예측 가격입니다.
              </p>
            </div>
            {/* 범례 */}
            <div className="flex items-center gap-4 text-[12px] font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#4c9b55]" />
                <span className="text-[#3c4a3e]">실거래 평균가</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#7c3aed] border border-dashed border-[#5b21b6]" />
                <span className="text-[#6d28d9]">🔮 AI 예측 시세</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#e2ece2]" />
                <span className="text-[#78887a]">거래량 (건)</span>
              </div>
            </div>
          </div>

          {/* SVG 차트 컨테이너 */}
          <div className="relative w-full h-[320px] pt-6 pb-2">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center text-[#78887a] text-[14px]">
                데이터를 분석하고 있습니다...
              </div>
            ) : (
              <div className="w-full h-full relative">
                {/* 배경 가이드라인 */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
                  <div className="border-b border-[#dce4da] w-full" />
                  <div className="border-b border-[#dce4da] w-full" />
                  <div className="border-b border-[#dce4da] w-full" />
                  <div className="border-b border-[#dce4da] w-full" />
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
                        fill={pt.isPrediction ? "#ede9fe" : "#e4ede4"}
                        className="transition-all hover:opacity-80"
                      />
                    );
                  })}

                  {/* 2. 실거래가 라인 (과거 12개월) */}
                  <polyline
                    fill="none"
                    stroke="#4c9b55"
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
                    stroke="#7c3aed"
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
                          fill={isPred ? "#7c3aed" : "#4c9b55"}
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          className="transition-transform hover:scale-150"
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* X축 월 라벨 */}
                <div className="absolute bottom-0 inset-x-0 flex justify-between px-2 text-[11px] font-medium text-[#78887a]">
                  {chartPoints.map((pt) => (
                    <span
                      key={`lbl-${pt.month}`}
                      className={`text-center ${
                        pt.isPrediction ? "text-[#7c3aed] font-bold" : ""
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
                    className="absolute top-2 right-4 bg-[#242f25] text-white p-3 rounded-[10px] shadow-lg text-[12px] space-y-1 pointer-events-none z-10"
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <span>{hoveredPoint.month}월 데이터</span>
                      {hoveredPoint.isPrediction && (
                        <span className="px-1.5 py-0.2 rounded bg-purple-500 text-[10px]">
                          AI 예측
                        </span>
                      )}
                    </div>
                    <div>
                      평균 가격:{" "}
                      <span className="font-extrabold text-[#7ee787]">
                        {formatPriceKorean(
                          hoveredPoint.actualAvgPrice || hoveredPoint.predictedAvgPrice || 0
                        )}
                      </span>
                    </div>
                    <div className="text-[#a5d6a7]">
                      거래량: <span className="font-bold">{hoveredPoint.txVolume}건</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 구/동별 인기 아파트 단지 실거래 랭킹 TOP 10 */}
        <div className="bg-white border border-[#e2ece2] rounded-[16px] overflow-hidden shadow-xs">
          <div className="p-6 border-b border-[#edf3ed] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-[18px] font-extrabold text-[#242f25]">
                {selectedGu} {selectedDong} 실거래 순위 TOP
              </h2>
              <p className="text-[13px] text-[#78887a] mt-0.5">
                최근 1개월간 거래량이 가장 많았던 단지와 평균 체결 금액입니다.
              </p>
            </div>
            <span className="text-[12px] font-bold text-[#4c9b55] px-3 py-1 bg-[#f0f7f0] rounded-full self-start sm:self-auto">
              정렬: 거래량 순
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left border-collapse">
              <thead>
                <tr className="bg-[#f5f8f5] border-b border-[#e2ece2] text-[13px] text-[#556457] font-bold">
                  <th className="py-3.5 px-4 text-center w-[70px]">순위</th>
                  <th className="py-3.5 px-4">단지명 및 소재지</th>
                  <th className="py-3.5 px-4 text-center w-[130px]">평형 / 면적</th>
                  <th className="py-3.5 px-4 text-center w-[110px]">월간 거래건수</th>
                  <th className="py-3.5 px-4 text-right w-[150px]">평균 거래가</th>
                  <th className="py-3.5 px-4 text-right w-[150px]">최근 실거래가</th>
                  <th className="py-3.5 px-4 text-center w-[110px]">전월 대비</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf3ed] text-[13px]">
                {trendsData?.rankings.map((item) => (
                  <tr key={`${item.complexName}-${item.rank}`} className="hover:bg-[#f9fbf9] transition-colors">
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-extrabold ${
                          item.rank === 1
                            ? "bg-[#fed7aa] text-[#9a3412]"
                            : item.rank === 2
                            ? "bg-[#e2e8f0] text-[#334155]"
                            : item.rank === 3
                            ? "bg-[#ffedd5] text-[#c2410c]"
                            : "bg-[#f1f5f9] text-[#64748b]"
                        }`}
                      >
                        {item.rank}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-bold text-[#242f25]">
                      <div className="flex items-center gap-2">
                        <span>{item.complexName}</span>
                        {item.isNewHighPrice && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#fef2f2] text-[#dc2626] border border-[#fecaca]">
                            신고가
                          </span>
                        )}
                      </div>
                      <span className="text-[12px] text-[#78887a] font-normal block mt-0.5">
                        {selectedGu} {item.dong}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center text-[#556457] font-medium">
                      {item.pyeongType}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="font-extrabold text-[#242f25]">{item.txCount}</span>
                      <span className="text-[12px] text-[#78887a]">건</span>
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-[#4a584c]">
                      {formatPriceKorean(item.avgTradePrice)}
                    </td>
                    <td className="py-4 px-4 text-right font-extrabold text-[#242f25]">
                      {formatPriceKorean(item.recentTradePrice)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700">
                        +{formatPriceKorean(item.changeFromLastMonth)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
