import { useState, useCallback } from "react";
import axios from "axios";
import apiMiddleware from "@/api/middleware";
import { useAuthStore } from "@/features/auth/store/useAuthStore";

interface UseWithdrawModalOptions {
  isLoggedIn: boolean;
  isSocialUser: boolean;
  userId: string;
}

const normalizeIdentity = (value?: string | null): string =>
  (value || "").trim().toLowerCase();

function getStorageKey(userId?: string): string {
  const cleanId = normalizeIdentity(userId);
  return cleanId ? `myPageSettings_${cleanId}` : "myPageSettings_guest";
}

export function useWithdrawModal({
  isLoggedIn,
  isSocialUser,
  userId,
}: UseWithdrawModalOptions) {
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawPassword, setWithdrawPassword] = useState("");
  const [withdrawError, setWithdrawError] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const handleCloseWithdrawModal = useCallback(() => {
    setIsWithdrawModalOpen(false);
    setWithdrawPassword("");
    setWithdrawError("");
  }, []);

  const executeWithdrawal = useCallback(
    async (password?: string) => {
      setIsWithdrawing(true);
      setWithdrawError("");
      try {
        await apiMiddleware.delete("/api/members/me", {
          data: { password: password ?? "" },
        });

        // 로컬 스토리지 및 세션 초기화
        const userKey = getStorageKey(userId);
        localStorage.removeItem(userKey);
        useAuthStore.getState().clearSession();
        alert("회원 탈퇴가 완료되었습니다. 그동안 서비스를 이용해 주셔서 감사합니다.");
        window.location.href = "/";
      } catch (error: unknown) {
        console.error("회원 탈퇴 실패:", error);
        const serverMessage =
          axios.isAxiosError(error) &&
          (error.response?.data?.message || error.response?.data?.error);
        const errorMsg =
          serverMessage ||
          "비밀번호가 일치하지 않거나 회원 탈퇴 처리에 실패했습니다.";
        setWithdrawError(errorMsg);

        if (isSocialUser) {
          alert(
            "현재 소셜 로그인 회원 탈퇴는 지원되지 않습니다.\n기능 준비 후 다시 시도해 주세요.",
          );
        }
      } finally {
        setIsWithdrawing(false);
      }
    },
    [isSocialUser, userId],
  );

  const handleClickWithdraw = useCallback(() => {
    if (!isLoggedIn) {
      alert("로그인 후 이용 가능합니다.");
      return;
    }

    if (isSocialUser) {
      // 소셜 로그인은 2차 컨펌 팝업
      if (
        window.confirm(
          "정말로 회원 탈퇴를 진행하시겠습니까?\n탈퇴 후에도 작성한 게시글과 댓글은 유지됩니다.",
        )
      ) {
        executeWithdrawal();
      }
    } else {
      // 일반 회원은 비밀번호 검증 모달 오픈
      setWithdrawPassword("");
      setWithdrawError("");
      setIsWithdrawModalOpen(true);
    }
  }, [executeWithdrawal, isLoggedIn, isSocialUser]);

  const handleConfirmWithdrawWithPassword = useCallback(async () => {
    const pwd = withdrawPassword.trim();
    if (!pwd) {
      setWithdrawError("비밀번호를 입력해 주세요.");
      return;
    }
    if (pwd.length < 4) {
      setWithdrawError("비밀번호를 올바르게 입력해 주세요.");
      return;
    }
    await executeWithdrawal(pwd);
  }, [executeWithdrawal, withdrawPassword]);

  return {
    isWithdrawModalOpen,
    withdrawPassword,
    withdrawError,
    isWithdrawing,
    setWithdrawPassword,
    setWithdrawError,
    handleClickWithdraw,
    handleCloseWithdrawModal,
    handleConfirmWithdrawWithPassword,
  };
}
