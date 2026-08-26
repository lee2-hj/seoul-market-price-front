import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { isLogin } from "@/features/auth/utils/auth";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { CheckCircle2 } from "lucide-react";
import PassAuth from "@/features/auth/components/PassAuth";
import {
  deleteMyPreferredRegionApi,
  updateMemberMeApi,
  type MemberUpdateRequest,
} from "@/api/api";
import apiMiddleware from "@/api/middleware";
import { getSggs } from "@/features/location/services/locationService";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { REGION_STORAGE_KEY } from "@/features/region-map/utils/regionSelection";

/**
 * 로그인 방식
 */
type LoginType = "LOCAL" | "SOCIAL";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  );
}

function KakaoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#FEE500" />
      <path
        fill="#191919"
        d="M16 7c-5.523 0-10 3.582-10 8 0 2.864 1.896 5.378 4.757 6.753l-1.213 4.453c-.114.418.35.748.706.505l5.35-3.56c.131.01.264.016.4.016 5.523 0 10-3.582 10-8s-4.477-8-10-8z"
      />
    </svg>
  );
}

const sanitizePlainText = (val?: string | null): string => {
  if (!val || typeof val !== "string") return "";
  const trimmed = val.trim();
  if (trimmed.startsWith("enc:v1:")) return "";
  return trimmed;
};

/**
 * 휴대폰 번호 정규식 자동 포맷터 (01012345678 -> 010-1234-5678)
 */
const formatPhoneNumber = (value: string): string => {
  if (!value) return "";
  const raw = value.replace(/[^0-9]/g, "");
  if (raw.length <= 3) return raw;
  if (raw.length <= 7) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
  if (raw.length <= 10) {
    return `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}`;
  }
  return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`;
};

/**
 * 기본 주소 입력값 정제 (특수문자나 주소에 불필요한 기호 입력 방지)
 * 한글, 영문, 숫자, 공백, 하이픈(-), 쉼표(,), 괄호(()), 마침표(.)만 허용
 */
const sanitizeAddress = (value: string): string => {
  if (!value) return "";
  return value.replace(/[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9\s\-(),.]/g, "");
};

type Profile = {
  loginType: LoginType;
  name: string;
  userId: string;
  phone: string;
  email: string;
  address: string;
  detailAddress: string;
};

type MyPageSettings = {
  profile: Partial<Profile>;
  preferredDistrict: string;
  selectedSggCd?: string | null;
  favoriteItems?: string[];
  notificationSettings?: Record<string, boolean>;
  priceAlerts?: unknown[];
};

interface MyMemberResponse {
  memberId: number;
  userId: string;
  name: string;
  zipcode: string | null;
  address: string | null;
  addressDetail: string | null;
  phone: string | null;
  email: string | null;
  socialId: string | null;
  userType: string;
  preferredDistrict: string;
  myGu: string | null;
  myGuCode: string | null;
  myDong: string | null;
}

type ProfileDraft = {
  email: string;
  address: string;
  detailAddress: string;
  preferredDistrict: string;
  selectedSggCd?: string | null;
  selectedSggName?: string;
};

type MemberUpdateVariables = {
  formData: Profile;
  selectedSggCd: string | null;
  shouldPatchMember: boolean;
  shouldClearPreferredRegion: boolean;
};

class PreferredRegionDeleteError extends Error {
  constructor() {
    super("선호지역 삭제에 실패했습니다.");
    this.name = "PreferredRegionDeleteError";
  }
}

const normalizeIdentity = (value?: string | null): string =>
  (value || "").trim().toLowerCase();

function getStoredSocialProvider(): string {
  return (
    sessionStorage.getItem("social_provider") ||
    localStorage.getItem("social_provider") ||
    ""
  );
}

function getSocialProviderName(userId: string, loginType: LoginType): string {
  const storedProvider = normalizeIdentity(getStoredSocialProvider());
  if (storedProvider.includes("kakao")) return "카카오";
  if (storedProvider.includes("naver")) return "네이버";
  if (storedProvider.includes("google")) return "구글";

  const normalizedId = normalizeIdentity(userId);
  if (normalizedId.includes("kakao")) return "카카오";
  if (normalizedId.includes("naver")) return "네이버";
  if (normalizedId.includes("google")) return "구글";
  if (loginType === "SOCIAL" || userId.startsWith("enc:v1:")) return "구글";
  return "";
}

function isSocialAccount(userId: string, loginType: LoginType): boolean {
  return Boolean(getSocialProviderName(userId, loginType));
}

const DEFAULT_PROFILE: Profile = {
  loginType: "LOCAL",
  name: "",
  userId: "",
  phone: "",
  email: "",
  address: "",
  detailAddress: "",
};

function getStorageKey(userId?: string): string {
  const cleanId = normalizeIdentity(userId);
  return cleanId ? `myPageSettings_${cleanId}` : "myPageSettings_guest";
}

function getStoredMyPageSettings(userId?: string): MyPageSettings | null {
  const key = getStorageKey(userId);
  const saved = localStorage.getItem(key);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as MyPageSettings;
  } catch {
    return null;
  }
}

function getLocalProfileSettings(profile: Profile): Partial<Profile> {
  return {
    loginType: profile.loginType,
    name: profile.name,
    userId: profile.userId,
    phone: profile.phone,
  };
}

function getProfileDraftKey(userId: string): string {
  return `mypage_draft_${normalizeIdentity(userId)}`;
}

function isProfileDraft(value: unknown): value is ProfileDraft {
  if (typeof value !== "object" || value === null) return false;

  return (
    "email" in value &&
    typeof value.email === "string" &&
    "address" in value &&
    typeof value.address === "string" &&
    "detailAddress" in value &&
    typeof value.detailAddress === "string" &&
    "preferredDistrict" in value &&
    typeof value.preferredDistrict === "string"
  );
}

function getStoredProfileDraft(userId: string): ProfileDraft | null {
  const key = getProfileDraftKey(userId);
  const saved = sessionStorage.getItem(key);
  if (!saved) return null;

  try {
    const parsed: unknown = JSON.parse(saved);
    if (isProfileDraft(parsed)) return parsed;
  } catch {
    // 파싱에 실패해도 저장된 초안은 임의로 삭제하지 않는다.
  }

  return null;
}

function removeStoredProfileDraft(userId?: string): void {
  const normalizedUserId = normalizeIdentity(userId);
  if (!normalizedUserId) return;
  sessionStorage.removeItem(getProfileDraftKey(normalizedUserId));
}

async function getMyMember() {
  const { data } = await apiMiddleware.get<MyMemberResponse>("/api/members/me", {
    params: { _t: Date.now() },
  });
  return data;
}

export default function MyProfilePage() {
  const queryClient = useQueryClient();
  const isLoggedIn = isLogin();
  const authUser = useAuthStore((state) => state.user);
  const { data: memberData } = useQuery({
    queryKey: ["member", "me"],
    queryFn: getMyMember,
    enabled: isLoggedIn,
    staleTime: 1000 * 60 * 5,
  });

  const { data: sggs = [], isLoading: isSggsLoading } = useQuery({
    queryKey: ["location", "sggs"],
    queryFn: getSggs,
    staleTime: Infinity,
  });

  // 초기 프로필 로드
  const [profile, setProfile] = useState<Profile>(() => {
    const saved = getStoredMyPageSettings(authUser?.userId);
    if (authUser) {
      const isSocial = isSocialAccount(authUser.userId || "", "LOCAL");
      const savedProfile: Partial<Profile> = saved?.profile || {};
      const resolvedName = sanitizePlainText(authUser.name) || sanitizePlainText(savedProfile.name);
      const resolvedUserId = sanitizePlainText(authUser.userId) || sanitizePlainText(savedProfile.userId);

      return {
        ...DEFAULT_PROFILE,
        ...savedProfile,
        phone: formatPhoneNumber(savedProfile.phone || DEFAULT_PROFILE.phone),
        loginType: isSocial ? "SOCIAL" : "LOCAL",
        name: resolvedName,
        userId: resolvedUserId,
      };
    }
    if (saved?.profile) {
      return {
        ...DEFAULT_PROFILE,
        ...saved.profile,
        phone: formatPhoneNumber(saved.profile.phone || DEFAULT_PROFILE.phone),
        name: sanitizePlainText(saved.profile.name),
        userId: sanitizePlainText(saved.profile.userId),
      };
    }
    return DEFAULT_PROFILE;
  });

  const [preferredDistrict, setPreferredDistrict] = useState(() => {
    const saved = getStoredMyPageSettings(authUser?.userId);
    return authUser?.myGu || saved?.preferredDistrict || "";
  });
  const [selectedSggCd, setSelectedSggCd] = useState<string | null>(
    authUser?.myGuCode ?? null,
  );
  const [preferredDistrictError, setPreferredDistrictError] = useState("");
  // 원본 스냅샷 (변경 취소 시 복구할 기준 데이터)
  const [originalProfile, setOriginalProfile] = useState<Profile>(profile);
  const [originalDistrict, setOriginalDistrict] = useState<string>(preferredDistrict);
  const [originalSggCd, setOriginalSggCd] = useState<string | null>(
    selectedSggCd,
  );
  const initializedDraftUserRef = useRef<string | null>(null);

  // 인증 관련 State
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [identityVerificationId, setIdentityVerificationId] = useState("");

  // 비밀번호 변경 모달 State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // 회원 탈퇴 모달 State (일반 회원 비밀번호 확인용)
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawPassword, setWithdrawPassword] = useState("");
  const [withdrawError, setWithdrawError] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const handleOpenPasswordModal = () => {
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
  };

  const handleSaveNewPassword = async () => {
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
      alert("비밀번호가 성공적으로 변경되었습니다. 다음 로그인부터 새 비밀번호를 사용해 주세요.");
      setIsPasswordModalOpen(false);
      setNewPassword("");
      setNewPasswordConfirm("");
      setPasswordError("");
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message
        : null;
      setPasswordError(message || "비밀번호 변경에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  // 실제 탈퇴 처리 로직 (백엔드 DELETE /api/members/me 연동)
  const executeWithdrawal = async (password?: string) => {
    setIsWithdrawing(true);
    setWithdrawError("");
    try {
      await apiMiddleware.delete("/api/members/me", {
        data: { password: password ?? "" },
      });

      // 로컬 스토리지 및 세션 초기화
      const userKey = getStorageKey(authUser?.userId || profile.userId);
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
        serverMessage || "비밀번호가 일치하지 않거나 회원 탈퇴 처리에 실패했습니다.";
      setWithdrawError(errorMsg);

      if (isSocialUser) {
        alert(
          "현재 소셜 로그인 회원 탈퇴는 지원되지 않습니다.\n기능 준비 후 다시 시도해 주세요.",
        );
      }
    } finally {
      setIsWithdrawing(false);
    }
  };

  // 회원 탈퇴 버튼 클릭 분기 (일반 vs 소셜)
  const handleClickWithdraw = () => {
    if (!isLoggedIn) {
      alert("로그인 후 이용 가능합니다.");
      return;
    }

    if (isSocialUser) {
      // 소셜 로그인은 2차 컨펌 팝업
      if (window.confirm("정말로 회원 탈퇴를 진행하시겠습니까?\n탈퇴 후에도 작성한 게시글과 댓글은 유지됩니다.")) {
        executeWithdrawal();
      }
    } else {
      // 일반 회원은 비밀번호 검증 모달 오픈
      setWithdrawPassword("");
      setWithdrawError("");
      setIsWithdrawModalOpen(true);
    }
  };

  // 일반 회원 비밀번호 입력 후 최종 탈퇴 확인
  const handleConfirmWithdrawWithPassword = async () => {
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
  };

  const { register, handleSubmit, setValue, reset, control } = useForm<Profile>({
    defaultValues: profile,
  });

  const formValues = useWatch({ control });

  // 선호지역 옵션 목록 ('선호지역 없음' 옵션 포함)
  const districtOptions = useMemo(() => {
    return ["선택 안 함", ...sggs.map((sgg) => sgg.sggNm)];
  }, [sggs]);

  // 소셜 로그인 감지 및 공급자명 판별
  const rawUserId = authUser?.userId || profile.userId || "";
  const socialProvider = getSocialProviderName(rawUserId, profile.loginType);
  const isSocialUser = isSocialAccount(rawUserId, profile.loginType);
  const authUserId = authUser?.userId;
  const authUserName = authUser?.name;

  // authUser 변경 시 해당 사용자 고유의 프로필 및 설정 동기화
  useEffect(() => {
    if (authUserId) {
      let isActive = true;
      const isSocial = memberData
        ? Boolean(memberData.socialId) ||
          isSocialAccount(memberData.userId, "LOCAL")
        : isSocialAccount(authUserId, "LOCAL");

      const saved = getStoredMyPageSettings(authUserId);
      const resolvedName =
        sanitizePlainText(authUserName) ||
        sanitizePlainText(memberData?.name) ||
        sanitizePlainText(saved?.profile?.name);
      const resolvedUserId = memberData
        ? sanitizePlainText(memberData.userId)
        : sanitizePlainText(authUserId) ||
          sanitizePlainText(saved?.profile?.userId);

      const nextProfile: Profile = {
        ...DEFAULT_PROFILE,
        ...(memberData
          ? {
              phone: formatPhoneNumber(memberData.phone ?? ""),
              email: memberData.email ?? "",
              address: memberData.address ?? "",
              detailAddress: memberData.addressDetail ?? "",
            }
          : saved?.profile || {}),
        name: resolvedName,
        userId: resolvedUserId,
        loginType: isSocial ? "SOCIAL" : "LOCAL",
      };

      const nextDistrict = memberData
        ? memberData.myGu ?? ""
        : authUser?.myGu || saved?.preferredDistrict || "";
      const nextSggCd = memberData
        ? memberData.myGuCode
        : authUser?.myGuCode ?? saved?.selectedSggCd ?? null;

      queueMicrotask(() => {
        if (!isActive) return;
        const latestDraft = getStoredProfileDraft(authUserId);
        const displayedProfile: Profile = latestDraft
          ? {
              ...nextProfile,
              email: latestDraft.email,
              address: latestDraft.address,
              detailAddress: latestDraft.detailAddress,
            }
          : nextProfile;

        setProfile(nextProfile);
        setOriginalProfile(nextProfile);
        reset(displayedProfile);
        const draftDistrict =
          latestDraft?.selectedSggName ?? latestDraft?.preferredDistrict;
        const hasDraftSggCd = Boolean(
          latestDraft && Object.prototype.hasOwnProperty.call(latestDraft, "selectedSggCd"),
        );
        const draftSggCd = hasDraftSggCd
          ? latestDraft?.selectedSggCd ?? null
          : draftDistrict && draftDistrict !== nextDistrict
            ? null
            : nextSggCd;

        setPreferredDistrict(draftDistrict ?? nextDistrict);
        setSelectedSggCd(draftSggCd);
        setOriginalDistrict(nextDistrict);
        setOriginalSggCd(nextSggCd);
        setPreferredDistrictError("");
        initializedDraftUserRef.current = normalizeIdentity(authUserId);
      });

      return () => {
        isActive = false;
      };
    }
  }, [
    authUser?.myGu,
    authUser?.myGuCode,
    authUserId,
    authUserName,
    memberData,
    reset,
  ]);

  useEffect(() => {
    const userId = normalizeIdentity(authUser?.userId);
    if (!userId || initializedDraftUserRef.current !== userId) return;

    const draft: ProfileDraft = {
      email: formValues.email ?? "",
      address: formValues.address ?? "",
      detailAddress: formValues.detailAddress ?? "",
      preferredDistrict,
      selectedSggCd,
      selectedSggName: preferredDistrict,
    };
    sessionStorage.setItem(getProfileDraftKey(userId), JSON.stringify(draft));
  }, [
    authUser?.userId,
    formValues.email,
    formValues.address,
    formValues.detailAddress,
    preferredDistrict,
    selectedSggCd,
  ]);

  const updateMemberMutation = useMutation({
    mutationFn: async ({
      formData,
      selectedSggCd,
      shouldPatchMember,
      shouldClearPreferredRegion,
    }: MemberUpdateVariables) => {
      const isPhoneChanged = formData.phone !== originalProfile.phone;
      if (shouldPatchMember) {
        const request: MemberUpdateRequest = {
          ...(isPhoneChanged
            ? { phone: formData.phone, identityVerificationId }
            : {}),
          email: formData.email,
          address: formData.address,
          addressDetail: formData.detailAddress,
          ...(selectedSggCd ? { sgg_cd: selectedSggCd } : {}),
        };
        await updateMemberMeApi(request);
      }

      if (shouldClearPreferredRegion) {
        try {
          await deleteMyPreferredRegionApi();
        } catch {
          throw new PreferredRegionDeleteError();
        }
      }

      return getMyMember();
    },
    onSuccess: (response, variables) => {
      const updatedProfile: Profile = {
        ...variables.formData,
        name: sanitizePlainText(response.name),
        userId: sanitizePlainText(response.userId),
        phone: formatPhoneNumber(variables.formData.phone),
        email: variables.formData.email,
        address: variables.formData.address,
        detailAddress: variables.formData.detailAddress,
        loginType: isSocialAccount(response.userId, variables.formData.loginType)
          ? "SOCIAL"
          : "LOCAL",
      };
      const previousSettings = getStoredMyPageSettings(response.userId);
      const settingsToSave: MyPageSettings & { preferredDong?: unknown } = {
        ...previousSettings,
        profile: getLocalProfileSettings(updatedProfile),
        preferredDistrict: response.myGu ?? "",
        selectedSggCd: response.myGuCode ?? null,
      };
      delete settingsToSave.preferredDong;

      queryClient.setQueryData(["member", "me"], response);
      localStorage.setItem(
        getStorageKey(response.userId),
        JSON.stringify(settingsToSave),
      );
      reset(updatedProfile);
      setProfile(updatedProfile);
      setOriginalProfile(updatedProfile);
      setPreferredDistrict(response.myGu ?? "");
      setSelectedSggCd(response.myGuCode ?? null);
      setOriginalDistrict(response.myGu ?? "");
      setOriginalSggCd(response.myGuCode ?? null);
      setPreferredDistrictError("");

      if (authUser) {
        useAuthStore.getState().setUser({
          ...authUser,
          userId: response.userId,
          name: response.name,
          myGu: response.myGu ?? null,
          myGuCode: response.myGuCode ?? null,
          preferredDistrict: response.preferredDistrict || undefined,
          myDong: response.myDong ?? null,
        });
      }

      if (!response.myGu) {
        sessionStorage.removeItem(REGION_STORAGE_KEY);
      }

      removeStoredProfileDraft(response.userId);
      setPhoneVerified(false);
      setIdentityVerificationId("");
      alert("회원 정보 및 설정이 성공적으로 저장되었습니다!");
    },
    onError: (error: unknown) => {
      if (error instanceof PreferredRegionDeleteError) {
        alert(
          "회원정보는 저장되었을 수 있지만 선호지역 삭제에 실패했습니다. 입력값은 유지되므로 다시 저장해 주세요.",
        );
        return;
      }
      const serverMessage =
        axios.isAxiosError(error) &&
        (error.response?.data?.message || error.response?.data?.error);
      alert(serverMessage || "회원 정보 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    },
  });

  // 폼이 수정되었는지 여부 계산 (Dirty check)
  const isFormDirty = useMemo(() => {
    const isProfileChanged =
      (formValues.name ?? "") !== (originalProfile.name ?? "") ||
      (formValues.phone ?? "") !== (originalProfile.phone ?? "") ||
      (formValues.email ?? "") !== (originalProfile.email ?? "") ||
      (formValues.address ?? "") !== (originalProfile.address ?? "") ||
      (formValues.detailAddress ?? "") !== (originalProfile.detailAddress ?? "");

    const isDistrictChanged =
      preferredDistrict !== originalDistrict || selectedSggCd !== originalSggCd;
    return isProfileChanged || isDistrictChanged;
  }, [
    formValues.name,
    formValues.phone,
    formValues.email,
    formValues.address,
    formValues.detailAddress,
    originalProfile,
    preferredDistrict,
    originalDistrict,
    selectedSggCd,
    originalSggCd,
  ]);

  // [변경 취소] 버튼 클릭 핸들러
  const handleCancelChanges = () => {
    removeStoredProfileDraft(authUser?.userId);
    reset(originalProfile);
    setProfile(originalProfile);
    setPreferredDistrict(originalDistrict);
    setSelectedSggCd(originalSggCd);
    setPreferredDistrictError("");
    setPhoneVerified(false);
    setIdentityVerificationId("");
  };

  // 회원 정보 및 설정 일괄 저장 핸들러 (수동 저장)
  const handleSaveAll = (formData: Profile) => {
    if (!isLoggedIn) {
      alert("로그인 후 회원 정보 및 설정을 저장하실 수 있습니다.");
      return;
    }
    const isPhoneChanged = formData.phone !== originalProfile.phone;
    if (isPhoneChanged && (!phoneVerified || !identityVerificationId)) {
      alert("전화번호 변경을 위해 본인인증을 완료해 주세요.");
      return;
    }
    if (updateMemberMutation.isPending) return;

    const isProfileChanged =
      (formData.name ?? "") !== (originalProfile.name ?? "") ||
      (formData.phone ?? "") !== (originalProfile.phone ?? "") ||
      (formData.email ?? "") !== (originalProfile.email ?? "") ||
      (formData.address ?? "") !== (originalProfile.address ?? "") ||
      (formData.detailAddress ?? "") !== (originalProfile.detailAddress ?? "");
    const isDistrictChanged =
      preferredDistrict !== originalDistrict || selectedSggCd !== originalSggCd;

    if (preferredDistrict && !selectedSggCd) {
      setPreferredDistrictError("목록에서 자치구를 다시 선택해 주세요.");
      return;
    }

    const shouldClearPreferredRegion =
      isDistrictChanged && !preferredDistrict && selectedSggCd === null;
    const shouldPatchMember =
      isProfileChanged || (isDistrictChanged && selectedSggCd !== null);

    if (!shouldPatchMember && !shouldClearPreferredRegion) return;

    updateMemberMutation.mutate({
      formData: { ...profile, ...formData },
      selectedSggCd,
      shouldPatchMember,
      shouldClearPreferredRegion,
    });
  };

  const handlePreferredDistrictChange = (value: string) => {
    if (!value || value === "선택 안 함") {
      setPreferredDistrict("");
      setSelectedSggCd(null);
      setPreferredDistrictError("");
      return;
    }

    const selectedSgg = sggs.find((sgg) => sgg.sggNm === value);
    setPreferredDistrict(value);

    if (!selectedSgg) {
      setSelectedSggCd(null);
      setPreferredDistrictError("목록에 있는 자치구를 선택해 주세요.");
      return;
    }

    setSelectedSggCd(selectedSgg.sggCd);
    setPreferredDistrictError("");
  };

  // 본인인증 성공 핸들러
  const handlePassSuccess = (result: {
    identityVerificationId: string;
    name: string;
    phoneNumber: string;
  }) => {
    const formatted = formatPhoneNumber(result.phoneNumber);

    setValue("phone", formatted);
    const verifiedName = sanitizePlainText(result.name);
    if (verifiedName) {
      setValue("name", verifiedName);
      if (authUser) {
        useAuthStore.getState().setUser({
          ...authUser,
          name: verifiedName,
        });
      }
    }
    setPhoneVerified(true);
    setIdentityVerificationId(result.identityVerificationId);
  };


  return (
    <div>
      <div className="rounded-[12px] border border-[#DCE8ED] bg-white p-8 shadow-xs md:p-10">
        <form onSubmit={handleSubmit(handleSaveAll)} className="space-y-12">
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
                    {/* ROW 1: 로그인 방식에 따른 분기 */}
                    {isSocialUser ? (
                      <div className="w-full bg-[#F0F7FA] border border-[#DCE8ED] rounded-[12px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 box-border shadow-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {socialProvider === "카카오" ? (
                              <KakaoIcon className="w-5 h-5 shrink-0 rounded-[4px]" />
                            ) : (
                              <GoogleIcon className="w-5 h-5 shrink-0" />
                            )}
                            <strong className="text-[15px] font-black text-[#123047]">
                              {socialProvider || "소셜"} 연동 계정으로 로그인 중입니다
                            </strong>
                          </div>

                          <p className="text-[12px] text-[#6B7280]">
                            소셜 연동 계정은 아이디 및 비밀번호 수정이 제공되지 않습니다.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col md:flex-row gap-4 w-full">
                        <div className="space-y-1.5 flex-1 w-full md:w-1/2">
                          <label className="text-[14px] font-bold text-[#13202B] block">아이디</label>
                          <input
                            {...register("userId")}
                            readOnly
                            placeholder="아이디 정보가 없습니다"
                            className="w-full h-[48px] rounded-[8px] border border-[#DCE8ED] bg-[#F0F7FA] px-3.5 text-[15px] text-[#6B7280] cursor-not-allowed outline-none box-border m-0 font-medium"
                          />
                        </div>

                        <div className="space-y-1.5 flex-1 w-full md:w-1/2">
                          <div className="flex items-center justify-between">
                            <label className="text-[14px] font-bold text-[#13202B] block">비밀번호 변경</label>
                            {phoneVerified ? (
                              <span className="text-[12px] font-extrabold text-[#0F766E]">
                                ✔ 본인인증 완료 (변경 가능)
                              </span>
                            ) : (
                              <span className="text-[12px] text-[#6B7280]">
                                본인인증 후 변경 가능
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={!isLoggedIn || !phoneVerified}
                            onClick={handleOpenPasswordModal}
                            className={`w-full h-[48px] rounded-[8px] border font-bold text-[14px] transition-all box-border m-0 shadow-xs flex items-center justify-center ${
                              phoneVerified
                                ? "bg-[#0F8AA8] hover:bg-[#0B5E73] text-white border-[#0F8AA8] cursor-pointer"
                                : "bg-[#F0F7FA] text-[#6B7280] border-[#DCE8ED] cursor-not-allowed select-none opacity-85"
                            }`}
                          >
                            비밀번호 변경하기
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ROW 2: 이름 (본인인증 완료 시 자동 반영 및 수정 가능) */}
                    <div className="space-y-1.5 w-full">
                      <div className="flex items-center justify-between">
                        <label className="text-[14px] font-bold text-[#13202B] block">이름</label>
                        {phoneVerified ? (
                          <span className="inline-flex items-center gap-1 text-[12px] font-extrabold text-[#0F766E]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> 실명 인증 완료
                          </span>
                        ) : (
                          <span className="text-[12px] text-[#6B7280]">
                            본인인증 후 수정 가능
                          </span>
                        )}
                      </div>
                      <input
                        {...register("name", {
                          onChange: (e) => {
                            const val = e.target.value.replace(/[^a-zA-Z가-힣ㄱ-ㅎㅏ-ㅣ]/g, "");
                            setValue("name", val);
                          },
                        })}
                        readOnly={!phoneVerified}
                        disabled={!isLoggedIn}
                        placeholder={
                          phoneVerified
                            ? "이름을 입력해주세요 (숫자, 공백 불가)"
                            : "본인인증 시 실명이 자동 입력됩니다"
                        }
                        className={`w-full h-[48px] rounded-[8px] border border-[#DCE8ED] px-3.5 text-[15px] outline-none box-border m-0 transition-colors ${
                          phoneVerified
                            ? "bg-white text-[#13202B] focus:border-[#0F8AA8]"
                            : "bg-[#F0F7FA] text-[#6B7280] cursor-not-allowed"
                        }`}
                      />
                      <p className="text-[12px] text-[#6B7280]">
                        {phoneVerified
                          ? "본인인증이 완료되어 실명이 적용되었습니다."
                          : "회원 실명 보호를 위해 아래 본인인증 완료 시 자동으로 반영 및 수정이 활성화됩니다."}
                      </p>
                    </div>

                    {/* ROW 3: 휴대폰 번호 + 본인인증 버튼 (직접 수정 불가, 본인인증 시 자동 입력) */}
                    <div className="space-y-1.5 w-full">
                      <div className="flex items-center justify-between">
                        <label className="text-[14px] font-bold text-[#13202B] block">휴대폰 번호</label>
                        {phoneVerified && (
                          <span className="inline-flex items-center gap-1 text-[12px] font-extrabold text-[#0F766E]">
                            <CheckCircle2 className="w-4 h-4" /> 본인인증 완료
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          {...register("phone")}
                          readOnly
                          disabled={!isLoggedIn}
                          placeholder="본인인증 시 번호가 자동 입력됩니다"
                          className="flex-1 h-[48px] rounded-[8px] border border-[#DCE8ED] bg-[#F0F7FA] px-3.5 text-[15px] text-[#13202B] outline-none cursor-not-allowed font-medium"
                        />
                        <PassAuth
                          phone={formValues.phone || ""}
                          onSuccess={handlePassSuccess}
                          className="h-[48px] px-5 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white font-bold text-[14px] rounded-[8px] cursor-pointer whitespace-nowrap transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs shrink-0"
                        />
                      </div>
                      <p className="text-[12px] text-[#6B7280]">
                        휴대폰 번호는 직접 입력할 수 없으며, 우측 [인증하기]를 진행하면 실제 인증 번호가 자동 입력됩니다.
                      </p>
                    </div>

                    {/* ROW 4: 이메일 주소 (인증 없이 직접 입력) */}
                    <div className="space-y-1.5 w-full">
                      <label className="text-[14px] font-bold text-[#13202B] block">이메일 주소</label>
                      <input
                        {...register("email")}
                        type="email"
                        disabled={!isLoggedIn}
                        placeholder="이메일 주소를 입력해 주세요 (예: user@example.com)"
                        className="w-full h-[48px] rounded-[8px] border border-[#DCE8ED] bg-white px-3.5 text-[15px] text-[#13202B] outline-none focus:border-[#0F8AA8] disabled:bg-[#F0F7FA]"
                      />
                    </div>

                    {/* ROW 5: 기본 주소 & 상세 주소 (특수문자 및 불필요한 기호 필터링 적용) */}
                    <div className="flex flex-col md:flex-row gap-4 w-full">
                      <div className="space-y-1.5 flex-1 w-full md:w-1/2">
                        <label className="text-[14px] font-bold text-[#13202B] block">기본 주소</label>
                        <input
                          {...register("address", {
                            onChange: (e) => {
                              const cleaned = sanitizeAddress(e.target.value);
                              setValue("address", cleaned, { shouldDirty: true });
                            },
                          })}
                          disabled={!isLoggedIn}
                          placeholder="기본 주소를 입력해 주세요 (특수문자 제외)"
                          className="w-full h-[48px] rounded-[8px] border border-[#DCE8ED] bg-white px-3.5 text-[15px] text-[#13202B] outline-none focus:border-[#0F8AA8] box-border m-0 disabled:bg-[#F0F7FA]"
                        />
                      </div>

                      <div className="space-y-1.5 flex-1 w-full md:w-1/2">
                        <label className="text-[14px] font-bold text-[#13202B] block">상세 주소</label>
                        <input
                          {...register("detailAddress", {
                            onChange: (e) => {
                              const cleaned = sanitizeAddress(e.target.value);
                              setValue("detailAddress", cleaned, { shouldDirty: true });
                            },
                          })}
                          disabled={!isLoggedIn}
                          placeholder="상세 주소(동, 호수 등)를 입력해 주세요"
                          className="w-full h-[48px] rounded-[8px] border border-[#DCE8ED] bg-white px-3.5 text-[15px] text-[#13202B] outline-none focus:border-[#0F8AA8] box-border m-0 disabled:bg-[#F0F7FA]"
                        />
                      </div>
                    </div>

                    {/* ROW 6: 선호 자치구 설정 */}
                    <div className="space-y-1.5 w-full">
                      <label className="text-[14px] font-bold text-[#13202B] block">선호 자치구 설정</label>
                      <div>
                        <AutocompleteInput
                          value={preferredDistrict}
                          options={districtOptions}
                          disabled={!isLoggedIn || isSggsLoading}
                          onChange={handlePreferredDistrictChange}
                          onInvalidBlur={() => {
                            setPreferredDistrict(originalDistrict);
                            setSelectedSggCd(originalSggCd);
                            setPreferredDistrictError("");
                          }}
                          placeholder="자치구를 선택하거나 입력해 주세요"
                          className={!preferredDistrict ? "text-[#64748B]" : "text-[#13202B]"}
                        />
                      </div>
                      {preferredDistrictError && (
                        <p className="text-[12px] text-[#C2410C]" role="alert">
                          {preferredDistrictError}
                        </p>
                      )}
                      <p className="text-[12px] text-[#6B7280]">
                        선호 자치구는 선택하지 않아도 되며, 선택한 자치구를 기준으로 관심 지역을 표시합니다.
                      </p>
                    </div>
                  </div>
                </div>

                {/* ========================================================
                    [회원 정보 및 설정 저장] & [변경 취소] 버튼 영역
                ======================================================== */}
                <div className="pt-8 border-t border-[#DCE8ED] text-center">
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {isFormDirty && (
                      <button
                        type="button"
                        onClick={handleCancelChanges}
                        className="h-[52px] px-8 bg-white hover:bg-[#F0F7FA] text-[#6B7280] border border-[#DCE8ED] text-[15px] font-bold rounded-[8px] cursor-pointer transition-all shadow-xs"
                      >
                        변경 취소
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={!isLoggedIn || updateMemberMutation.isPending}
                      className="h-[52px] px-10 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[16px] font-bold rounded-[8px] border-none outline-none cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                    >
                      {updateMemberMutation.isPending ? "저장 중..." : "회원 정보 저장"}
                    </button>
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
                  <button
                    type="button"
                    disabled={!isLoggedIn}
                    onClick={handleClickWithdraw}
                    className="h-[44px] px-5 border border-[#d96666] bg-white text-[#c54e4e] hover:bg-[#fff0f0] font-bold text-[14px] rounded-[8px] cursor-pointer whitespace-nowrap transition-colors disabled:opacity-50"
                  >
                    회원 탈퇴
                  </button>
                </div>
        </form>
      </div>

      {/* 비밀번호 변경 팝업 모달 (PASS 인증 완료 시 활성화) */}
      {isPasswordModalOpen && (
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
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordError("");
                  }}
                  className="w-full h-[46px] rounded-[8px] border border-[#DCE8ED] bg-white px-3.5 text-[15px] text-[#13202B] outline-none focus:border-[#0F8AA8]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-[#13202B] block">새 비밀번호 확인</label>
                <input
                  type="password"
                  placeholder="새 비밀번호를 한 번 더 입력하세요"
                  value={newPasswordConfirm}
                  onChange={(e) => {
                    setNewPasswordConfirm(e.target.value);
                    setPasswordError("");
                  }}
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
                onClick={() => setIsPasswordModalOpen(false)}
                className="flex-1 h-[46px] bg-white hover:bg-[#F0F7FA] text-[#6B7280] border border-[#DCE8ED] font-bold text-[14px] rounded-[8px] cursor-pointer transition-colors"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={handleSaveNewPassword}
                className="flex-1 h-[46px] bg-[#0F8AA8] hover:bg-[#0B5E73] text-white font-bold text-[14px] rounded-[8px] cursor-pointer transition-colors shadow-xs"
              >
                변경 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 일반 회원 탈퇴 비밀번호 확인 모달 */}
      {isWithdrawModalOpen && (
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
                  onChange={(e) => {
                    setWithdrawPassword(e.target.value);
                    setWithdrawError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleConfirmWithdrawWithPassword();
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
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="h-[42px] px-5 rounded-[8px] border border-[#DCE8ED] bg-white text-[14px] font-bold text-[#6B7280] hover:bg-[#F0F7FA] cursor-pointer transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={isWithdrawing}
                  onClick={handleConfirmWithdrawWithPassword}
                  className="h-[42px] px-6 rounded-[8px] bg-rose-600 hover:bg-rose-700 text-[14px] font-bold text-white border-none cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                >
                  {isWithdrawing ? "탈퇴 처리 중..." : "탈퇴 확인"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
