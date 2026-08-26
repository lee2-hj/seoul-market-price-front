import { AlertCircle, Inbox } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CardSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-label="데이터를 불러오는 중" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-11 animate-pulse rounded-lg bg-[#EAF2F5]" />
      ))}
    </div>
  );
}

export function CardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex min-h-52 flex-col items-center justify-center gap-3 text-center">
      <AlertCircle className="size-8 text-[#DC2626]" aria-hidden="true" />
      <div>
        <p className="m-0 font-bold text-[#13202B]">데이터를 불러오지 못했습니다</p>
        <p className="mt-1 text-sm text-[#6B7280]">잠시 후 다시 시도해 주세요.</p>
      </div>
      <Button type="button" variant="outline" onClick={onRetry}>다시 시도</Button>
    </div>
  );
}

export function CardEmpty() {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center text-[#6B7280]">
      <Inbox className="size-8 text-[#94A3B8]" aria-hidden="true" />
      <p className="m-0 text-sm">표시할 데이터가 없습니다</p>
    </div>
  );
}
