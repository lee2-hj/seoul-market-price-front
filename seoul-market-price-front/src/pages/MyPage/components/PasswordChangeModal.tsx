import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PasswordChangeModalProps {
  isOpen: boolean;
  newPassword: string;
  newPasswordConfirm: string;
  passwordError: string;
  onChangeNewPassword: (val: string) => void;
  onChangeNewPasswordConfirm: (val: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export default function PasswordChangeModal({
  isOpen,
  newPassword,
  newPasswordConfirm,
  passwordError,
  onChangeNewPassword,
  onChangeNewPasswordConfirm,
  onClose,
  onSave,
}: PasswordChangeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-md space-y-6 rounded-[16px] border border-[#DCE8ED] p-6 sm:p-8">
        <DialogHeader className="items-center space-y-1.5 text-center">
          <div className="w-12 h-12 rounded-full bg-[#E6F4F2] text-[#0F766E] flex items-center justify-center mx-auto text-[22px]">
            🔒
          </div>
          <DialogTitle className="text-[20px] font-black text-[#123047]">새 비밀번호 설정</DialogTitle>
          <p className="text-[13px] text-[#6B7280]">
            본인인증이 완료되었습니다. 새로운 비밀번호를 입력해 주세요.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-[#13202B] block">새 비밀번호 (8~16자)</label>
            <Input
              type="password"
              placeholder="새 비밀번호를 입력하세요"
              value={newPassword}
              onChange={(e) => onChangeNewPassword(e.target.value)}
              className="h-[46px] rounded-[8px] border-[#DCE8ED] text-[15px] focus-visible:border-[#0F8AA8]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-[#13202B] block">새 비밀번호 확인</label>
            <Input
              type="password"
              placeholder="새 비밀번호를 한 번 더 입력하세요"
              value={newPasswordConfirm}
              onChange={(e) => onChangeNewPasswordConfirm(e.target.value)}
              className="h-[46px] rounded-[8px] border-[#DCE8ED] text-[15px] focus-visible:border-[#0F8AA8]"
            />
          </div>

          {passwordError && (
            <p className="text-[13px] text-rose-500 font-bold">{passwordError}</p>
          )}
        </div>

        <div className="flex gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-[46px] flex-1 border-[#DCE8ED] text-[14px] text-[#6B7280] hover:bg-[#F0F7FA]"
          >
            닫기
          </Button>
          <Button
            type="button"
            onClick={onSave}
            className="h-[46px] flex-1 bg-[#0F8AA8] text-[14px] text-white shadow-xs hover:bg-[#0B5E73]"
          >
            변경 완료
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
