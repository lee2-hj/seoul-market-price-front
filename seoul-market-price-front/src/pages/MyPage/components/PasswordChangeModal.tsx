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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-[16px] border border-[#DCE8ED] shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-full bg-[#E6F4F2] text-[#0F766E] flex items-center justify-center mx-auto text-[22px]">
            🔒
          </div>
          <h3 className="text-[20px] font-black text-[#123047]">새 비밀번호 설정</h3>
          <p className="text-[13px] text-[#6B7280]">
            본인인증이 완료되었습니다. 새로운 비밀번호를 입력해 주세요.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-[#13202B] block">새 비밀번호 (8~16자)</label>
            <input
              type="password"
              placeholder="새 비밀번호를 입력하세요"
              value={newPassword}
              onChange={(e) => onChangeNewPassword(e.target.value)}
              className="w-full h-[46px] rounded-[8px] border border-[#DCE8ED] bg-white px-3.5 text-[15px] text-[#13202B] outline-none focus:border-[#0F8AA8]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-[#13202B] block">새 비밀번호 확인</label>
            <input
              type="password"
              placeholder="새 비밀번호를 한 번 더 입력하세요"
              value={newPasswordConfirm}
              onChange={(e) => onChangeNewPasswordConfirm(e.target.value)}
              className="w-full h-[46px] rounded-[8px] border border-[#DCE8ED] bg-white px-3.5 text-[15px] text-[#13202B] outline-none focus:border-[#0F8AA8]"
            />
          </div>

          {passwordError && (
            <p className="text-[13px] text-rose-500 font-bold">{passwordError}</p>
          )}
        </div>

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-[46px] bg-white hover:bg-[#F0F7FA] text-[#6B7280] border border-[#DCE8ED] font-bold text-[14px] rounded-[8px] cursor-pointer transition-colors"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={onSave}
            className="flex-1 h-[46px] bg-[#0F8AA8] hover:bg-[#0B5E73] text-white font-bold text-[14px] rounded-[8px] cursor-pointer transition-colors shadow-xs"
          >
            변경 완료
          </button>
        </div>
      </div>
    </div>
  );
}
