import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface PasswordChangeModalProps {
  isOpen: boolean;
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
  passwordError: string;
  isSaving: boolean;
  onChangeCurrentPassword: (val: string) => void;
  onChangeNewPassword: (val: string) => void;
  onChangeNewPasswordConfirm: (val: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export default function PasswordChangeModal({
  isOpen,
  currentPassword,
  newPassword,
  newPasswordConfirm,
  passwordError,
  isSaving,
  onChangeCurrentPassword,
  onChangeNewPassword,
  onChangeNewPasswordConfirm,
  onClose,
  onSave,
}: PasswordChangeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-black text-[#123047]">비밀번호 변경</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-[#13202B] block">현재 비밀번호</label>
            <Input
              type="password"
              placeholder="비밀번호"
              value={currentPassword}
              onChange={(e) => onChangeCurrentPassword(e.target.value)}
              className="h-[46px] rounded-[8px] border-[#DCE8ED] text-[15px]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-[#13202B] block">새 비밀번호</label>
            <Input
              type="password"
              placeholder="영문/숫자/특수문자 조합 10~16자"
              value={newPassword}
              onChange={(e) => onChangeNewPassword(e.target.value)}
              className="h-[46px] rounded-[8px] border-[#DCE8ED] text-[15px]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-[#13202B] block">새 비밀번호 확인</label>
            <Input
              type="password"
              placeholder="새 비밀번호"
              value={newPasswordConfirm}
              onChange={(e) => onChangeNewPasswordConfirm(e.target.value)}
              className="h-[46px] rounded-[8px] border-[#DCE8ED] text-[15px]"
            />
          </div>

          {passwordError && (
            <p className="text-[13px] text-rose-500 font-bold" role="alert">
              {passwordError}
            </p>
          )}
        </div>

        <DialogFooter className="flex flex-row items-center justify-between gap-2.5">
          <Button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="h-[46px] flex-1 bg-[#0F8AA8] font-bold text-[14px] text-white shadow-xs hover:bg-[#0B5E73] sm:flex-none sm:px-8"
          >
            {isSaving ? "수정 중..." : "수정"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="h-[46px] flex-1 border-[#DCE8ED] font-bold text-[14px] text-[#6B7280] sm:flex-none sm:px-8"
          >
            취소
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
