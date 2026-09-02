import { useState, useCallback } from "react";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import type { Path, PathValue, UseFormSetValue } from "react-hook-form";

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
      // T가 제네릭이라 RHF의 Path<T>가 리터럴 "phone"으로 좁혀지지 않아 명시적으로 캐스팅한다.
      // T extends { phone?: string; name?: string } 제약으로 값 타입 안전성은 보장된다.
      setValue("phone" as Path<T>, formatted as PathValue<T, Path<T>>);

      const verifiedName = sanitizeText(result.name);
      if (verifiedName) {
        setValue("name" as Path<T>, verifiedName as PathValue<T, Path<T>>);
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
