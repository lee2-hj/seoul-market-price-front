import {
  ArrowRight,
  ArrowRightLeft,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  Lightbulb,
  Map,
  Ruler,
  Search,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import type { AiSearchResponse } from "@/api/api";
import { Button } from "@/components/ui/button";
import { formatAiMoneyText } from "@/features/main/utils/aiSearchMappers";

const AI_MODEL_LABEL = import.meta.env.VITE_AI_MODEL || "gpt-5.6-luna";

export function AiResultModal({ result, question, onClose }: { result: AiSearchResponse; question: string; onClose: () => void }) {
  const navigate = useNavigate();
  const quickLinks = [
    { label: "비교하러 가기", description: "지역별 가격을 한눈에 비교", to: "/price/compare-list", icon: ArrowRightLeft },
    { label: "동향 보러 가기", description: "서울 아파트 시장 흐름 확인", to: "/trends", icon: ChartNoAxesCombined },
    { label: "가격 검색하기", description: "단지별 시세 상세 조회", to: "/price/detail", icon: Search },
    { label: "지역 지도 보기", description: "지도에서 지역별 가격 탐색", to: "/region-map", icon: Map },
  ];

  const handleNavigate = (to: string) => {
    onClose();
    navigate(to);
  };

  const hasRankingItems = (result.rankingItems?.length ?? 0) > 0;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#071D2A]/60 p-3 backdrop-blur-[2px] md:p-5" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="ai-result-title" className="flex h-[92vh] max-h-[96vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-[#DCE8ED] bg-white shadow-[0_30px_90px_rgba(7,29,42,0.30)]">
        <header className="flex items-start justify-between gap-4">
          <div className="px-6 pt-6 md:px-10 md:pt-8">
            <p className="m-0 text-xs font-black tracking-[0.16em] text-[#0F8AA8]">AI PRICE INSIGHT</p>
            <p className="mb-0 mt-1 text-xs text-[#7A929E]">model · {AI_MODEL_LABEL}</p>
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={onClose} aria-label="AI 결과 닫기" className="mr-4 mt-4 rounded-full bg-[#EDF7F9] text-[#0B5E73] hover:bg-[#D9EFF3] md:mr-7 md:mt-6">
            <X className="size-5" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-7 md:px-10 md:pb-10">
          {question && (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#D7E9EE] bg-[#F4FAFC] px-4 py-3 md:mt-6">
              <Search className="mt-0.5 size-4 shrink-0 text-[#0F8AA8]" aria-hidden="true" />
              <div className="min-w-0">
                <p className="m-0 text-[11px] font-black tracking-[0.12em] text-[#5E8290]">YOUR QUESTION</p>
                <p className="mb-0 mt-1 break-words text-sm font-bold leading-6 text-[#23495A]">{question}</p>
              </div>
            </div>
          )}

          <h2 id="ai-result-title" className="mb-0 mt-6 whitespace-pre-wrap break-words text-xl font-extrabold leading-8 tracking-[-0.02em] text-[#123047] md:text-2xl md:leading-9">
            {formatAiMoneyText(result.summary) || "AI 답변을 표시할 수 없습니다."}
          </h2>

          {result.interpretation && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#CFE7EE] bg-[#F0FAFC] p-4">
              <Lightbulb className="mt-0.5 size-5 shrink-0 text-[#0F8AA8]" aria-hidden="true" />
              <div className="min-w-0">
                <strong className="block break-words text-sm text-[#123047]">‘{result.interpretation.originalConcept}’을(를) {result.interpretation.appliedMetric} 기준으로 해석했습니다.</strong>
                <p className="my-1 whitespace-pre-wrap break-words text-sm leading-6 text-[#526573]">{result.interpretation.reason}</p>
                <span className="text-xs font-bold text-[#0B5E73]">해석 신뢰도 {Math.round(result.interpretation.confidence * 100)}%{result.interpretation.proxy ? " · 대체 지표" : ""}</span>
              </div>
            </div>
          )}

          {result.criteria && (
            <section className="mt-6" aria-labelledby="criteria-title">
              <h3 id="criteria-title" className="m-0 text-sm font-black text-[#123047]">결과 기준</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {[result.criteria.metric, result.criteria.unit, result.criteria.period, result.criteria.minimumTradeCount > 0 ? `거래 ${result.criteria.minimumTradeCount}건 이상` : "거래 건수 제한 없음", result.criteria.sortDirection].map((value) => (
                  <span key={value} className="rounded-full bg-[#EDF4F6] px-3 py-1.5 text-xs font-bold text-[#526573]">{value}</span>
                ))}
              </div>
            </section>
          )}

          {hasRankingItems && (
            <section className="mt-7" aria-labelledby="ranking-list-title">
              <div className="flex items-center justify-between gap-3">
                <h3 id="ranking-list-title" className="m-0 text-lg font-black text-[#123047]">아파트 목록</h3>
                <span className="rounded-full bg-[#EAF7F9] px-2.5 py-1 text-xs font-bold text-[#087C95]">{result.rankingItems?.length}건</span>
              </div>
              <ol className="mb-0 mt-3 space-y-3 p-0">
                {result.rankingItems?.map((item) => (
                  <li key={`${item.rank}-${item.apartmentName}-${item.regionName ?? ""}`} className="rounded-2xl border border-[#DDEBF0] bg-white p-4 shadow-[0_5px_16px_rgba(18,48,71,0.05)] transition hover:border-[#B7DDE7] hover:shadow-[0_8px_20px_rgba(18,48,71,0.09)]">
                    <div className="flex items-start gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#0F8AA8] text-sm font-black text-white">{item.rank}</span>
                      <div className="min-w-0 flex-1">
                        {item.regionName && <p className="m-0 truncate text-xs font-bold text-[#5E8290]">{item.regionName}</p>}
                        <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <h4 className="m-0 break-words text-base font-extrabold text-[#17394D]">{item.apartmentName}</h4>
                          <p className="m-0 whitespace-nowrap text-sm font-black text-[#087C95]">{formatAiMoneyText(item.primaryValue)}</p>
                        </div>
                        <p className="mb-0 mt-0.5 text-xs font-semibold text-[#6A8590]">{item.primaryLabel}</p>
                        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 border-t border-[#EDF3F5] pt-3 text-xs font-semibold text-[#526573]">
                          {(item.exclusiveAreaM2 != null || item.pyeong != null) && <span className="inline-flex items-center gap-1"><Ruler className="size-3.5 text-[#0F8AA8]" />전용 {item.exclusiveAreaM2?.toFixed(2) ?? "-"}㎡ · {item.pyeong?.toFixed(1) ?? "-"}평</span>}
                          {item.dealCount != null && <span className="inline-flex items-center gap-1"><Building2 className="size-3.5 text-[#0F8AA8]" />거래 {item.dealCount.toLocaleString("ko-KR")}건</span>}
                          {item.dealDate && <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5 text-[#0F8AA8]" />{item.dealDate}</span>}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {!hasRankingItems && (
            <section className="mt-7" aria-labelledby="key-points-title">
              <h3 id="key-points-title" className="m-0 text-lg font-black text-[#123047]">핵심 포인트</h3>
              {result.keyPoints.length > 0 ? (
                <ul className="mb-0 mt-4 space-y-3 pl-5">
                  {result.keyPoints.map((point, index) => <li key={`${point}-${index}`} className="whitespace-pre-wrap break-words text-base leading-7 text-[#334A58]">{formatAiMoneyText(point)}</li>)}
                </ul>
              ) : <p className="mb-0 mt-3 text-base text-[#6B7280]">표시할 핵심 정보가 없습니다.</p>}
            </section>
          )}

          {result.cautions.length > 0 && (
            <section className="mt-7 rounded-2xl border border-[#F6D98D] bg-[#FFF8E8] p-4" aria-labelledby="cautions-title">
              <h3 id="cautions-title" className="m-0 text-sm font-black text-[#A16207]">참고사항</h3>
              <p className="mb-0 mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#78540A]">{formatAiMoneyText(result.cautions.join("\n"))}</p>
            </section>
          )}
        </div>

        <footer className="border-t border-[#DCE8ED] bg-[#FAFCFD] px-6 pb-5 pt-4 md:px-10 md:pb-6">
          <div className="mb-2 flex items-center gap-2"><span className="size-1.5 rounded-full bg-[#0F8AA8]" /><h3 className="m-0 text-xs font-black text-[#123047]">이어서 확인하기</h3></div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {quickLinks.map(({ label, description, to, icon: Icon }) => (
              <button key={to} type="button" onClick={() => handleNavigate(to)} className="group flex min-h-[52px] items-center gap-2 rounded-xl border border-[#DCE8ED] bg-white px-3 text-left transition hover:-translate-y-0.5 hover:border-[#95CFDC] hover:bg-[#F1FAFC]">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#E6F5F8] text-[#087C95]"><Icon className="size-3.5" /></span>
                <span className="min-w-0 flex-1"><strong className="block truncate text-xs text-[#23495A]">{label}</strong><span className="mt-0.5 hidden text-[10px] text-[#6A8590] lg:block">{description}</span></span>
                <ArrowRight className="size-3 shrink-0 text-[#8AA4AF] transition group-hover:translate-x-0.5 group-hover:text-[#087C95]" />
              </button>
            ))}
          </div>
        </footer>
      </section>
    </div>
  );
}
