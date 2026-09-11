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

const AI_MODEL_LABEL = import.meta.env.VITE_AI_MODEL || "AI";

function splitInsightPoint(point: string) {
  const matched = point.match(/^\s*([^:：]{1,28})\s*[:：]\s*(.+)\s*$/);
  return matched
    ? { label: matched[1], value: matched[2] }
    : { label: "핵심 정보", value: point };
}

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
      <section role="dialog" aria-modal="true" aria-labelledby="ai-result-title" className="flex h-[96vh] max-h-[98vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-[#DCE8ED] bg-white shadow-[0_30px_90px_rgba(7,29,42,0.30)]">
        <header className="ai-result-modal-header flex items-start justify-between gap-4">
          <div className="px-5 pt-4 md:px-8 md:pt-5">
            <p className="m-0 text-xs font-black tracking-[0.16em] text-[#0F8AA8]">AI PRICE INSIGHT</p>
            <p className="mb-0 mt-1 text-xs text-[#7A929E]">model · {AI_MODEL_LABEL}</p>
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={onClose} aria-label="AI 결과 닫기" className="mr-3 mt-3 rounded-full bg-[#EDF7F9] text-[#0B5E73] hover:bg-[#D9EFF3] md:mr-5 md:mt-4">
            <X className="size-5" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-7 md:px-10 md:pb-10">
          {question && (
            <div className="mt-3 flex items-start gap-3 rounded-2xl border border-[#D7E9EE] bg-[#F4FAFC] px-4 py-2 md:mt-4">
              <Search className="mt-0.5 size-4 shrink-0 text-[#0F8AA8]" aria-hidden="true" />
              <div className="min-w-0">
                <p className="m-0 text-[11px] font-black tracking-[0.12em] text-[#5E8290]">YOUR QUESTION</p>
                <p className="mb-0 mt-1 break-words text-sm font-bold leading-6 text-[#23495A]">{question}</p>
              </div>
            </div>
          )}

          <h2 id="ai-result-title" className="mb-0 mt-4 line-clamp-2 break-words text-lg font-extrabold leading-6 tracking-[-0.02em] text-[#123047] md:text-xl md:leading-7">
            {formatAiMoneyText(result.summary) || "AI 답변을 표시할 수 없습니다."}
          </h2>

          {result.description && (
            <p className="mb-0 mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#526573]">
              {formatAiMoneyText(result.description)}
            </p>
          )}

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
            <section className="mt-4" aria-labelledby="criteria-title">
              <h3 id="criteria-title" className="m-0 text-sm font-black text-[#123047]">결과 기준</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {[result.criteria.metric, result.criteria.unit, result.criteria.period, result.criteria.minimumTradeCount > 0 ? `거래 ${result.criteria.minimumTradeCount}건 이상` : "거래 건수 제한 없음", result.criteria.sortDirection].map((value) => (
                  <span key={value} className="rounded-full bg-[#EDF4F6] px-3 py-1.5 text-xs font-bold text-[#526573]">{value}</span>
                ))}
              </div>
            </section>
          )}

          {hasRankingItems && (
            <section className="mt-4" aria-labelledby="ranking-list-title">
              <div className="flex items-center justify-between gap-3">
                <h3 id="ranking-list-title" className="m-0 text-lg font-black text-[#123047]">아파트 목록</h3>
                <span className="rounded-full bg-[#EAF7F9] px-2.5 py-1 text-xs font-bold text-[#087C95]">{result.rankingItems?.length}건</span>
              </div>
              <ol className="mb-0 mt-2 grid list-none grid-cols-1 gap-1.5 p-0 sm:grid-cols-2 lg:grid-cols-3">
                {result.rankingItems?.map((item) => (
                  <li key={`${item.rank}-${item.apartmentName}-${item.regionName ?? ""}`} className="rounded-xl border border-[#DDEBF0] bg-white p-2 shadow-[0_2px_8px_rgba(18,48,71,0.04)]">
                    <div className="flex w-full items-start gap-2">
                      <span className={`flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-black ${item.rank === 1 ? "bg-[#0F8AA8] text-white" : "bg-[#DCE6EC] text-[#123047]"}`}>{item.rank}</span>
                      <div className="min-w-0 flex-1">
                        {item.regionName && <p className="m-0 truncate text-[9px] font-bold leading-3 text-[#5E8290]">{item.regionName}</p>}
                        <div className="mt-px flex items-baseline justify-between gap-2">
                          <h4 className="min-w-0 truncate text-[15px] font-extrabold leading-4 tracking-[-0.02em] text-[#17394D]">{item.apartmentName}</h4>
                          <span className="flex shrink-0 items-baseline gap-1 whitespace-nowrap"><span className="text-[9px] font-bold text-[#6A8590]">{item.primaryLabel}</span><strong className="text-[15px] font-black leading-4 tracking-[-0.03em] text-[#087C95]">{formatAiMoneyText(item.primaryValue)}</strong></span>
                        </div>
                        <div className="mt-px flex flex-wrap gap-x-2 gap-y-0 text-[10px] font-semibold leading-3 text-[#526573]">
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
              <div className="flex items-center justify-between gap-3">
                <h3 id="key-points-title" className="m-0 text-lg font-black text-[#123047]">조회 정보</h3>
                {result.keyPoints.length > 0 && <span className="rounded-full bg-[#EAF7F9] px-2.5 py-1 text-xs font-bold text-[#087C95]">{result.keyPoints.length}개</span>}
              </div>
              {result.keyPoints.length > 0 ? (
                <ul className="mb-0 mt-3 list-none grid grid-cols-1 gap-3 p-0 sm:grid-cols-2">
                  {result.keyPoints.map((point, index) => {
                    const insight = splitInsightPoint(formatAiMoneyText(point));
                    return (
                      <li key={`${point}-${index}`} className="min-h-[104px] rounded-2xl border border-[#DDEBF0] bg-white p-4 shadow-[0_5px_16px_rgba(18,48,71,0.05)]">
                        <div className="flex items-start gap-3">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#E6F5F8] text-xs font-black text-[#087C95]">{index + 1}</span>
                          <div className="min-w-0">
                            <p className="m-0 text-xs font-black text-[#5E8290]">{insight.label}</p>
                            <p className="mb-0 mt-1 whitespace-pre-wrap break-words text-sm font-bold leading-6 text-[#23495A]">{insight.value}</p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
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

        <footer className="border-t border-[#DCE8ED] bg-[#FAFCFD] px-5 py-3 md:px-8">
          <div className="mb-1 flex items-center gap-2"><span className="size-1.5 rounded-full bg-[#0F8AA8]" /><h3 className="m-0 text-[11px] font-black text-[#123047]">이어서 확인하기</h3></div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {quickLinks.map(({ label, description, to, icon: Icon }) => (
              <button key={to} type="button" onClick={() => handleNavigate(to)} className="group flex min-h-[40px] items-center gap-2 rounded-xl border border-[#DCE8ED] bg-white px-2.5 text-left transition hover:-translate-y-0.5 hover:border-[#95CFDC] hover:bg-[#F1FAFC]">
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
