import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface WithdrawModalProps {
  isOpen: boolean;
  withdrawPassword: string;
  withdrawError: string;
  isWithdrawing: boolean;
  onChangePassword: (val: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export default function WithdrawModal({
  isOpen,
  withdrawPassword,
  withdrawError,
  isWithdrawing,
  onChangePassword,
  onConfirm,
  onClose,
}: WithdrawModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-[420px] space-y-5 rounded-[16px] border border-[#DCE8ED] p-6">
        <DialogHeader className="items-center space-y-1 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-2 text-xl font-bold">
            ⚠️
          </div>
          <DialogTitle className="text-[20px] font-bold text-[#123047]">회원 탈퇴 확인</DialogTitle>
          <p className="text-[13px] text-[#6B7280]">
            안전한 탈퇴를 위해 현재 계정의 비밀번호를 입력해 주세요.
          </p>
        </DialogHeader>

        <div className="space-y-2">
          <label className="block text-[13px] font-bold text-[#13202B]">
            비밀번호 입력
          </label>
          <Input
            type="password"
            placeholder="현재 비밀번호를 입력하세요"
            value={withdrawPassword}
            onChange={(e) => onChangePassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onConfirm();
              }
            }}
            className="h-[46px] rounded-[8px] border-[#DCE8ED] text-[14px] focus-visible:border-rose-400"
          />
          {withdrawError && (
            <p className="text-[12px] font-bold text-rose-500">{withdrawError}</p>
          )}
        </div>

        <div className="p-3 bg-[#fff8f8] border border-[#f1cccc] rounded-[8px] text-[12px] text-[#a44141] leading-relaxed">
          탈퇴 후에도 작성한 게시글과 댓글은 유지되며, 탈퇴한 계정은 복구할 수 없습니다.
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-[42px] px-5 border-[#DCE8ED] text-[14px] text-[#6B7280] hover:bg-[#F0F7FA]"
          >
            취소
          </Button>
          <Button
            type="button"
            disabled={isWithdrawing}
            onClick={onConfirm}
            className="h-[42px] px-6 bg-rose-600 text-[14px] text-white shadow-xs hover:bg-rose-700"
          >
            {isWithdrawing ? "탈퇴 처리 중..." : "탈퇴 확인"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
