import { useState, useCallback } from "react";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import type { UseFormSetValue } from "react-hook-form";

const formatPhone = (value: string): string => {
  if (!value) return "";
  const raw = value.replace(/[^0-9]/g, "");
  if (raw.length <= 3) return raw;
  if (raw.length <= 7) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
  if (raw.length <= 10) {
    return `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}`;
  }
  return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`;
};

const sanitizeText = (val?: string | null): string => {
  if (!val || typeof val !== "string") return "";
  const trimmed = val.trim();
  if (trimmed.startsWith("enc:v1:")) return "";
  return trimmed;
};

interface UsePassAuthOptions<T extends { phone?: string; name?: string }> {
  setValue: UseFormSetValue<T>;
}

export function usePassAuth<T extends { phone?: string; name?: string }>({
  setValue,
}: UsePassAuthOptions<T>) {
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [identityVerificationId, setIdentityVerificationId] = useState("");

  const handlePassSuccess = useCallback(
    (result: {
      identityVerificationId: string;
      name: string;
      phoneNumber: string;
    }) => {
      const formatted = formatPhone(result.phoneNumber);
      // @ts-expect-error dynamic property assignment on form
      setValue("phone", formatted);

      const verifiedName = sanitizeText(result.name);
      if (verifiedName) {
        // @ts-expect-error dynamic property assignment on form
        setValue("name", verifiedName);
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          useAuthStore.getState().setUser({
            ...currentUser,
            name: verifiedName,
          });
        }
      }
      setPhoneVerified(true);
      setIdentityVerificationId(result.identityVerificationId);
    },
    [setValue],
  );

  const resetPassAuth = useCallback(() => {
    setPhoneVerified(false);
    setIdentityVerificationId("");
  }, []);

  return {
    phoneVerified,
    identityVerificationId,
    setPhoneVerified,
    setIdentityVerificationId,
    handlePassSuccess,
    resetPassAuth,
  };
}
