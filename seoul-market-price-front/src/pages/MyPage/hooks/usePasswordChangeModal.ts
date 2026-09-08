import { useCallback, useState } from "react";
import axios from "axios";
import { updateMemberMeApi } from "@/api/api";

interface UsePasswordChangeModalOptions {
  isLoggedIn: boolean;
  phoneVerified: boolean;
  userId?: string;
}

const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_MAX_LENGTH = 16;

function normalizeIdentity(value?: string | null): string {
  return (value || "").trim().toLowerCase();
}

function getPasswordChangedAtKey(userId: string): string {
  return `pwChangedAt_${normalizeIdentity(userId)}`;
}

function formatChangedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

function readLastChangedLabel(userId?: string): string {
  const normalized = normalizeIdentity(userId);
  if (!normalized) return "";
  const saved = localStorage.getItem(getPasswordChangedAtKey(normalized));
  return saved ? formatChangedAt(saved) : "";
}

export function usePasswordChangeModal({
  isLoggedIn,
  phoneVerified,
  userId,
}: UsePasswordChangeModalOptions) {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastChangedLabel, setLastChangedLabel] = useState(() => readLastChangedLabel(userId));

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
    setCurrentPassword("");
    setNewPassword("");
    setNewPasswordConfirm("");
    setIsPasswordModalOpen(true);
  }, [isLoggedIn, phoneVerified]);

  const handleClosePasswordModal = useCallback(() => {
    setIsPasswordModalOpen(false);
    setPasswordError("");
    setCurrentPassword("");
    setNewPassword("");
    setNewPasswordConfirm("");
  }, []);

  const handleSaveNewPassword = useCallback(async () => {
    if (!currentPassword) {
      setPasswordError("현재 비밀번호를 입력해 주세요.");
      return;
    }
    if (newPassword.length < PASSWORD_MIN_LENGTH || newPassword.length > PASSWORD_MAX_LENGTH) {
      setPasswordError(
        `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상 ${PASSWORD_MAX_LENGTH}자 이하로 입력해 주세요.`,
      );
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setPasswordError("새 비밀번호와 새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    setIsSaving(true);
    try {
      await updateMemberMeApi({ password: newPassword, currentPassword });
      const nowIso = new Date().toISOString();
      if (userId) {
        localStorage.setItem(getPasswordChangedAtKey(userId), nowIso);
        setLastChangedLabel(formatChangedAt(nowIso));
      }
      alert(
        "비밀번호가 성공적으로 변경되었습니다. 다음 로그인부터 새 비밀번호를 사용해 주세요.",
      );
      setIsPasswordModalOpen(false);
      setCurrentPassword("");
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
    } finally {
      setIsSaving(false);
    }
  }, [currentPassword, newPassword, newPasswordConfirm, userId]);

  return {
    isPasswordModalOpen,
    currentPassword,
    newPassword,
    newPasswordConfirm,
    passwordError,
    isSaving,
    lastChangedLabel,
    setCurrentPassword,
    setNewPassword,
    setNewPasswordConfirm,
    handleOpenPasswordModal,
    handleClosePasswordModal,
    handleSaveNewPassword,
  };
}
