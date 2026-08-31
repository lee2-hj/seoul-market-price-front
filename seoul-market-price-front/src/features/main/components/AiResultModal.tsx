import { ArrowRight, ArrowRightLeft, ChartNoAxesCombined, Lightbulb, Map, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import type { AiSearchResponse } from "@/api/api";
import { Button } from "@/components/ui/button";
import { formatAiMoneyText } from "@/features/main/utils/aiSearchMappers";

const AI_MODEL_LABEL = import.meta.env.VITE_AI_MODEL || "gpt-5.6-luna";

export function AiResultModal({ result, question, onClose }: { result: AiSearchResponse; question: string; onClose: () => void }) {
  const navigate = useNavigate();
  const quickLinks = [
    { label: "비교하러 가기", description: "지역별 가격을 한눈에 비교", to: "/price/compare-list", icon: ArrowRightLeft, iconTone: "bg-[#E2F5F7] text-[#087C95]" },
    { label: "동향 보러 가기", description: "서울 아파트 시장 흐름 확인", to: "/trends", icon: ChartNoAxesCombined, iconTone: "bg-[#E8EEF8] text-[#234C8D]" },
    { label: "가격 검색하기", description: "아파트·지역 가격 더 찾아보기", to: "/price/detail", icon: Search, iconTone: "bg-[#EDF7F1] text-[#287A4A]" },
    { label: "지역 지도 보기", description: "지도에서 지역별 가격 탐색", to: "/region-map", icon: Map, iconTone: "bg-[#F1EDFF] text-[#6942C6]" },
  ];

  const handleNavigate = (to: string) => {
    onClose();
    navigate(to);
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#071D2A]/60 p-3 backdrop-blur-[2px] md:p-5" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="ai-result-title" className="flex h-[92vh] max-h-[96vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-[#DCE8ED] bg-white shadow-[0_30px_90px_rgba(7,29,42,0.30)]">
        <header className="flex items-start justify-between gap-4">
          <div className="px-6 pt-6 md:px-10 md:pt-8"><p className="m-0 text-xs font-black tracking-[0.16em] text-[#0F8AA8]">AI PRICE INSIGHT</p><p className="mb-0 mt-1 text-xs text-[#7A929E]">model · {AI_MODEL_LABEL}</p></div>
          <Button type="button" size="icon" variant="ghost" onClick={onClose} aria-label="AI 결과 닫기" className="mr-4 mt-4 rounded-full bg-[#EDF7F9] text-[#0B5E73] hover:bg-[#D9EFF3] md:mr-7 md:mt-6"><X className="size-5" /></Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 md:px-10 md:pb-8">
          {question && <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#D7E9EE] bg-[#F4FAFC] px-4 py-3 md:mt-6"><Search className="mt-0.5 size-4 shrink-0 text-[#0F8AA8]" aria-hidden="true" /><div className="min-w-0"><p className="m-0 text-[11px] font-black tracking-[0.12em] text-[#5E8290]">YOUR QUESTION</p><p className="mb-0 mt-1 break-words text-sm font-bold leading-6 text-[#23495A]">{question}</p></div></div>}
          <h2 id="ai-result-title" className="mb-0 mt-7 whitespace-pre-wrap break-words text-2xl font-black leading-9 tracking-[-0.03em] text-[#123047] md:text-4xl md:leading-[1.35]">{formatAiMoneyText(result.summary) || "AI 답변을 표시할 수 없습니다."}</h2>

          {result.interpretation && <div className="mt-7 flex items-start gap-3 rounded-2xl border border-[#CFE7EE] bg-[#F0FAFC] p-5"><Lightbulb className="mt-0.5 size-5 shrink-0 text-[#0F8AA8]" aria-hidden="true" /><div className="min-w-0"><strong className="block break-words text-sm text-[#123047]">‘{result.interpretation.originalConcept}’을(를) {result.interpretation.appliedMetric} 기준으로 해석했습니다.</strong><p className="my-1 whitespace-pre-wrap break-words text-sm leading-6 text-[#526573]">{result.interpretation.reason}</p><span className="text-xs font-bold text-[#0B5E73]">해석 신뢰도 {Math.round(result.interpretation.confidence * 100)}%{result.interpretation.proxy ? " · 대체 지표" : ""}</span></div></div>}

          {result.criteria && <section className="mt-7" aria-labelledby="criteria-title"><h3 id="criteria-title" className="m-0 text-base font-black text-[#123047]">결과 기준</h3><div className="mt-3 flex flex-wrap gap-2">{[result.criteria.metric, result.criteria.unit, result.criteria.period, result.criteria.minimumTradeCount > 0 ? `거래 ${result.criteria.minimumTradeCount}건 이상` : "거래 건수 제한 없음", result.criteria.sortDirection].map((value) => <span key={value} className="rounded-full bg-[#EDF4F6] px-3 py-1.5 text-sm font-bold text-[#526573]">{value}</span>)}</div></section>}

          <section className="mt-8" aria-labelledby="key-points-title"><h3 id="key-points-title" className="m-0 text-lg font-black text-[#123047]">핵심 포인트</h3>{result.keyPoints.length > 0 ? <ul className="mb-0 mt-4 space-y-3 pl-5">{result.keyPoints.map((point, index) => <li key={`${point}-${index}`} className="whitespace-pre-wrap break-words text-base leading-7 text-[#334A58]">{formatAiMoneyText(point)}</li>)}</ul> : <p className="mb-0 mt-3 text-base text-[#6B7280]">표시할 핵심 포인트가 없습니다.</p>}</section>

          {result.cautions.length > 0 && <section className="mt-8 rounded-2xl bg-[#FFF8E8] p-5" aria-labelledby="cautions-title"><h3 id="cautions-title" className="m-0 text-base font-black text-[#A16207]">참고사항</h3><p className="mb-0 mt-2 whitespace-pre-wrap break-words text-base leading-7 text-[#78540A]">{formatAiMoneyText(result.cautions.join("\n"))}</p></section>}
        </div>

        <footer className="border-t border-[#DCE8ED] bg-[#FAFCFD] px-6 pb-8 pt-4 md:px-10 md:pb-10 md:pt-5"><div className="mb-2 flex items-center gap-2"><span className="size-1.5 rounded-full bg-[#0F8AA8]" /><h3 className="m-0 text-xs font-black text-[#123047]">이어서 살펴보기</h3></div><div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">{quickLinks.map(({ label, description, to, icon: Icon }) => <button key={to} type="button" onClick={() => handleNavigate(to)} className={`group flex min-h-[60px] items-center gap-2.5 rounded-xl px-4 text-left shadow-[0_6px_14px_rgba(18,48,71,0.11)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(18,48,71,0.16)] ${to === "/price/compare-list" ? "bg-gradient-to-br from-[#1395AF] to-[#08758E]" : to === "/trends" ? "bg-gradient-to-br from-[#3B6DC3] to-[#274F99]" : to === "/price/detail" ? "bg-gradient-to-br from-[#389464] to-[#1E754A]" : "bg-gradient-to-br from-[#8257CF] to-[#6840B7]"}`}><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white ring-1 ring-white/25"><Icon className="size-4" /></span><span className="min-w-0 flex-1"><strong className="block text-xs text-white">{label}</strong><span className="mt-0.5 block text-[11px] text-white/80">{description}</span></span><ArrowRight className="size-3.5 shrink-0 text-white/80 transition group-hover:translate-x-0.5 group-hover:text-white" /></button>)}</div></footer>
      </section>
    </div>
  );
}
