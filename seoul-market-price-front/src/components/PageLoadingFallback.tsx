/**
 * 페이지 지연 로딩(Suspense) 및 인증 상태 확인 대기 중 노출되는
 * 가볍고 접근성 있는 로딩 Fallback UI.
 */
export default function PageLoadingFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="화면 로딩 중"
      className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-3 px-4 py-16 text-center"
    >
      <div
        className="size-8 animate-spin rounded-full border-[3px] border-[#DCE8ED] border-t-[#0F8AA8]"
        aria-hidden="true"
      />
      <p className="m-0 text-sm font-semibold text-[#526573]">화면을 불러오는 중입니다...</p>
    </div>
  );
}
