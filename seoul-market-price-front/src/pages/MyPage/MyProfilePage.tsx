import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useProfileForm } from "./hooks/useProfileForm";
import { usePasswordChangeModal } from "./hooks/usePasswordChangeModal";
import { useWithdrawModal } from "./hooks/useWithdrawModal";
import PasswordChangeModal from "./components/PasswordChangeModal";
import WithdrawModal from "./components/WithdrawModal";
import ProfileIdentitySection from "./components/ProfileIdentitySection";
import ProfileAddressSection from "./components/ProfileAddressSection";

export default function MyProfilePage() {
  const {
    isLoggedIn,
    isSocialUser,
    socialProvider,
    rawUserId,
    isSggsLoading,
    districtOptions,
    preferredDistrict,
    preferredDistrictError,
    register,
    setValue,
    phoneValue,
    phoneVerified,
    handlePassSuccess,
    isFormDirty,
    isSaving,
    onSubmit,
    handleCancelChanges,
    handlePreferredDistrictChange,
    handleInvalidDistrictBlur,
  } = useProfileForm();

  // 비밀번호 변경 모달 훅
  const {
    isPasswordModalOpen,
    newPassword,
    newPasswordConfirm,
    passwordError,
    setNewPassword,
    setNewPasswordConfirm,
    handleOpenPasswordModal,
    handleClosePasswordModal,
    handleSaveNewPassword,
  } = usePasswordChangeModal({
    isLoggedIn,
    phoneVerified,
  });

  // 회원 탈퇴 모달 훅
  const {
    isWithdrawModalOpen,
    isSocialConfirmOpen,
    withdrawPassword,
    withdrawError,
    isWithdrawing,
    setWithdrawPassword,
    handleClickWithdraw,
    handleCloseWithdrawModal,
    handleConfirmWithdrawWithPassword,
    handleConfirmSocialWithdraw,
    handleCancelSocialWithdraw,
  } = useWithdrawModal({
    isLoggedIn,
    isSocialUser,
    userId: rawUserId,
  });

  return (
    <div>
      <div className="rounded-[12px] border border-[#DCE8ED] bg-white p-8 shadow-xs md:p-10">
        <form onSubmit={onSubmit} className="space-y-12">
          {!isLoggedIn && (
            <div className="p-4 bg-[#fff8f8] border border-[#f1cccc] rounded-[8px] text-center space-y-2">
              <p className="text-[14px] text-[#c54e4e] font-bold">
                현재 비로그인 상태입니다. 회원 정보 수정 및 인증을 진행하시려면 로그인이 필요합니다.
              </p>
              <Link
                to="/login"
                className="inline-block px-5 py-2 bg-[#0F8AA8] text-white font-bold text-[13px] rounded-[6px]"
              >
                로그인하러 가기
              </Link>
            </div>
          )}

          {/* 1. 회원 정보 관리 */}
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-[22px] font-black text-[#123047]">회원 정보 관리</h2>
              <p className="text-[14px] text-[#6B7280]">
                회원님의 필수 인적사항과 본인인증을 진행하실 수 있습니다.
              </p>
            </div>

            <div className="space-y-5 max-w-[820px] mx-auto">
              <ProfileIdentitySection
                register={register}
                setValue={setValue}
                isLoggedIn={isLoggedIn}
                isSocialUser={isSocialUser}
                socialProvider={socialProvider}
                phoneVerified={phoneVerified}
                phoneValue={phoneValue}
                onOpenPasswordModal={handleOpenPasswordModal}
                onPassSuccess={handlePassSuccess}
              />

              <ProfileAddressSection
                register={register}
                setValue={setValue}
                isLoggedIn={isLoggedIn}
                preferredDistrict={preferredDistrict}
                districtOptions={districtOptions}
                isDistrictDisabled={!isLoggedIn || isSggsLoading}
                preferredDistrictError={preferredDistrictError}
                onPreferredDistrictChange={handlePreferredDistrictChange}
                onInvalidBlur={handleInvalidDistrictBlur}
              />
            </div>
          </div>

          {/* ========================================================
              [회원 정보 및 설정 저장] & [변경 취소] 버튼 영역
          ======================================================== */}
          <div className="pt-8 border-t border-[#DCE8ED] text-center">
            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3">
              <Button
                type="submit"
                disabled={!isLoggedIn || isSaving}
                className="order-1 h-[52px] w-full bg-[#0F8AA8] px-10 text-[16px] text-white shadow-xs hover:bg-[#0B5E73] sm:order-2 sm:w-auto"
              >
                {isSaving ? "저장 중..." : "회원 정보 저장"}
              </Button>
              {isFormDirty && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelChanges}
                  className="order-2 h-[52px] w-full border-[#DCE8ED] px-8 text-[15px] text-[#6B7280] shadow-xs hover:bg-[#F0F7FA] sm:order-1 sm:w-auto"
                >
                  변경 취소
                </Button>
              )}
            </div>
            <p className="text-[13px] text-[#6B7280] mt-2">
              회원 인적사항 변경사항이 저장됩니다.
            </p>
          </div>

          {/* 4. 회원 탈퇴 */}
          <div className="mt-8 p-6 bg-[#fff8f8] border border-[#f1cccc] rounded-[10px] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-[17px] font-bold text-[#a44141]">회원 탈퇴</h3>
              <p className="text-[14px] text-[#947474] mt-1">
                탈퇴 후에도 작성한 게시글과 댓글은 유지되며, 계정 정보는 복구할 수 없습니다.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={!isLoggedIn}
              onClick={handleClickWithdraw}
              className="h-[44px] whitespace-nowrap border-[#d96666] bg-white px-5 text-[14px] text-[#c54e4e] hover:bg-[#fff0f0]"
            >
              회원 탈퇴
            </Button>
          </div>
        </form>
      </div>

      {/* 비밀번호 변경 팝업 모달 */}
      <PasswordChangeModal
        isOpen={isPasswordModalOpen}
        newPassword={newPassword}
        newPasswordConfirm={newPasswordConfirm}
        passwordError={passwordError}
        onChangeNewPassword={(val) => {
          setNewPassword(val);
        }}
        onChangeNewPasswordConfirm={(val) => {
          setNewPasswordConfirm(val);
        }}
        onClose={handleClosePasswordModal}
        onSave={handleSaveNewPassword}
      />

      {/* 일반 회원 탈퇴 비밀번호 확인 모달 */}
      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        withdrawPassword={withdrawPassword}
        withdrawError={withdrawError}
        isWithdrawing={isWithdrawing}
        onChangePassword={(val) => {
          setWithdrawPassword(val);
        }}
        onConfirm={handleConfirmWithdrawWithPassword}
        onClose={handleCloseWithdrawModal}
      />

      {/* 소셜 회원 탈퇴 2차 확인 */}
      <ConfirmDialog
        open={isSocialConfirmOpen}
        onOpenChange={(open) => {
          if (!open) handleCancelSocialWithdraw();
        }}
        title="회원 탈퇴"
        description="정말로 회원 탈퇴를 진행하시겠습니까? 탈퇴 후에도 작성한 게시글과 댓글은 유지됩니다."
        isDestructive
        confirmText="탈퇴"
        onConfirm={handleConfirmSocialWithdraw}
      />
    </div>
  );
}
