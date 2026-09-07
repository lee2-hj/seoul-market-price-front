import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { isLogin } from "@/features/auth/utils/auth";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { CheckCircle2, ChevronRight } from "lucide-react";
import PassAuth from "@/features/auth/components/PassAuth";
import {
  agreeToLocationServiceApi,
  deleteMyPreferredRegionApi,
  updateMemberMeApi,
  type MemberUpdateRequest,
} from "@/api/api";
import apiMiddleware from "@/api/middleware";
import { getSggs, type SggResponse } from "@/features/location/services/locationService";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { REGION_STORAGE_KEY } from "@/features/region-map/utils/regionSelection";
import { usePassAuth } from "./hooks/usePassAuth";
import { usePasswordChangeModal } from "./hooks/usePasswordChangeModal";
import { useWithdrawModal } from "./hooks/useWithdrawModal";
import PasswordChangeModal from "./components/PasswordChangeModal";
import WithdrawModal from "./components/WithdrawModal";

// ============================================================
// Types
// ============================================================

type LoginType = "LOCAL" | "SOCIAL";

type Profile = {
  loginType: LoginType;
  name: string;
  userId: string;
  phone: string;
  email: string;
  address: string;
  detailAddress: string;
};

// 회원 정보 폼: 인적사항(Profile) + 선호 자치구 + 위치 서비스 동의를 하나의
// react-hook-form으로 함께 관리한다. 위치 동의 스위치도 다른 필드와 마찬가지로
// "회원 정보 저장" 버튼을 눌러야만 실제로 반영되도록 폼 상태로 다룬다.
type ProfileForm = Profile & {
  preferredDistrict: string;
  selectedSggCd: string | null;
  isLocationAgreed: boolean;
};

type MyPageSettings = {
  profile: Partial<Profile>;
  preferredDistrict: string;
  selectedSggCd?: string | null;
  favoriteItems?: string[];
  notificationSettings?: Record<string, boolean>;
  priceAlerts?: unknown[];
};

type MyMemberResponse = {
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
};

type ProfileDraft = {
  email: string;
  address: string;
  detailAddress: string;
  preferredDistrict: string;
  selectedSggCd?: string | null;
  selectedSggName?: string;
};

type MemberUpdateVariables = {
  formData: ProfileForm;
  shouldPatchMember: boolean;
  shouldClearPreferredRegion: boolean;
  shouldUpdateLocationConsent: boolean;
};

const DEFAULT_PROFILE_FORM: ProfileForm = {
  loginType: "LOCAL",
  name: "",
  userId: "",
  phone: "",
  email: "",
  address: "",
  detailAddress: "",
  preferredDistrict: "",
  selectedSggCd: null,
  isLocationAgreed: false,
};

// ============================================================
// 순수 헬퍼 함수
// ============================================================

class PreferredRegionDeleteError extends Error {
  constructor() {
    super("선호지역 삭제에 실패했습니다.");
    this.name = "PreferredRegionDeleteError";
  }
}

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

const formatPhoneNumber = (value: string): string => {
  if (!value) return "";
  const raw = value.replace(/[^0-9]/g, "");
  if (raw.length <= 3) return raw;
  if (raw.length <= 7) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
  if (raw.length <= 10) return `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}`;
  return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`;
};

// 이름: 한글/영문만 허용(숫자, 공백 불가)
const sanitizeName = (value: string): string =>
  value.replace(/[^a-zA-Z가-힣ㄱ-ㅎㅏ-ㅣ]/g, "");

// 주소: 한글/영문/숫자/공백/-,().  만 허용
const sanitizeAddress = (value: string): string =>
  value.replace(/[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9\s\-(),.]/g, "");

const normalizeIdentity = (value?: string | null): string =>
  (value || "").trim().toLowerCase();

function getStoredSocialProvider(): string {
  return sessionStorage.getItem("social_provider") || localStorage.getItem("social_provider") || "";
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

function getStorageKey(userId?: string): string {
  const cleanId = normalizeIdentity(userId);
  return cleanId ? `myPageSettings_${cleanId}` : "myPageSettings_guest";
}

function getStoredMyPageSettings(userId?: string): MyPageSettings | null {
  const saved = localStorage.getItem(getStorageKey(userId));
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
    "email" in value && typeof value.email === "string" &&
    "address" in value && typeof value.address === "string" &&
    "detailAddress" in value && typeof value.detailAddress === "string" &&
    "preferredDistrict" in value && typeof value.preferredDistrict === "string"
  );
}

function getStoredProfileDraft(userId: string): ProfileDraft | null {
  const saved = sessionStorage.getItem(getProfileDraftKey(userId));
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

async function getMyMember(): Promise<MyMemberResponse> {
  const { data } = await apiMiddleware.get<MyMemberResponse>("/api/members/me", {
    params: { _t: Date.now() },
  });
  return data;
}

function getInitialProfileForm(authUser: ReturnType<typeof useAuthStore.getState>["user"]): ProfileForm {
  const saved = getStoredMyPageSettings(authUser?.userId);
  const savedProfile: Partial<Profile> = saved?.profile || {};

  if (authUser) {
    const isSocial = isSocialAccount(authUser.userId || "", "LOCAL");
    return {
      ...DEFAULT_PROFILE_FORM,
      ...savedProfile,
      phone: formatPhoneNumber(savedProfile.phone || DEFAULT_PROFILE_FORM.phone),
      loginType: isSocial ? "SOCIAL" : "LOCAL",
      name: sanitizePlainText(authUser.name) || sanitizePlainText(savedProfile.name),
      userId: sanitizePlainText(authUser.userId) || sanitizePlainText(savedProfile.userId),
      preferredDistrict: authUser.myGu || saved?.preferredDistrict || "",
      selectedSggCd: authUser.myGuCode ?? null,
      isLocationAgreed: Boolean(authUser.isLocationAgreed),
    };
  }

  return {
    ...DEFAULT_PROFILE_FORM,
    ...savedProfile,
    phone: formatPhoneNumber(savedProfile.phone || DEFAULT_PROFILE_FORM.phone),
    name: sanitizePlainText(savedProfile.name),
    userId: sanitizePlainText(savedProfile.userId),
    preferredDistrict: saved?.preferredDistrict || "",
    selectedSggCd: saved?.selectedSggCd ?? null,
  };
}

// ============================================================
// 컴포넌트
// ============================================================

export default function MyProfilePage() {
  const queryClient = useQueryClient();
  const isLoggedIn = isLogin();
  const authUser = useAuthStore((state) => state.user);
  const initializedDraftUserRef = useRef<string | null>(null);

  const { data: memberData } = useQuery({
    queryKey: ["member", "me"],
    queryFn: getMyMember,
    enabled: isLoggedIn,
    staleTime: 1000 * 60 * 5,
    select: (data: MyMemberResponse): MyMemberResponse => data,
  });

  const { data: sggs = [], isLoading: isSggsLoading } = useQuery({
    queryKey: ["location", "sggs"],
    queryFn: getSggs,
    staleTime: Infinity,
    select: (data: SggResponse[]): SggResponse[] => data,
  });

  const { register, handleSubmit, setValue, watch, reset, setError, clearErrors, formState } = useForm<ProfileForm>({
    defaultValues: useMemo(() => getInitialProfileForm(authUser), []),
  });
  const { isDirty: isFormDirty, dirtyFields } = formState;

  const preferredDistrict = watch("preferredDistrict");
  const selectedSggCd = watch("selectedSggCd");
  const nameValue = watch("name");
  const phoneValue = watch("phone");
  const emailValue = watch("email");
  const addressValue = watch("address");
  const detailAddressValue = watch("detailAddress");
  const rawUserId = watch("userId") || authUser?.userId || "";
  const loginType = watch("loginType");
  const isLocationAgreedValue = watch("isLocationAgreed");

  // 1. PASS 본인인증 훅
  const { phoneVerified, identityVerificationId, handlePassSuccess, resetPassAuth } =
    usePassAuth<ProfileForm>({ setValue });

  // 2. 비밀번호 변경 모달 훅
  const {
    isPasswordModalOpen,
    currentPassword,
    newPassword,
    newPasswordConfirm,
    passwordError,
    isSaving: isPasswordSaving,
    lastChangedLabel,
    setCurrentPassword,
    setNewPassword,
    setNewPasswordConfirm,
    handleOpenPasswordModal,
    handleClosePasswordModal,
    handleSaveNewPassword,
  } = usePasswordChangeModal({ isLoggedIn, phoneVerified, userId: rawUserId });

  const socialProvider = getSocialProviderName(rawUserId, loginType);
  const isSocialUser = isSocialAccount(rawUserId, loginType);

  // 3. 회원 탈퇴 모달 훅
  const {
    isWithdrawModalOpen,
    withdrawPassword,
    withdrawError,
    isWithdrawing,
    setWithdrawPassword,
    handleClickWithdraw,
    handleCloseWithdrawModal,
    handleConfirmWithdrawWithPassword,
  } = useWithdrawModal({ isLoggedIn, isSocialUser, userId: rawUserId });

  // 선호지역 옵션 목록 ('선호지역 없음' 옵션 포함)
  const districtOptions = useMemo(() => ["선택 안 함", ...sggs.map((sgg) => sgg.sggNm)], [sggs]);

  // authUser 변경 시 해당 사용자 고유의 프로필 및 설정 동기화
  useEffect(() => {
    const authUserId = authUser?.userId;
    if (!authUserId) return;

    let isActive = true;
    const isSocial = memberData
      ? Boolean(memberData.socialId) || isSocialAccount(memberData.userId, "LOCAL")
      : isSocialAccount(authUserId, "LOCAL");

    const saved = getStoredMyPageSettings(authUserId);
    const resolvedName =
      sanitizePlainText(authUser.name) || sanitizePlainText(memberData?.name) || sanitizePlainText(saved?.profile?.name);
    const resolvedUserId = memberData
      ? sanitizePlainText(memberData.userId)
      : sanitizePlainText(authUserId) || sanitizePlainText(saved?.profile?.userId);

    const nextDistrict = memberData ? memberData.myGu ?? "" : authUser?.myGu || saved?.preferredDistrict || "";
    const nextSggCd = memberData ? memberData.myGuCode : authUser?.myGuCode ?? saved?.selectedSggCd ?? null;

    const nextForm: ProfileForm = {
      ...DEFAULT_PROFILE_FORM,
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
      preferredDistrict: nextDistrict,
      selectedSggCd: nextSggCd,
      isLocationAgreed: Boolean(authUser.isLocationAgreed),
    };

    queueMicrotask(() => {
      if (!isActive) return;
      const latestDraft = getStoredProfileDraft(authUserId);
      const draftDistrict = latestDraft?.selectedSggName ?? latestDraft?.preferredDistrict;
      const hasDraftSggCd = Boolean(latestDraft && Object.prototype.hasOwnProperty.call(latestDraft, "selectedSggCd"));
      const draftSggCd = hasDraftSggCd
        ? latestDraft?.selectedSggCd ?? null
        : draftDistrict && draftDistrict !== nextDistrict
          ? null
          : nextSggCd;

      reset(
        latestDraft
          ? {
              ...nextForm,
              email: latestDraft.email,
              address: latestDraft.address,
              detailAddress: latestDraft.detailAddress,
              preferredDistrict: draftDistrict ?? nextDistrict,
              selectedSggCd: draftSggCd,
            }
          : nextForm,
      );
      initializedDraftUserRef.current = normalizeIdentity(authUserId);
    });

    return () => {
      isActive = false;
    };
  }, [authUser, memberData, reset]);

  // 새로고침(beforeunload) 없이도 입력 중인 값을 세션에 임시 저장(초안)한다.
  useEffect(() => {
    const userId = normalizeIdentity(authUser?.userId);
    if (!userId || initializedDraftUserRef.current !== userId) return;

    const draft: ProfileDraft = {
      email: emailValue,
      address: addressValue,
      detailAddress: detailAddressValue,
      preferredDistrict,
      selectedSggCd,
      selectedSggName: preferredDistrict,
    };
    sessionStorage.setItem(getProfileDraftKey(userId), JSON.stringify(draft));
  }, [authUser?.userId, emailValue, addressValue, detailAddressValue, preferredDistrict, selectedSggCd]);

  const updateMemberMutation = useMutation({
    mutationFn: async ({
      formData,
      shouldPatchMember,
      shouldClearPreferredRegion,
      shouldUpdateLocationConsent,
    }: MemberUpdateVariables) => {
      if (shouldPatchMember) {
        const request: MemberUpdateRequest = {
          ...(dirtyFields.phone ? { phone: formData.phone, identityVerificationId } : {}),
          email: formData.email,
          address: formData.address,
          addressDetail: formData.detailAddress,
          ...(formData.selectedSggCd ? { sgg_cd: formData.selectedSggCd } : {}),
        };
        await updateMemberMeApi(request);
      }

      if (shouldUpdateLocationConsent) {
        await agreeToLocationServiceApi(formData.isLocationAgreed);
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
      const updatedForm: ProfileForm = {
        ...variables.formData,
        name: sanitizePlainText(response.name),
        userId: sanitizePlainText(response.userId),
        phone: formatPhoneNumber(variables.formData.phone),
        loginType: isSocialAccount(response.userId, variables.formData.loginType) ? "SOCIAL" : "LOCAL",
        preferredDistrict: response.myGu ?? "",
        selectedSggCd: response.myGuCode ?? null,
        isLocationAgreed: variables.formData.isLocationAgreed,
      };

      const previousSettings = getStoredMyPageSettings(response.userId);
      const settingsToSave: MyPageSettings & { preferredDong?: unknown } = {
        ...previousSettings,
        profile: getLocalProfileSettings(updatedForm),
        preferredDistrict: response.myGu ?? "",
        selectedSggCd: response.myGuCode ?? null,
      };
      delete settingsToSave.preferredDong;

      queryClient.setQueryData(["member", "me"], response);
      localStorage.setItem(getStorageKey(response.userId), JSON.stringify(settingsToSave));
      reset(updatedForm);

      if (authUser) {
        useAuthStore.getState().setUser({
          ...authUser,
          userId: response.userId,
          name: response.name,
          myGu: response.myGu ?? null,
          myGuCode: response.myGuCode ?? null,
          preferredDistrict: response.preferredDistrict || undefined,
          myDong: response.myDong ?? null,
          isLocationAgreed: variables.formData.isLocationAgreed,
        });
      }

      if (!response.myGu) {
        sessionStorage.removeItem(REGION_STORAGE_KEY);
      }

      removeStoredProfileDraft(response.userId);
      resetPassAuth();
      alert("회원 정보 및 설정이 성공적으로 저장되었습니다!");
    },
    onError: (error: unknown) => {
      if (error instanceof PreferredRegionDeleteError) {
        alert("회원정보는 저장되었을 수 있지만 선호지역 삭제에 실패했습니다. 입력값은 유지되므로 다시 저장해 주세요.");
        return;
      }
      const serverMessage =
        axios.isAxiosError(error) && (error.response?.data?.message || error.response?.data?.error);
      alert(serverMessage || "회원 정보 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    },
  });

  const handleCancelChanges = () => {
    removeStoredProfileDraft(authUser?.userId);
    reset();
    resetPassAuth();
  };

  const handleSaveAll = (formData: ProfileForm) => {
    if (!isLoggedIn) {
      alert("로그인 후 회원 정보 및 설정을 저장하실 수 있습니다.");
      return;
    }
    if (dirtyFields.phone && (!phoneVerified || !identityVerificationId)) {
      alert("전화번호 변경을 위해 본인인증을 완료해 주세요.");
      return;
    }
    if (updateMemberMutation.isPending) return;

    const isProfileChanged = Boolean(
      dirtyFields.name || dirtyFields.phone || dirtyFields.email || dirtyFields.address || dirtyFields.detailAddress,
    );
    const isDistrictChanged = Boolean(dirtyFields.preferredDistrict || dirtyFields.selectedSggCd);
    const shouldUpdateLocationConsent = Boolean(dirtyFields.isLocationAgreed);

    if (formData.preferredDistrict && !formData.selectedSggCd) {
      setError("selectedSggCd", { type: "manual", message: "목록에서 자치구를 다시 선택해 주세요." });
      return;
    }

    const shouldClearPreferredRegion = isDistrictChanged && !formData.preferredDistrict && !formData.selectedSggCd;
    const shouldPatchMember = isProfileChanged || (isDistrictChanged && Boolean(formData.selectedSggCd));

    if (!shouldPatchMember && !shouldClearPreferredRegion && !shouldUpdateLocationConsent) return;

    updateMemberMutation.mutate({
      formData,
      shouldPatchMember,
      shouldClearPreferredRegion,
      shouldUpdateLocationConsent,
    });
  };

  const handlePreferredDistrictChange = (value: string) => {
    if (!value || value === "선택 안 함") {
      setValue("preferredDistrict", "", { shouldDirty: true });
      setValue("selectedSggCd", null, { shouldDirty: true });
      clearErrors("selectedSggCd");
      return;
    }

    const selectedSgg = sggs.find((sgg) => sgg.sggNm === value);
    setValue("preferredDistrict", value, { shouldDirty: true });

    if (!selectedSgg) {
      setValue("selectedSggCd", null, { shouldDirty: true });
      setError("selectedSggCd", { type: "manual", message: "목록에 있는 자치구를 선택해 주세요." });
      return;
    }

    setValue("selectedSggCd", selectedSgg.sggCd, { shouldDirty: true });
    clearErrors("selectedSggCd");
  };

  const handleInvalidDistrictBlur = () => {
    const baseline = formState.defaultValues;
    setValue("preferredDistrict", baseline?.preferredDistrict ?? "");
    setValue("selectedSggCd", baseline?.selectedSggCd ?? null);
    clearErrors("selectedSggCd");
  };

  // 이름/기본주소/상세주소처럼 "입력 즉시 문자 제한"이 필요한 필드의 공용 변경 핸들러.
  const handleFieldChange = (field: "name" | "address" | "detailAddress") =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const sanitize = field === "name" ? sanitizeName : sanitizeAddress;
      setValue(field, sanitize(event.target.value), { shouldDirty: true });
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
              <Link to="/login" className="inline-block px-5 py-2 bg-[#0F8AA8] text-white font-bold text-[13px] rounded-[6px]">
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
                <>
                  <div className="space-y-1.5 w-full">
                    <label className="text-[14px] font-bold text-[#13202B] block">아이디</label>
                    <Input
                      {...register("userId")}
                      readOnly
                      placeholder="아이디 정보가 없습니다"
                      className="h-[48px] rounded-[8px] border-[#DCE8ED] bg-[#F0F7FA] px-3.5 text-[15px] text-[#6B7280] cursor-not-allowed font-medium"
                    />
                  </div>

                  {/* 비밀번호 항목: 아이디 입력 박스와 동일한 컨테이너 안에 마지막 변경 일시 + 변경 버튼 */}
                  <div className="space-y-1.5 w-full">
                    <label className="text-[14px] font-bold text-[#13202B] block">비밀번호</label>
                    <div className="flex items-center justify-between gap-3 w-full rounded-xl border border-[#DCE8ED] bg-[#F8FAFC] px-3.5 py-2.5 box-border m-0">
                      <span className="min-w-0 truncate text-[15px] font-medium text-[#6B7280]">
                        마지막 변경 - {lastChangedLabel || "변경 이력 없음"}
                      </span>
                      <Button
                        type="button"
                        disabled={!isLoggedIn || !phoneVerified}
                        onClick={handleOpenPasswordModal}
                        className="shrink-0 h-9 gap-0.5 rounded-lg bg-[#0F8AA8] px-5 text-[14px] font-bold text-white hover:bg-[#0D748E]"
                      >
                        변경
                        <ChevronRight className="size-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                    <p className="text-[12px] text-[#6B7280]">
                      {phoneVerified
                        ? "본인인증이 완료되어 비밀번호를 변경하실 수 있습니다."
                        : "본인인증 완료 후 비밀번호를 변경하실 수 있습니다."}
                    </p>
                  </div>
                </>
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
                    <span className="text-[12px] text-[#6B7280]">본인인증 후 수정 가능</span>
                  )}
                </div>
                <Input
                  {...register("name")}
                  value={nameValue}
                  onChange={handleFieldChange("name")}
                  readOnly={!phoneVerified}
                  disabled={!isLoggedIn}
                  placeholder={phoneVerified ? "이름을 입력해주세요 (숫자, 공백 불가)" : "본인인증 시 실명이 자동 입력됩니다"}
                  className={`h-[48px] rounded-[8px] border-[#DCE8ED] px-3.5 text-[15px] ${
                    phoneVerified ? "bg-white text-[#13202B] focus-visible:border-[#0F8AA8]" : "bg-[#F0F7FA] text-[#6B7280] cursor-not-allowed"
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
                  <Input
                    {...register("phone")}
                    readOnly
                    disabled={!isLoggedIn}
                    placeholder="본인인증 시 번호가 자동 입력됩니다"
                    className="flex-1 h-[48px] rounded-[8px] border-[#DCE8ED] bg-[#F0F7FA] px-3.5 text-[15px] text-[#13202B] cursor-not-allowed font-medium"
                  />
                  <PassAuth
                    phone={phoneValue || ""}
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
                <Input
                  {...register("email")}
                  type="email"
                  disabled={!isLoggedIn}
                  placeholder="이메일 주소를 입력해 주세요 (예: user@example.com)"
                  className="h-[48px] rounded-[8px] border-[#DCE8ED] bg-white px-3.5 text-[15px] text-[#13202B] focus-visible:border-[#0F8AA8] disabled:bg-[#F0F7FA]"
                />
              </div>

              {/* ROW 5: 기본 주소 & 상세 주소 (특수문자 및 불필요한 기호 필터링 적용) */}
              <div className="flex flex-col md:flex-row gap-4 w-full">
                <div className="space-y-1.5 flex-1 w-full md:w-1/2">
                  <label className="text-[14px] font-bold text-[#13202B] block">기본 주소</label>
                  <Input
                    {...register("address")}
                    value={addressValue}
                    onChange={handleFieldChange("address")}
                    disabled={!isLoggedIn}
                    placeholder="기본 주소를 입력해 주세요 (특수문자 제외)"
                    className="h-[48px] rounded-[8px] border-[#DCE8ED] bg-white px-3.5 text-[15px] text-[#13202B] focus-visible:border-[#0F8AA8] disabled:bg-[#F0F7FA]"
                  />
                </div>

                <div className="space-y-1.5 flex-1 w-full md:w-1/2">
                  <label className="text-[14px] font-bold text-[#13202B] block">상세 주소</label>
                  <Input
                    {...register("detailAddress")}
                    value={detailAddressValue}
                    onChange={handleFieldChange("detailAddress")}
                    disabled={!isLoggedIn}
                    placeholder="상세 주소(동, 호수 등)를 입력해 주세요"
                    className="h-[48px] rounded-[8px] border-[#DCE8ED] bg-white px-3.5 text-[15px] text-[#13202B] focus-visible:border-[#0F8AA8] disabled:bg-[#F0F7FA]"
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
                    onInvalidBlur={handleInvalidDistrictBlur}
                    placeholder="자치구를 선택하거나 입력해 주세요"
                    className={!preferredDistrict ? "text-[#64748B]" : "text-[#13202B]"}
                  />
                </div>
                {formState.errors.selectedSggCd && (
                  <p className="text-[12px] text-[#C2410C]" aria-live="assertive">
                    {formState.errors.selectedSggCd.message}
                  </p>
                )}
                <p className="text-[12px] text-[#6B7280]">
                  선호 자치구는 선택하지 않아도 되며, 선택한 자치구를 기준으로 관심 지역을 표시합니다.
                </p>
              </div>

              {/* ROW 7: 위치기반 서비스 이용약관 동의 (다른 필드와 함께 "회원 정보 저장" 클릭 시 반영) */}
              <div className="flex items-center justify-between gap-3 w-full rounded-[8px] border border-[#DCE8ED] bg-white px-3.5 h-[56px]">
                <div className="min-w-0">
                  <label htmlFor="location-service-switch" className="text-[14px] font-bold text-[#13202B] block">
                    위치기반 서비스 이용약관 동의
                  </label>
                  <p className="text-[12px] text-[#6B7280] mt-0.5">
                    위치기반 서비스 이용약관에 동의합니다.
                  </p>
                </div>
                <Switch
                  id="location-service-switch"
                  checked={isLocationAgreedValue}
                  disabled={!isLoggedIn}
                  onCheckedChange={(checked) => setValue("isLocationAgreed", checked, { shouldDirty: true })}
                  aria-label="위치기반 서비스 이용약관 동의"
                />
              </div>
            </div>
          </div>

          {/* ========================================================
              [회원 정보 및 설정 저장] & [변경 취소] 버튼 영역
          ======================================================== */}
          <div className="pt-8 border-t border-[#DCE8ED] text-center">
            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3">
              <Button
                type="submit"
                disabled={!isLoggedIn || updateMemberMutation.isPending}
                className="w-full sm:w-auto order-2 sm:order-1 h-[52px] px-10 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[16px] shadow-xs"
              >
                {updateMemberMutation.isPending ? "저장 중..." : "회원 정보 저장"}
              </Button>
              {isFormDirty && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelChanges}
                  className="w-full sm:w-auto order-1 sm:order-2 h-[52px] px-8 border-[#DCE8ED] text-[#6B7280] text-[15px] shadow-xs"
                >
                  변경 취소
                </Button>
              )}
            </div>
            <p className="text-[13px] text-[#6B7280] mt-2">회원 인적사항 변경사항이 저장됩니다.</p>
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
              className="h-[44px] px-5 border-[#d96666] bg-white text-[#c54e4e] hover:bg-[#fff0f0] text-[14px] whitespace-nowrap"
            >
              회원 탈퇴
            </Button>
          </div>
        </form>
      </div>

      {/* 비밀번호 변경 팝업 모달 */}
      <PasswordChangeModal
        isOpen={isPasswordModalOpen}
        currentPassword={currentPassword}
        newPassword={newPassword}
        newPasswordConfirm={newPasswordConfirm}
        passwordError={passwordError}
        isSaving={isPasswordSaving}
        onChangeCurrentPassword={setCurrentPassword}
        onChangeNewPassword={setNewPassword}
        onChangeNewPasswordConfirm={setNewPasswordConfirm}
        onClose={handleClosePasswordModal}
        onSave={handleSaveNewPassword}
      />

      {/* 일반 회원 탈퇴 비밀번호 확인 모달 */}
      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        withdrawPassword={withdrawPassword}
        withdrawError={withdrawError}
        isWithdrawing={isWithdrawing}
        onChangePassword={setWithdrawPassword}
        onConfirm={handleConfirmWithdrawWithPassword}
        onClose={handleCloseWithdrawModal}
      />
    </div>
  );
}
