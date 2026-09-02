import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch, type UseFormRegister, type UseFormSetValue } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import { isLogin } from "@/features/auth/utils/auth";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import {
  deleteMyPreferredRegionApi,
  updateMemberMeApi,
  type MemberUpdateRequest,
} from "@/api/api";
import apiMiddleware from "@/api/middleware";
import { useDistricts, type District } from "@/hooks/useDistricts";
import { REGION_STORAGE_KEY } from "@/features/region-map/utils/regionSelection";
import type { PassAuthResult } from "@/features/auth/components/PassAuth";
import { usePassAuth } from "./usePassAuth";
import {
  DEFAULT_PROFILE,
  formatPhoneNumber,
  getLocalProfileSettings,
  getProfileDraftKey,
  getStorageKey,
  getStoredMyPageSettings,
  getStoredProfileDraft,
  isSocialAccount,
  getSocialProviderName,
  normalizeIdentity,
  removeStoredProfileDraft,
  sanitizePlainText,
  type MyPageSettings,
  type Profile,
  type ProfileDraft,
} from "../utils/myProfileUtils";

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

async function getMyMember() {
  const { data } = await apiMiddleware.get<MyMemberResponse>("/api/members/me", {
    params: { _t: Date.now() },
  });
  return data;
}

export interface UseProfileFormResult {
  // 로그인/사용자 상태
  isLoggedIn: boolean;
  isSocialUser: boolean;
  socialProvider: string;
  rawUserId: string;

  // 자치구 데이터
  sggs: District[];
  isSggsLoading: boolean;
  districtOptions: string[];
  preferredDistrict: string;
  preferredDistrictError: string;

  // RHF
  register: UseFormRegister<Profile>;
  setValue: UseFormSetValue<Profile>;
  phoneValue: string;

  // PASS 본인인증
  phoneVerified: boolean;
  handlePassSuccess: (result: PassAuthResult) => void;

  // 폼 상태/제출
  isFormDirty: boolean;
  isSaving: boolean;
  onSubmit: (event?: React.BaseSyntheticEvent) => Promise<void>;
  handleCancelChanges: () => void;
  handlePreferredDistrictChange: (value: string) => void;
  handleInvalidDistrictBlur: () => void;
}

/**
 * 마이페이지 프로필 폼의 데이터 패칭·동기화·저장·PASS 인증 연동을 전부 캡슐화한 훅.
 * useForm 인스턴스 생성부터 memberData 동기화, beforeunload 세션 초안 저장,
 * updateMemberMutation, 제출/취소/선호지역 변경 핸들러까지 이 훅 안에서 완결된다.
 */
export function useProfileForm(): UseProfileFormResult {
  const queryClient = useQueryClient();
  const isLoggedIn = isLogin();
  const authUser = useAuthStore((state) => state.user);
  const { data: memberData } = useQuery({
    queryKey: ["member", "me"],
    queryFn: getMyMember,
    enabled: isLoggedIn,
    staleTime: 1000 * 60 * 5,
  });

  const { data: sggs = [], isLoading: isSggsLoading } = useDistricts();

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
  // 세션 초안 저장 핸들러(beforeunload/언마운트)가 리렌더마다 재구독되지 않도록
  // 최신 선호지역 값을 ref로 보관해 둔다.
  const preferredDistrictRef = useRef(preferredDistrict);
  preferredDistrictRef.current = preferredDistrict;
  const selectedSggCdRef = useRef(selectedSggCd);
  selectedSggCdRef.current = selectedSggCd;

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    getValues,
    formState: { isDirty },
  } = useForm<Profile>({
    defaultValues: profile,
  });

  // PassAuth 표시용으로만 필요하므로 phone 필드만 가볍게 구독한다.
  const phoneValue = useWatch({ control, name: "phone" }) || "";

  // PASS 본인인증 훅 (setValue가 이 훅 내부의 useForm에서 나오므로 여기서 함께 구성한다)
  const {
    phoneVerified,
    identityVerificationId,
    handlePassSuccess,
    resetPassAuth,
  } = usePassAuth({ setValue });

  // 소셜 로그인 감지 및 공급자명 판별
  const rawUserId = authUser?.userId || profile.userId || "";
  const socialProvider = getSocialProviderName(rawUserId, profile.loginType);
  const isSocialUser = isSocialAccount(rawUserId, profile.loginType);
  const authUserId = authUser?.userId;
  const authUserName = authUser?.name;

  // 선호지역 옵션 목록 ('선호지역 없음' 옵션 포함)
  const districtOptions = useMemo(() => {
    return ["선택 안 함", ...sggs.map((sgg) => sgg.sggNm)];
  }, [sggs]);

  // authUser 변경 시 해당 사용자 고유의 프로필 및 설정 동기화
  useEffect(() => {
    if (!authUserId) return;

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
  }, [
    authUser?.myGu,
    authUser?.myGuCode,
    authUserId,
    authUserName,
    memberData,
    reset,
  ]);

  // 새로고침(beforeunload) 또는 페이지 이탈(언마운트) 시점에만 form.getValues()를
  // 1회 읽어 세션에 초안을 저장한다. 타이핑마다 저장하지 않아 렌더링/I/O 비용이 없다.
  useEffect(() => {
    const userId = normalizeIdentity(authUser?.userId);
    if (!userId) return;

    const saveDraft = () => {
      if (initializedDraftUserRef.current !== userId) return;
      const { email, address, detailAddress } = getValues();
      const draft: ProfileDraft = {
        email: email ?? "",
        address: address ?? "",
        detailAddress: detailAddress ?? "",
        preferredDistrict: preferredDistrictRef.current,
        selectedSggCd: selectedSggCdRef.current,
        selectedSggName: preferredDistrictRef.current,
      };
      sessionStorage.setItem(getProfileDraftKey(userId), JSON.stringify(draft));
    };

    window.addEventListener("beforeunload", saveDraft);
    return () => {
      window.removeEventListener("beforeunload", saveDraft);
      saveDraft();
    };
  }, [authUser?.userId, getValues]);

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
      resetPassAuth();
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

  // 폼이 수정되었는지 여부: RHF의 isDirty(마지막 reset() 기준 변경 여부)에
  // 선호지역 변경 여부만 가볍게 결합한다.
  const isFormDirty =
    isDirty || preferredDistrict !== originalDistrict || selectedSggCd !== originalSggCd;

  // [변경 취소] 버튼 클릭 핸들러
  const handleCancelChanges = () => {
    removeStoredProfileDraft(authUser?.userId);
    reset(originalProfile);
    setProfile(originalProfile);
    setPreferredDistrict(originalDistrict);
    setSelectedSggCd(originalSggCd);
    setPreferredDistrictError("");
    resetPassAuth();
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

  const handleInvalidDistrictBlur = () => {
    setPreferredDistrict(originalDistrict);
    setSelectedSggCd(originalSggCd);
    setPreferredDistrictError("");
  };

  return {
    isLoggedIn,
    isSocialUser,
    socialProvider,
    rawUserId,

    sggs,
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
    isSaving: updateMemberMutation.isPending,
    onSubmit: handleSubmit(handleSaveAll),
    handleCancelChanges,
    handlePreferredDistrictChange,
    handleInvalidDistrictBlur,
  };
}
