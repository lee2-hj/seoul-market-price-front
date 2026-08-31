import { useState } from "react";
import { Bot, Info, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { AiCandidateModal } from "@/features/main/components/AiCandidateModal";
import { AiResultModal } from "@/features/main/components/AiResultModal";
import { useAiPriceQuestion } from "@/features/main/hooks/useAiPriceQuestion";

export function MainHeroSearch() {
  const user = useAuthStore((state) => state.user);
  const ai = useAiPriceQuestion();
  const [hasSubmittedAsGuest, setHasSubmittedAsGuest] = useState(false);

  const activeCandidates = ai.singleCandidates.length > 0
    ? ai.singleCandidates
    : ai.candidateGroups[ai.candidateStep] ?? [];

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user && ai.question.trim()) {
      setHasSubmittedAsGuest(true);
    }
    ai.submit();
  };

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(135deg,#E8F6F9_0%,#F5FAFC_55%,#FFFFFF_100%)]">
      {/* Hero 우측 자연스러운 배경 비주얼 */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 overflow-hidden md:block select-none"
        aria-hidden="true"
      >
        <picture>
          <source
            type="image/webp"
            srcSet="/apartment-hero-700w.webp 700w, /apartment-hero-1400w.webp 1400w"
            sizes="(min-width: 1360px) 680px, 50vw"
          />
          <source
            type="image/jpeg"
            srcSet="/apartment-hero-700w.jpg 700w, /apartment-hero-1400w.jpg 1400w"
            sizes="(min-width: 1360px) 680px, 50vw"
          />
          <img
            src="/apartment-hero-1400w.jpg"
            alt=""
            className="size-full object-cover object-[75%_center] opacity-30 lg:opacity-55 [mask-image:linear-gradient(to_left,black_25%,transparent_100%)]"
          />
        </picture>
      </div>

      <div className="relative mx-auto w-full max-w-[1360px] px-4 py-8 sm:px-6 sm:py-10 md:px-8 md:py-12">
        <div className="max-w-3xl mx-auto text-center">
          <p className="mb-2 text-xs font-black tracking-[0.16em] text-[#0F8AA8]">
            SEOUL APARTMENT MARKET
          </p>

          {/* 데스크톱에서는 각각 1줄, 좁은 화면에서는 자연스러운 줄바꿈 */}
          <h1 className="m-0 text-2xl font-black leading-[1.25] tracking-[-0.03em] text-[#123047] sm:text-3xl lg:text-4xl xl:text-4xl xl:whitespace-nowrap">
            서울 아파트 시세, 가장 선명하고 빠르게
          </h1>
          <p className="mb-0 mt-2.5 text-sm leading-6 text-[#526573] sm:text-base lg:text-base xl:whitespace-nowrap">
            AI가 질문을 판단하여 서울 아파트의 시세와 가격 정보를 이해하기 쉽게 답변해 드립니다.
          </p>

          {/* AI 질문 입력창 */}
          <form className="mt-5 w-full max-w-2xl mx-auto" onSubmit={handleFormSubmit}>
            <div className="flex w-full min-w-0 flex-col gap-2 rounded-xl border border-[#C9DEE6] bg-white p-1.5 shadow-[0_6px_20px_rgba(18,48,71,0.07)] focus-within:border-[#0F8AA8] focus-within:ring-3 focus-within:ring-[#0F8AA8]/15 sm:flex-row sm:items-center sm:gap-2 sm:p-1.5">
              <div className="flex min-w-0 flex-1 items-center">
                <Input
                  value={ai.question}
                  onChange={(event) => {
                    ai.setQuestion(event.target.value);
                    ai.clearMessage();
                  }}
                  aria-label="AI 아파트 시세 질문"
                  autoComplete="off"
                  maxLength={500}
                  placeholder="무엇이든 물어보세요"
                  className="h-10 sm:h-11 min-w-0 w-full border-0 bg-transparent px-3 text-sm sm:text-base shadow-none focus-visible:ring-0 placeholder:text-[#94A3B8]"
                />
              </div>
              <Button
                type="submit"
                disabled={ai.isLoading}
                className="h-9 shrink-0 rounded-lg bg-[#0F8AA8] px-3 text-xs font-bold text-white hover:bg-[#0B5E73] sm:px-3.5 sm:text-sm"
              >
                {ai.isLoading ? (
                  <>
                    <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
                    답변 생성 중
                  </>
                ) : (
                  <>
                    <Bot className="size-3.5" aria-hidden="true" />
                    AI 질문
                  </>
                )}
              </Button>
            </div>

            {/* 비로그인 전송 안내 및 에러/로딩 상태 */}
            <div aria-live="polite" className="mt-2 min-h-6">
              {!user && hasSubmittedAsGuest && !ai.error && (
                <p className="m-0 mb-1 flex items-center gap-1.5 px-1 text-xs text-[#526573]">
                  <Info className="size-3.5 shrink-0 text-[#0F8AA8]" aria-hidden="true" />
                  <span>비로그인 사용자는 분당 최대 15회까지 질문할 수 있습니다.</span>
                </p>
              )}
              {ai.error && (
                <div
                  role="alert"
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-[#FFF1F2] px-3 py-2 text-sm text-[#B42318]"
                >
                  <span className="min-w-0 flex-1">{ai.error}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={ai.retry}
                    disabled={ai.isLoading}
                    className="bg-white"
                  >
                    다시 시도
                  </Button>
                </div>
              )}
              {ai.isLoading && !ai.error && (
                <p className="m-0 flex items-center gap-2 px-1 text-sm font-bold text-[#0B5E73]">
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  AI가 시세 질문을 분석하고 있습니다.
                </p>
              )}
            </div>
          </form>
        </div>
      </div>

      {ai.result && <AiResultModal result={ai.result} question={ai.submittedQuestion} onClose={ai.closeResult} />}
      {activeCandidates.length > 0 && (
        <AiCandidateModal
          candidates={activeCandidates}
          onChoose={ai.singleCandidates.length > 0 ? ai.chooseSingleCandidate : ai.chooseCandidate}
          onClose={ai.closeCandidates}
        />
      )}
    </section>
  );
}
