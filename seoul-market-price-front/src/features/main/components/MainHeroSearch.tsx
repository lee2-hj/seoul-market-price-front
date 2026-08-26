import { Link } from "react-router-dom";
import { Bot, LoaderCircle, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AiCandidateModal } from "@/features/main/components/AiCandidateModal";
import { AiResultModal } from "@/features/main/components/AiResultModal";
import { useAiPriceQuestion } from "@/features/main/hooks/useAiPriceQuestion";

export function MainHeroSearch() {
  const ai = useAiPriceQuestion();
  const activeCandidates = ai.singleCandidates.length > 0
    ? ai.singleCandidates
    : ai.candidateGroups[ai.candidateStep] ?? [];

  return (
    <section className="bg-[linear-gradient(135deg,#E8F6F9_0%,#F5FAFC_58%,#FFFFFF_100%)]">
      <div className="mx-auto grid w-full max-w-[1360px] grid-cols-1 gap-6 px-5 py-8 md:grid-cols-[minmax(0,13fr)_minmax(0,7fr)] md:items-center md:px-8 md:py-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-8 lg:py-11">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-black tracking-[0.16em] text-[#0F8AA8]">SEOUL APARTMENT MARKET</p>
          <h1 className="m-0 text-4xl font-black leading-[1.18] tracking-[-0.04em] text-[#123047] md:text-5xl">서울 아파트 시세,<br />가장 선명하고 빠르게</h1>
          <p className="mb-0 mt-5 max-w-xl text-base leading-7 text-[#526573] md:text-lg">AI가 질문을 판단하여 서울 아파트의 시세와 가격 정보를 이해하기 쉽게 답변해 드립니다.</p>

          <form className="mt-5 w-full max-w-2xl" onSubmit={(event) => { event.preventDefault(); ai.submit(); }}>
            <div className="flex w-full min-w-0 flex-col gap-2 rounded-xl border border-[#C9DEE6] bg-white p-2 shadow-[0_8px_24px_rgba(18,48,71,0.08)] focus-within:border-[#0F8AA8] focus-within:ring-4 focus-within:ring-[#0F8AA8]/10 sm:flex-row">
              <div className="flex min-w-0 flex-1 items-center"><Search className="ml-3 size-5 shrink-0 text-[#0F8AA8]" aria-hidden="true" /><Input value={ai.question} onChange={(event) => { ai.setQuestion(event.target.value); ai.clearMessage(); }} aria-label="AI 아파트 시세 질문" autoComplete="off" placeholder="아파트 단지명, 지역(구/동), 금액대 등 서울 아파트 시세에 대해 물어보세요" className="h-12 min-w-0 w-full border-0 bg-transparent px-3 shadow-none focus-visible:ring-0" /></div>
              <Button type="submit" disabled={ai.isLoading} className="h-12 shrink-0 rounded-lg bg-[#0F8AA8] px-5 text-white hover:bg-[#0B5E73] sm:min-w-32">{ai.isLoading ? <><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />답변 생성 중</> : <><Bot className="size-4" aria-hidden="true" />AI 시세 질문</>}</Button>
            </div>

            <div aria-live="polite" className="mt-2 min-h-8">
              {ai.error && <div role="alert" className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg px-3 py-2 text-sm ${ai.loginRequired ? "bg-[#FFF8E8] text-[#78540A]" : "bg-[#FFF1F2] text-[#B42318]"}`}><span className="min-w-0 flex-1">{ai.error}</span>{ai.loginRequired ? <Button asChild size="sm" variant="outline" className="bg-white"><Link to="/login">로그인</Link></Button> : <Button type="button" size="sm" variant="outline" onClick={ai.retry} disabled={ai.isLoading} className="bg-white">다시 시도</Button>}</div>}
              {ai.isLoading && !ai.error && <p className="m-0 flex items-center gap-2 px-1 text-sm font-bold text-[#0B5E73]"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />AI가 시세 질문을 분석하고 있습니다.</p>}
            </div>
          </form>
        </div>

        <div className="hidden min-w-0 w-full md:block" aria-hidden="true">
          <div className="relative ml-auto aspect-[16/9] w-full max-w-[520px] overflow-hidden rounded-2xl border border-[#DCE8ED] bg-white shadow-[0_8px_24px_rgba(18,48,71,0.08)]">
            <img src="/apartment-hero.png" alt="" className="absolute inset-0 size-full object-cover object-[72%_center]" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.5),transparent_62%)]" />
            <div className="absolute left-4 top-4 flex h-12 items-end gap-1.5" aria-hidden="true"><i className="h-5 w-2 rounded-sm bg-[#0F8AA8]" /><i className="h-8 w-2 rounded-sm bg-[#2563EB]" /><i className="h-12 w-2 rounded-sm bg-[#0F8AA8]" /></div>
            <div className="absolute bottom-4 left-4 flex flex-wrap gap-1.5 text-[10px] font-bold text-[#123047]" aria-hidden="true"><span className="rounded-full border border-white/80 bg-white/85 px-2 py-1">실거래가</span><span className="rounded-full border border-white/80 bg-white/85 px-2 py-1">평당가격</span><span className="rounded-full border border-white/80 bg-white/85 px-2 py-1">거래량</span></div>
          </div>
        </div>
      </div>

      {ai.result && <AiResultModal result={ai.result} onClose={ai.closeResult} />}
      {activeCandidates.length > 0 && <AiCandidateModal candidates={activeCandidates} onChoose={ai.singleCandidates.length > 0 ? ai.chooseSingleCandidate : ai.chooseCandidate} onClose={ai.closeCandidates} />}
    </section>
  );
}
