import { Lightbulb, X } from "lucide-react";

import type { AiSearchResponse } from "@/api/api";
import { Button } from "@/components/ui/button";
import { formatAiMoneyText } from "@/features/main/utils/aiSearchMappers";

const AI_MODEL_LABEL = import.meta.env.VITE_AI_MODEL || "gpt-5.6-luna";

export function AiResultModal({ result, onClose }: { result: AiSearchResponse; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071D2A]/55 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="ai-result-title" className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#DCE8ED] bg-white p-5 shadow-[0_24px_70px_rgba(7,29,42,0.24)] md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div><p className="m-0 text-xs font-black tracking-[0.14em] text-[#0F8AA8]">AI PRICE INSIGHT</p><p className="mb-0 mt-1 text-xs text-[#7A929E]">model · {AI_MODEL_LABEL}</p></div>
          <Button type="button" size="icon" variant="ghost" onClick={onClose} aria-label="AI 결과 닫기"><X className="size-5" /></Button>
        </div>
        <h2 id="ai-result-title" className="mb-0 mt-5 whitespace-pre-wrap break-words text-xl font-black leading-8 text-[#123047] md:text-2xl">{formatAiMoneyText(result.summary) || "AI 답변을 표시할 수 없습니다."}</h2>

        {result.interpretation && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#CFE7EE] bg-[#F0FAFC] p-4">
            <Lightbulb className="mt-0.5 size-5 shrink-0 text-[#0F8AA8]" aria-hidden="true" />
            <div className="min-w-0"><strong className="block break-words text-sm text-[#123047]">‘{result.interpretation.originalConcept}’을(를) {result.interpretation.appliedMetric} 기준으로 해석했습니다.</strong><p className="my-1 whitespace-pre-wrap break-words text-sm leading-6 text-[#526573]">{result.interpretation.reason}</p><span className="text-xs font-bold text-[#0B5E73]">해석 신뢰도 {Math.round(result.interpretation.confidence * 100)}%{result.interpretation.proxy ? " · 대체 지표" : ""}</span></div>
          </div>
        )}

        {result.criteria && (
          <section className="mt-5" aria-labelledby="criteria-title"><h3 id="criteria-title" className="m-0 text-sm font-black text-[#123047]">결과 기준</h3><div className="mt-2 flex flex-wrap gap-2">{[result.criteria.metric, result.criteria.unit, result.criteria.period, `거래 ${result.criteria.minimumTradeCount}건 이상`, result.criteria.sortDirection].map((value) => <span key={value} className="rounded-full bg-[#EDF4F6] px-3 py-1.5 text-xs font-bold text-[#526573]">{value}</span>)}</div></section>
        )}

        <section className="mt-6" aria-labelledby="key-points-title">
          <h3 id="key-points-title" className="m-0 text-base font-black text-[#123047]">핵심 포인트</h3>
          {result.keyPoints.length > 0 ? <ul className="mb-0 mt-3 space-y-2 pl-5">{result.keyPoints.map((point, index) => <li key={`${point}-${index}`} className="whitespace-pre-wrap break-words text-sm leading-6 text-[#334A58]">{formatAiMoneyText(point)}</li>)}</ul> : <p className="mb-0 mt-2 text-sm text-[#6B7280]">표시할 핵심 포인트가 없습니다.</p>}
        </section>

        {result.cautions.length > 0 && <section className="mt-6 rounded-xl bg-[#FFF8E8] p-4" aria-labelledby="cautions-title"><h3 id="cautions-title" className="m-0 text-sm font-black text-[#A16207]">참고사항</h3><p className="mb-0 mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-[#78540A]">{formatAiMoneyText(result.cautions.join("\n"))}</p></section>}
      </section>
    </div>
  );
}
