import { ChevronRight } from "lucide-react";

import type { DongRegionResponse } from "@/api/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function AiCandidateModal({
  open,
  candidates,
  onChoose,
  onClose,
}: {
  open: boolean;
  candidates: DongRegionResponse[];
  onChoose: (candidate: DongRegionResponse) => void;
  onClose: () => void;
}) {
  const requestedName = candidates[0]?.requestedName ?? "입력한 지역";
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-md rounded-2xl border border-[#DCE8ED] p-5 md:p-6">
        <DialogHeader className="space-y-0 text-left">
          <p className="m-0 text-xs font-black tracking-[0.14em] text-[#0F8AA8]">SELECT REGION</p>
          <DialogTitle className="mb-0 mt-2 text-xl font-black text-[#123047]">
            {requestedName}의 지역을 선택해 주세요
          </DialogTitle>
        </DialogHeader>
        <p className="mb-4 mt-2 text-sm leading-6 text-[#6B7280]">같은 이름의 동이 여러 자치구에 있습니다.</p>
        <div className="space-y-2">{candidates.map((candidate) => <button key={`${candidate.sggCode}-${candidate.dongCode}`} type="button" onClick={() => onChoose(candidate)} className="flex w-full cursor-pointer items-center rounded-xl border border-[#DCE8ED] bg-white px-4 py-3 text-left hover:border-[#0F8AA8] hover:bg-[#F0FAFC]"><span className="min-w-0 flex-1"><strong className="block text-sm text-[#123047]">{candidate.sggName}</strong><span className="mt-0.5 block text-sm text-[#526573]">{candidate.dongName}</span></span><ChevronRight className="size-5 text-[#0F8AA8]" aria-hidden="true" /></button>)}</div>
      </DialogContent>
    </Dialog>
  );
}
