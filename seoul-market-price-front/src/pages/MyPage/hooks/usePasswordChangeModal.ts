import { useState, useCallback } from "react";
import axios from "axios";
import { updateMemberMeApi } from "@/api/api";

interface UsePasswordChangeModalOptions {
  isLoggedIn: boolean;
  phoneVerified: boolean;
}

export function usePasswordChangeModal({
  isLoggedIn,
  phoneVerified,
}: UsePasswordChangeModalOptions) {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleOpenPasswordModal = useCallback(() => {
    if (!isLoggedIn) {
      alert("로그인 후 이용하실 수 있습니다.");
      return;
    }
    if (!phoneVerified) {
      alert("안전한 비밀번호 변경을 위해 아래 [본인인증]을 먼저 완료해 주세요.");
      return;
    }
    setPasswordError("");
    setNewPassword("");
    setNewPasswordConfirm("");
    setIsPasswordModalOpen(true);
  }, [isLoggedIn, phoneVerified]);

  const handleClosePasswordModal = useCallback(() => {
    setIsPasswordModalOpen(false);
    setPasswordError("");
    setNewPassword("");
    setNewPasswordConfirm("");
  }, []);

  const handleSaveNewPassword = useCallback(async () => {
    if (newPassword.length < 8 || newPassword.length > 16) {
      setPasswordError("비밀번호는 8자 이상 16자 이하로 입력해 주세요.");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setPasswordError("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    try {
      await updateMemberMeApi({ password: newPassword });
      alert(
        "비밀번호가 성공적으로 변경되었습니다. 다음 로그인부터 새 비밀번호를 사용해 주세요.",
      );
      setIsPasswordModalOpen(false);
      setNewPassword("");
      setNewPasswordConfirm("");
      setPasswordError("");
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message
        : null;
      setPasswordError(
        message || "비밀번호 변경에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
    }
  }, [newPassword, newPasswordConfirm]);

  return {
    isPasswordModalOpen,
    newPassword,
    newPasswordConfirm,
    passwordError,
    setNewPassword,
    setNewPasswordConfirm,
    setPasswordError,
    handleOpenPasswordModal,
    handleClosePasswordModal,
    handleSaveNewPassword,
  };
}
