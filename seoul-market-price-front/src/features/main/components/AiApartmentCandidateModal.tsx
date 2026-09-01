import { Building2, ChevronRight, X } from "lucide-react";
import type { NaturalApartmentCandidate } from "@/api/api";

export function AiApartmentCandidateModal({ candidates, onChoose, onClose }: {
  candidates: NaturalApartmentCandidate[];
  onChoose: (candidate: NaturalApartmentCandidate) => void;
  onClose: () => void;
}) {
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 p-4" role="dialog" aria-modal="true" aria-label="아파트 단지 선택">
    <section className="w-full max-w-md rounded-3xl border border-[#CFE7EE] bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4"><div><p className="m-0 text-xs font-black tracking-[0.16em] text-[#0F8AA8]">APARTMENT CANDIDATES</p><h2 className="mt-2 text-xl font-black text-[#123047]">어느 단지인가요?</h2><p className="mb-0 text-sm leading-6 text-[#526573]">실제 조회된 단지 중 하나를 선택해주세요.</p></div><button type="button" onClick={onClose} className="rounded-full p-2 text-[#526573] hover:bg-[#EDF4F6]" aria-label="닫기"><X className="size-5" /></button></div>
      <div className="mt-5 space-y-2">{candidates.map((candidate) => <button key={`${candidate.sggCode}-${candidate.dongCode}-${candidate.mno}-${candidate.sno}`} type="button" onClick={() => onChoose(candidate)} className="flex w-full items-center gap-3 rounded-2xl border border-[#DCE8ED] bg-white px-4 py-3 text-left transition hover:border-[#0F8AA8] hover:bg-[#F0FAFC]"><Building2 className="size-5 shrink-0 text-[#0F8AA8]" /><span className="min-w-0 flex-1"><strong className="block text-sm text-[#123047]">{candidate.apartmentName}</strong><span className="mt-0.5 block text-sm text-[#526573]">{candidate.sggName} · {candidate.dongName}</span></span><ChevronRight className="size-5 text-[#0F8AA8]" /></button>)}</div>
    </section>
  </div>;
}
