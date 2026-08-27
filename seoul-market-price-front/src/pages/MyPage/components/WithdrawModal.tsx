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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-[420px] rounded-[16px] bg-white p-6 shadow-2xl space-y-5 border border-[#DCE8ED]">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-2 text-xl font-bold">
            ⚠️
          </div>
          <h3 className="text-[20px] font-bold text-[#123047]">회원 탈퇴 확인</h3>
          <p className="text-[13px] text-[#6B7280]">
            안전한 탈퇴를 위해 현재 계정의 비밀번호를 입력해 주세요.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-[13px] font-bold text-[#13202B]">
            비밀번호 입력
          </label>
          <input
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
            className="h-[46px] w-full rounded-[8px] border border-[#DCE8ED] bg-white px-4 text-[14px] text-[#13202B] outline-none focus:border-rose-400"
          />
          {withdrawError && (
            <p className="text-[12px] font-bold text-rose-500">{withdrawError}</p>
          )}
        </div>

        <div className="p-3 bg-[#fff8f8] border border-[#f1cccc] rounded-[8px] text-[12px] text-[#a44141] leading-relaxed">
          탈퇴 후에도 작성한 게시글과 댓글은 유지되며, 탈퇴한 계정은 복구할 수 없습니다.
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-[42px] px-5 rounded-[8px] border border-[#DCE8ED] bg-white text-[14px] font-bold text-[#6B7280] hover:bg-[#F0F7FA] cursor-pointer transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            disabled={isWithdrawing}
            onClick={onConfirm}
            className="h-[42px] px-6 rounded-[8px] bg-rose-600 hover:bg-rose-700 text-[14px] font-bold text-white border-none cursor-pointer transition-colors shadow-xs disabled:opacity-50"
          >
            {isWithdrawing ? "탈퇴 처리 중..." : "탈퇴 확인"}
          </button>
        </div>
      </div>
    </div>
  );
}
