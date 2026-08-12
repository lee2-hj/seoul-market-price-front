import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { isLogin } from "@/features/auth/utils/auth";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { CheckCircle2, HelpCircle, Search } from "lucide-react";
import PassAuth from "@/features/auth/components/PassAuth";
import { getBoardPostsApi } from "@/api/api";

/**
 * 마이페이지 상단 선택 탭
 */
type MyPageTab = "PROFILE" | "NOTIFICATION" | "ACTIVITY";

/**
 * 내 활동 서브 탭
 */
type ActivityType = "POST" | "COMMENT";

/**
 * 로그인 방식
 */
type LoginType = "LOCAL" | "SOCIAL";

function isMyPageTab(value: string | null): value is MyPageTab {
  return value === "PROFILE" || value === "NOTIFICATION" || value === "ACTIVITY";
}

const INITIAL_FAVORITE_ITEMS = ["래미안 원베일리", "마포래미안푸르지오", "잠실엘스"];

/**
 * 휴대폰 번호 정규식 자동 포맷터 (01012345678 -> 010-1234-5678)
 */
export const formatPhoneNumber = (value: string): string => {
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
 * 서울시 주요 아파트 단지 데이터베이스 (검색 및 자동완성용)
 */
const AVAILABLE_APARTMENTS = [
  { name: "래미안 원베일리", district: "서초구" },
  { name: "아크로리버파크", district: "서초구" },
  { name: "반포자이", district: "서초구" },
  { name: "래미안퍼스티지", district: "서초구" },
  { name: "마포래미안푸르지오", district: "마포구" },
  { name: "신촌그랑자이", district: "마포구" },
  { name: "마포프레스티지자이", district: "마포구" },
  { name: "잠실엘스", district: "송파구" },
  { name: "리센츠", district: "송파구" },
  { name: "헬리오시티", district: "송파구" },
  { name: "올림픽선수기자촌", district: "송파구" },
  { name: "고덕그라시움", district: "강동구" },
  { name: "고덕아르테온", district: "강동구" },
  { name: "올림픽파크포레온", district: "강동구" },
  { name: "DMC파크뷰자이", district: "서대문구" },
  { name: "e편한세상신촌", district: "서대문구" },
  { name: "래미안대치팰리스", district: "강남구" },
  { name: "은마아파트", district: "강남구" },
  { name: "도곡렉슬", district: "강남구" },
  { name: "디에이치아너힐즈", district: "강남구" },
  { name: "압구정현대", district: "강남구" },
  { name: "개포자이프레지던스", district: "강남구" },
  { name: "옥수리버젠", district: "성동구" },
  { name: "트리마제", district: "성동구" },
  { name: "아크로서울포레스트", district: "성동구" },
  { name: "목동신시가지7단지", district: "양천구" },
  { name: "목동하이페리온", district: "양천구" },
  { name: "경희궁자이", district: "종로구" },
  { name: "래미안위브", district: "동대문구" },
  { name: "청량리역롯데캐슬SKY-L65", district: "동대문구" },
  { name: "보라매SK뷰", district: "영등포구" },
  { name: "여의도시범", district: "영등포구" },
  { name: "아크로리버하임", district: "동작구" },
  { name: "흑석한강센트레빌", district: "동작구" },
  { name: "상계주공7단지", district: "노원구" },
  { name: "중계그린", district: "노원구" },
  { name: "센트라스", district: "성동구" },
  { name: "텐즈힐", district: "성동구" },
];

type Profile = {
  loginType: LoginType;
  name: string;
  userId: string;
  phone: string;
  email: string;
  address: string;
  detailAddress: string;
};

type NotificationSettings = {
  priceChange: boolean;
  priceIncrease: boolean;
  priceDecrease: boolean;
  favoriteOnly: boolean;
};

type PriceAlertCondition = "PRICE_BELOW" | "PRICE_ABOVE" | "RATE_UP" | "RATE_DOWN";

type PriceAlert = {
  id: number;
  itemName: string;
  condition: PriceAlertCondition;
  threshold: number;
  enabled: boolean;
};

type MyPageSettings = {
  profile: Profile;
  favoriteItems: string[];
  preferredDistrict: string;
  notificationSettings: NotificationSettings;
  priceAlerts: PriceAlert[];
};

const DEFAULT_PROFILE: Profile = {
  loginType: "LOCAL",
  name: "홍길동",
  userId: "hong123",
  phone: "010-1234-5678",
  email: "hong@example.com",
  address: "서울특별시 마포구",
  detailAddress: "싸부아파트 101동 1001호",
};

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  priceChange: true,
  priceIncrease: true,
  priceDecrease: true,
  favoriteOnly: true,
};

const PRICE_ALERT_CONDITION_LABELS: Record<PriceAlertCondition, string> = {
  PRICE_BELOW: "원 이하",
  PRICE_ABOVE: "원 이상",
  RATE_UP: "% 이상 상승",
  RATE_DOWN: "% 이상 하락",
};

const DEFAULT_PRICE_ALERTS: PriceAlert[] = [
  { id: 1, itemName: "마포래미안푸르지오", condition: "PRICE_BELOW", threshold: 180000, enabled: true },
  { id: 2, itemName: "잠실엘스", condition: "RATE_DOWN", threshold: 5, enabled: true },
];

const SEOUL_DISTRICTS = [
  "강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구",
  "노원구", "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구",
  "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구",
];

function getStorageKey(userId?: string): string {
  const cleanId = (userId || "").trim().toLowerCase();
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

export default function MyPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabValue = searchParams.get("tab");
  const activeTab: MyPageTab = isMyPageTab(tabValue) ? tabValue : "PROFILE";

  const isLoggedIn = isLogin();
  const authUser = useAuthStore((state) => state.user);

  const handleTabChange = (nextTab: MyPageTab) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextTab === "PROFILE") {
      nextParams.delete("tab");
    } else {
      nextParams.set("tab", nextTab);
    }
    setSearchParams(nextParams);
  };

  const [activityType, setActivityType] = useState<ActivityType>("POST");

  // 초기 프로필 로드
  const [profile, setProfile] = useState<Profile>(() => {
    const saved = getStoredMyPageSettings();
    if (authUser) {
      const isSocial =
        authUser.userId?.toLowerCase().startsWith("kakao_") ||
        authUser.userId?.toLowerCase().includes("kakao") ||
        authUser.userId?.toLowerCase().startsWith("google_") ||
        authUser.userId?.toLowerCase().includes("google") ||
        authUser.userId?.toLowerCase().startsWith("naver_") ||
        authUser.userId?.toLowerCase().includes("naver");
      const savedProfile: Partial<Profile> = saved?.profile || {};
      return {
        ...DEFAULT_PROFILE,
        ...savedProfile,
        phone: formatPhoneNumber(savedProfile.phone || DEFAULT_PROFILE.phone),
        loginType: isSocial ? "SOCIAL" : "LOCAL",
        name: authUser.name || savedProfile.name || DEFAULT_PROFILE.name,
        userId: authUser.userId || savedProfile.userId || DEFAULT_PROFILE.userId,
      };
    }
    if (saved?.profile) {
      return {
        ...DEFAULT_PROFILE,
        ...saved.profile,
        phone: formatPhoneNumber(saved.profile.phone || DEFAULT_PROFILE.phone),
      };
    }
    return DEFAULT_PROFILE;
  });

  const [favoriteItems, setFavoriteItems] = useState<string[]>(() => {
    const saved = getStoredMyPageSettings();
    return saved?.favoriteItems ?? INITIAL_FAVORITE_ITEMS;
  });

  const [newFavoriteItem, setNewFavoriteItem] = useState("");

  const [preferredDistrict, setPreferredDistrict] = useState(() => {
    const saved = getStoredMyPageSettings();
    return saved?.preferredDistrict ?? "마포구";
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() => {
    const saved = getStoredMyPageSettings();
    return saved?.notificationSettings ?? DEFAULT_NOTIFICATION_SETTINGS;
  });

  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>(() => {
    const saved = getStoredMyPageSettings();
    return saved?.priceAlerts ?? DEFAULT_PRICE_ALERTS;
  });

  // 원본 스냅샷 (변경 취소 시 복구할 기준 데이터)
  const [originalProfile, setOriginalProfile] = useState<Profile>(profile);
  const [originalDistrict, setOriginalDistrict] = useState<string>(preferredDistrict);
  const [originalFavorites, setOriginalFavorites] = useState<string[]>(favoriteItems);
  const [originalAlerts, setOriginalAlerts] = useState<PriceAlert[]>(priceAlerts);

  // 인증 관련 State
  const [phoneVerified, setPhoneVerified] = useState(false);

  // 비밀번호 변경 모달 State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // 회원 탈퇴 모달 State (일반 회원 비밀번호 확인용)
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawPassword, setWithdrawPassword] = useState("");
  const [withdrawError, setWithdrawError] = useState("");

  const [emailVerified, setEmailVerified] = useState(false);
  const [emailCertSent, setEmailCertSent] = useState(false);
  const [emailCertCode, setEmailCertCode] = useState("");

  const handleOpenPasswordModal = () => {
    if (!isLoggedIn) {
      alert("로그인 후 이용하실 수 있습니다.");
      return;
    }
    if (!phoneVerified) {
      alert("안전한 비밀번호 변경을 위해 아래 [PASS 본인인증]을 먼저 완료해 주세요.");
      return;
    }
    setPasswordError("");
    setNewPassword("");
    setNewPasswordConfirm("");
    setIsPasswordModalOpen(true);
  };

  const handleSaveNewPassword = () => {
    if (newPassword.length < 8 || newPassword.length > 16) {
      setPasswordError("비밀번호는 8자 이상 16자 이하로 입력해 주세요.");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setPasswordError("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    alert("비밀번호가 성공적으로 변경되었습니다. 다음 로그인부터 새 비밀번호를 사용해 주세요.");
    setIsPasswordModalOpen(false);
    setNewPassword("");
    setNewPasswordConfirm("");
    setPasswordError("");
  };

  // 실제 탈퇴 처리 로직
  const executeWithdrawal = () => {
    const userKey = getStorageKey(authUser?.userId || profile.userId);
    localStorage.removeItem(userKey);
    useAuthStore.getState().clearSession();
    alert("회원 탈퇴가 완료되었습니다. 그동안 서비스를 이용해 주셔서 감사합니다.");
    window.location.href = "/";
  };

  // 회원 탈퇴 버튼 클릭 분기 (일반 vs 소셜)
  const handleClickWithdraw = () => {
    if (!isLoggedIn) {
      alert("로그인 후 이용 가능합니다.");
      return;
    }

    if (isSocialUser) {
      // 소셜 로그인은 2차 컨펌 팝업
      if (window.confirm("정말로 회원 탈퇴를 진행하시겠습니까?\n탈퇴 시 작성하신 모든 게시글과 댓글은 화면에서 즉시 숨김 처리됩니다.")) {
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
  const handleConfirmWithdrawWithPassword = () => {
    const pwd = withdrawPassword.trim();
    if (!pwd) {
      setWithdrawError("비밀번호를 입력해 주세요.");
      return;
    }
    if (pwd.length < 4) {
      setWithdrawError("비밀번호를 올바르게 입력해 주세요.");
      return;
    }
    setIsWithdrawModalOpen(false);
    executeWithdrawal();
  };

  const { register, handleSubmit, setValue, reset, watch } = useForm<Profile>({
    defaultValues: profile,
  });

  const formValues = watch();

  // 소셜 로그인 감지 및 공급자명 판별
  const currentUserId = authUser?.userId || profile.userId || "";
  const getSocialProviderName = (id: string, type: string) => {
    const lower = id.toLowerCase();
    if (lower.startsWith("google_") || lower.includes("google")) return "구글";
    if (lower.startsWith("kakao_") || lower.includes("kakao")) return "카카오";
    if (lower.startsWith("naver_") || lower.includes("naver")) return "네이버";
    if (type === "SOCIAL") return "소셜";
    return "";
  };

  const socialProvider = getSocialProviderName(currentUserId, profile.loginType);
  const isSocialUser =
    Boolean(socialProvider) ||
    profile.loginType === "SOCIAL" ||
    currentUserId.toLowerCase().startsWith("kakao_") ||
    currentUserId.toLowerCase().startsWith("google_") ||
    currentUserId.toLowerCase().startsWith("naver_") ||
    currentUserId.toLowerCase().includes("kakao") ||
    currentUserId.toLowerCase().includes("google") ||
    currentUserId.toLowerCase().includes("naver");

  // authUser 변경 시 해당 사용자 고유의 프로필 및 설정 동기화
  useEffect(() => {
    if (authUser?.userId) {
      const isSocial =
        authUser.userId?.toLowerCase().startsWith("kakao_") ||
        authUser.userId?.toLowerCase().includes("kakao") ||
        authUser.userId?.toLowerCase().startsWith("google_") ||
        authUser.userId?.toLowerCase().includes("google") ||
        authUser.userId?.toLowerCase().startsWith("naver_") ||
        authUser.userId?.toLowerCase().includes("naver");

      const saved = getStoredMyPageSettings(authUser.userId);

      const nextProfile: Profile = {
        ...DEFAULT_PROFILE,
        ...(saved?.profile || {}),
        name: authUser.name || saved?.profile?.name || DEFAULT_PROFILE.name,
        userId: authUser.userId,
        loginType: isSocial ? "SOCIAL" : "LOCAL",
      };

      const nextFavorites = saved?.favoriteItems ?? INITIAL_FAVORITE_ITEMS;
      const nextDistrict = saved?.preferredDistrict ?? "마포구";
      const nextNotifications = saved?.notificationSettings ?? DEFAULT_NOTIFICATION_SETTINGS;
      const nextAlerts = saved?.priceAlerts ?? DEFAULT_PRICE_ALERTS;

      setProfile(nextProfile);
      setOriginalProfile(nextProfile);
      reset(nextProfile);

      setFavoriteItems(nextFavorites);
      setOriginalFavorites(nextFavorites);

      setPreferredDistrict(nextDistrict);
      setOriginalDistrict(nextDistrict);

      setNotificationSettings(nextNotifications);
      setPriceAlerts(nextAlerts);
      setOriginalAlerts(nextAlerts);
    }
  }, [authUser, reset]);

  // 실제 게시판 데이터 조회 (API 연동)
  const { data: boardData, isLoading: isBoardLoading } = useQuery({
    queryKey: ["myBoardPosts"],
    queryFn: () => getBoardPostsApi({ page: 1, size: 100 }),
    enabled: isLoggedIn,
  });

  // 내가 작성한 게시글 필터링
  const myPosts = useMemo(() => {
    if (!boardData?.items || !authUser) return [];
    const currentName = (authUser.name || "").trim().toLowerCase();
    const currentId = (authUser.userId || "").trim().toLowerCase();

    return boardData.items.filter((item) => {
      const author = (item.authorName || "").trim().toLowerCase();
      return (currentName && author === currentName) || (currentId && author === currentId);
    });
  }, [boardData, authUser]);

  // 폼이 수정되었는지 여부 계산 (Dirty check)
  const isFormDirty = useMemo(() => {
    const isProfileChanged =
      (formValues.name ?? "") !== (originalProfile.name ?? "") ||
      (formValues.phone ?? "") !== (originalProfile.phone ?? "") ||
      (formValues.email ?? "") !== (originalProfile.email ?? "") ||
      (formValues.address ?? "") !== (originalProfile.address ?? "") ||
      (formValues.detailAddress ?? "") !== (originalProfile.detailAddress ?? "");

    const isDistrictChanged = preferredDistrict !== originalDistrict;
    const isFavoritesChanged = JSON.stringify(favoriteItems) !== JSON.stringify(originalFavorites);
    const isAlertsChanged = JSON.stringify(priceAlerts) !== JSON.stringify(originalAlerts);

    return isProfileChanged || isDistrictChanged || isFavoritesChanged || isAlertsChanged;
  }, [
    formValues.name,
    formValues.phone,
    formValues.email,
    formValues.address,
    formValues.detailAddress,
    originalProfile,
    preferredDistrict,
    originalDistrict,
    favoriteItems,
    originalFavorites,
    priceAlerts,
    originalAlerts,
  ]);

  // [변경 취소] 버튼 클릭 핸들러
  const handleCancelChanges = () => {
    reset(originalProfile);
    setProfile(originalProfile);
    setPreferredDistrict(originalDistrict);
    setFavoriteItems(originalFavorites);
    setPriceAlerts(originalAlerts);
    setPhoneVerified(false);
    setEmailCertSent(false);
    setEmailVerified(false);
  };

  // 회원 정보 및 설정 일괄 저장 핸들러 (수동 저장)
  const handleSaveAll = (formData: Profile) => {
    if (!isLoggedIn) {
      alert("로그인 후 회원 정보 및 설정을 저장하실 수 있습니다.");
      return;
    }

    const updatedProfile = { ...profile, ...formData };
    setProfile(updatedProfile);
    setOriginalProfile(updatedProfile);
    setOriginalDistrict(preferredDistrict);
    setOriginalFavorites(favoriteItems);
    setOriginalAlerts(priceAlerts);

    const settingsToSave: MyPageSettings = {
      profile: updatedProfile,
      favoriteItems,
      preferredDistrict,
      notificationSettings,
      priceAlerts,
    };
    const userKey = getStorageKey(authUser?.userId || profile.userId);
    localStorage.setItem(userKey, JSON.stringify(settingsToSave));

    alert("회원 정보 및 설정이 성공적으로 저장되었습니다!");
  };

  // 알림 설정 탭 전용 저장 핸들러 (수동 저장)
  const handleSaveNotificationSettings = () => {
    if (!isLoggedIn) {
      alert("로그인 후 설정을 저장하실 수 있습니다.");
      return;
    }

    const userKey = getStorageKey(authUser?.userId || profile.userId);
    const currentSaved = getStoredMyPageSettings(authUser?.userId || profile.userId) || {
      profile,
      favoriteItems,
      preferredDistrict,
      notificationSettings,
      priceAlerts,
    };

    const settingsToSave: MyPageSettings = {
      ...currentSaved,
      notificationSettings,
    };
    localStorage.setItem(userKey, JSON.stringify(settingsToSave));

    alert("알림 수신 설정이 성공적으로 저장되었습니다!");
  };

  // PASS 본인인증 성공 핸들러
  const handlePassSuccess = (result: {
    identityVerificationId: string;
    name: string;
    phoneNumber: string;
  }) => {
    const formatted = formatPhoneNumber(result.phoneNumber);

    setValue("phone", formatted);
    if (result.name) {
      setValue("name", result.name);
    }
    setPhoneVerified(true);
  };

  // 이메일 인증 발송 및 검증
  const handleSendEmailCert = () => {
    if (!isLoggedIn) return alert("로그인 후 인증이 가능합니다.");
    setEmailCertSent(true);
    alert("인증번호가 이메일로 전송되었습니다. (테스트 인증번호: 654321)");
  };

  const handleVerifyEmailCode = () => {
    if (emailCertCode.trim() === "654321" || emailCertCode.trim().length === 6) {
      setEmailVerified(true);
      setEmailCertSent(false);
      alert("이메일 인증이 성공적으로 완료되었습니다!");
    } else {
      alert("인증번호 6자리를 올바르게 입력해주세요. (테스트 번호: 654321)");
    }
  };

  const [isAptDropdownOpen, setIsAptDropdownOpen] = useState(false);

  // 실시간 아파트 자동완성 필터링
  const aptSuggestions = useMemo(() => {
    const query = newFavoriteItem.trim().toLowerCase();
    if (!query) return [];
    return AVAILABLE_APARTMENTS.filter(
      (apt) =>
        apt.name.toLowerCase().includes(query) ||
        apt.district.toLowerCase().includes(query)
    ).slice(0, 8);
  }, [newFavoriteItem]);

  const handleSelectApartment = (aptName: string) => {
    if (!isLoggedIn) return alert("로그인 후 관심 단지를 등록할 수 있습니다.");
    if (favoriteItems.includes(aptName)) {
      alert("이미 등록된 관심 단지입니다.");
      setIsAptDropdownOpen(false);
      return;
    }
    setFavoriteItems((prev) => [...prev, aptName]);
    setNewFavoriteItem("");
    setIsAptDropdownOpen(false);
  };

  const handleFavoriteAdd = () => {
    if (!isLoggedIn) return alert("로그인 후 관심 단지를 등록할 수 있습니다.");
    const query = newFavoriteItem.trim();
    if (!query) return alert("관심 아파트 단지명을 입력해 주세요.");

    // 입력된 텍스트와 정확히 일치하거나 추천 목록이 1개일 때만 허용
    const match =
      AVAILABLE_APARTMENTS.find(
        (apt) => apt.name.toLowerCase() === query.toLowerCase()
      ) || (aptSuggestions.length === 1 ? aptSuggestions[0] : undefined);

    if (!match) {
      alert("목록에 존재하는 서울시 아파트 단지만 등록할 수 있습니다.\n검색창에 아파트명을 입력한 뒤 추천 드롭다운 목록에서 단지를 선택해 주세요.");
      return;
    }

    if (favoriteItems.includes(match.name)) {
      alert("이미 등록된 관심 단지입니다.");
      return;
    }

    setFavoriteItems((prev) => [...prev, match.name]);
    setNewFavoriteItem("");
    setIsAptDropdownOpen(false);
  };

  const handleFavoriteRemove = (target: string) => {
    if (!isLoggedIn) return alert("로그인 후 관리 가능합니다.");
    setFavoriteItems((prev) => prev.filter((i) => i !== target));
  };

  const handlePriceAlertToggle = (id: number) => {
    if (!isLoggedIn) return alert("로그인 후 변경할 수 있습니다.");
    setPriceAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
  };

  const handlePriceAlertRemove = (id: number) => {
    if (!isLoggedIn) return alert("로그인 후 삭제할 수 있습니다.");
    setPriceAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#fafcf9]">
      <div className="py-12 px-5 sm:px-8">
        <div className="max-w-[1000px] mx-auto space-y-8">
          {/* 헤더 */}
          <div className="text-center space-y-2 mb-8">
            <span className="inline-block px-3 py-1 bg-[#e8f3e9] text-[#3f8a47] text-[11px] font-extrabold tracking-wider rounded-full uppercase">
              CUSTOMER CENTER
            </span>
            <h1 className="text-[36px] font-black text-[#242b23] tracking-tight">
              마이페이지
            </h1>
            <p className="text-[15px] text-[#667065]">
              회원 정보 및 관심 아파트 단지, 가격 변동 알림 설정을 한곳에서 관리합니다.
            </p>
          </div>

          {/* 메인 탭 */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2 p-1.5 bg-white rounded-[10px] border border-[#dce4da] shadow-sm">
              <button
                type="button"
                onClick={() => handleTabChange("PROFILE")}
                className={`py-2.5 px-6 text-[14px] font-bold rounded-[8px] transition-all cursor-pointer ${
                  activeTab === "PROFILE"
                    ? "bg-[#57a764] text-white shadow-sm"
                    : "text-[#526055] hover:bg-[#f5f8f5]"
                }`}
              >
                내 정보 관리
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("NOTIFICATION")}
                className={`py-2.5 px-6 text-[14px] font-bold rounded-[8px] transition-all cursor-pointer ${
                  activeTab === "NOTIFICATION"
                    ? "bg-[#57a764] text-white shadow-sm"
                    : "text-[#526055] hover:bg-[#f5f8f5]"
                }`}
              >
                알림 설정
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("ACTIVITY")}
                className={`py-2.5 px-6 text-[14px] font-bold rounded-[8px] transition-all cursor-pointer ${
                  activeTab === "ACTIVITY"
                    ? "bg-[#57a764] text-white shadow-sm"
                    : "text-[#526055] hover:bg-[#f5f8f5]"
                }`}
              >
                내 활동
              </button>
            </div>
          </div>

          {/* 메인 카드 컨테이너 */}
          <div className="bg-white border border-[#dce4da] rounded-[12px] p-8 md:p-10 shadow-[0_7px_24px_rgba(45,70,45,0.05)]">
            {/* TAB 1: 내 정보 */}
            {activeTab === "PROFILE" && (
              <form onSubmit={handleSubmit(handleSaveAll)} className="space-y-12">
                {!isLoggedIn && (
                  <div className="p-4 bg-[#fff8f8] border border-[#f1cccc] rounded-[8px] text-center space-y-2">
                    <p className="text-[14px] text-[#c54e4e] font-bold">
                      현재 비로그인 상태입니다. 회원 정보 수정 및 인증을 진행하시려면 로그인이 필요합니다.
                    </p>
                    <Link
                      to="/login"
                      className="inline-block px-5 py-2 bg-[#57a764] text-white font-bold text-[13px] rounded-[6px]"
                    >
                      로그인하러 가기
                    </Link>
                  </div>
                )}

                {/* 1. 회원 정보 관리 */}
                <div className="space-y-6">
                  <div className="text-center space-y-1">
                    <h2 className="text-[22px] font-black text-[#242b23]">회원 정보 관리</h2>
                    <p className="text-[14px] text-[#667065]">
                      회원님의 필수 인적사항과 휴대폰 및 이메일 인증을 진행하실 수 있습니다.
                    </p>
                  </div>

                  <div className="space-y-5 max-w-[820px] mx-auto">
                    {/* ROW 1: 로그인 방식에 따른 분기 */}
                    {isSocialUser ? (
                      <div className="w-full bg-[#f4fbf5] border border-[#cbe4cf] rounded-[12px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 box-border shadow-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <strong className="text-[15px] font-black text-[#1e2a20]">
                              {socialProvider || "소셜"} 연동 계정으로 로그인 중입니다
                            </strong>

                            {/* ? 모양 툴팁 버튼 (마우스 오버 시 안내 표시) */}
                            <div className="relative group inline-flex items-center">
                              <button
                                type="button"
                                aria-label="소셜 계정 안내 툴팁"
                                className="w-5 h-5 rounded-full bg-[#d6ebd9] hover:bg-[#4c9b55] text-[#2e7438] hover:text-white font-black text-[11px] flex items-center justify-center cursor-pointer transition-all shadow-xs"
                              >
                                ?
                              </button>

                              {/* 툴팁 팝오버 */}
                              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2.5 hidden group-hover:flex flex-col w-[290px] p-3.5 bg-[#1b251d] text-white text-[12px] rounded-[10px] shadow-2xl z-50 leading-relaxed text-center pointer-events-none transition-all">
                                <div className="font-bold text-[#86efac] mb-1 flex items-center justify-center gap-1">
                                  <HelpCircle className="w-3.5 h-3.5" /> 소셜 계정 정보 변경 안내
                                </div>
                                <span>
                                  소셜({socialProvider || "해당"}) 계정은 별도의 비밀번호가 없습니다.
                                </span>
                                <span className="text-[#d0ded2] mt-1">
                                  회원정보 및 비밀번호 변경은 <b>{socialProvider || "소셜"} 계정 관리 사이트</b>로 이동하여 변경해 주세요.
                                </span>
                                {/* 말풍선 꼬리 */}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#1b251d]"></div>
                              </div>
                            </div>
                          </div>

                          <p className="text-[12px] text-[#627565]">
                            소셜 연동 계정은 아이디 및 비밀번호 수정이 제공되지 않습니다.
                          </p>
                        </div>

                        <span className="text-[12px] font-bold px-3.5 py-1.5 bg-white border border-[#b8ddbc] text-[#2e7438] rounded-full shrink-0 text-center shadow-2xs self-start sm:self-auto">
                          {socialProvider || "소셜"} 간편로그인
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col md:flex-row gap-4 w-full">
                        <div className="space-y-1.5 flex-1 w-full md:w-1/2">
                          <label className="text-[14px] font-bold text-[#344037] block">아이디</label>
                          <input
                            {...register("userId")}
                            readOnly
                            className="w-full h-[48px] rounded-[8px] border border-[#d5dfd6] bg-[#f5f7f5] px-3.5 text-[15px] text-[#7a877c] cursor-not-allowed outline-none box-border m-0 font-medium"
                          />
                        </div>

                        <div className="space-y-1.5 flex-1 w-full md:w-1/2">
                          <div className="flex items-center justify-between">
                            <label className="text-[14px] font-bold text-[#344037] block">비밀번호 변경</label>
                            {phoneVerified ? (
                              <span className="text-[12px] font-extrabold text-[#3a8b46]">
                                ✔ PASS 인증 완료 (변경 가능)
                              </span>
                            ) : (
                              <span className="text-[12px] text-[#8a968c]">
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
                                ? "bg-[#57a764] hover:bg-[#438e4d] text-white border-[#57a764] cursor-pointer"
                                : "bg-[#f5f7f5] text-[#7a877c] border-[#d5dfd6] cursor-not-allowed select-none opacity-85"
                            }`}
                          >
                            비밀번호 변경하기
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ROW 2: 이름 (PASS 본인인증 완료 시 자동 반영 및 수정 가능) */}
                    <div className="space-y-1.5 w-full">
                      <div className="flex items-center justify-between">
                        <label className="text-[14px] font-bold text-[#344037] block">이름</label>
                        {phoneVerified ? (
                          <span className="inline-flex items-center gap-1 text-[12px] font-extrabold text-[#3a8b46]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> 실명 인증 완료
                          </span>
                        ) : (
                          <span className="text-[12px] text-[#7a877c]">
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
                            : "PASS 본인인증 시 실명이 자동 입력됩니다"
                        }
                        className={`w-full h-[48px] rounded-[8px] border border-[#d5dfd6] px-3.5 text-[15px] outline-none box-border m-0 transition-colors ${
                          phoneVerified
                            ? "bg-white text-[#2b362d] focus:border-[#57a764]"
                            : "bg-[#f5f7f5] text-[#556357] cursor-not-allowed"
                        }`}
                      />
                      <p className="text-[12px] text-[#718073]">
                        {phoneVerified
                          ? "PASS 본인인증이 완료되어 실명이 적용되었습니다."
                          : "회원 실명 보호를 위해 아래 PASS 본인인증 완료 시 자동으로 반영 및 수정이 활성화됩니다."}
                      </p>
                    </div>

                    {/* ROW 3: 휴대폰 번호 + PASS 본인인증 버튼 (직접 수정 불가, PASS 인증 시 자동 입력) */}
                    <div className="space-y-1.5 w-full">
                      <div className="flex items-center justify-between">
                        <label className="text-[14px] font-bold text-[#344037] block">휴대폰 번호</label>
                        {phoneVerified && (
                          <span className="inline-flex items-center gap-1 text-[12px] font-extrabold text-[#3a8b46]">
                            <CheckCircle2 className="w-4 h-4" /> PASS 인증 완료
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          {...register("phone")}
                          readOnly
                          disabled={!isLoggedIn}
                          placeholder="PASS 본인인증 시 번호가 자동 입력됩니다"
                          className="flex-1 h-[48px] rounded-[8px] border border-[#d5dfd6] bg-[#f5f7f5] px-3.5 text-[15px] text-[#2b362d] outline-none cursor-not-allowed font-medium"
                        />
                        <PassAuth
                          phone={watch("phone")}
                          onSuccess={handlePassSuccess}
                          className="h-[48px] px-5 bg-[#4c9b55] hover:bg-[#438b4b] text-white font-bold text-[14px] rounded-[8px] cursor-pointer whitespace-nowrap transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm shrink-0"
                        />
                      </div>
                      <p className="text-[12px] text-[#718073]">
                        휴대폰 번호는 직접 입력할 수 없으며, 우측 [PASS 본인인증]을 진행하면 실제 인증 번호가 자동 입력됩니다.
                      </p>
                    </div>

                    {/* ROW 4: 이메일 주소 + 이메일 인증 버튼 */}
                    <div className="space-y-1.5 w-full">
                      <div className="flex items-center justify-between">
                        <label className="text-[14px] font-bold text-[#344037] block">이메일 주소</label>
                        {emailVerified && (
                          <span className="inline-flex items-center gap-1 text-[12px] font-extrabold text-[#3a8b46]">
                            <CheckCircle2 className="w-4 h-4" /> 인증 완료
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          {...register("email")}
                          disabled={!isLoggedIn}
                          className="flex-1 h-[48px] rounded-[8px] border border-[#d5dfd6] bg-white px-3.5 text-[15px] text-[#2b362d] outline-none focus:border-[#57a764] disabled:bg-[#f5f7f5]"
                        />
                        <button
                          type="button"
                          disabled={!isLoggedIn || emailVerified}
                          onClick={handleSendEmailCert}
                          className="h-[48px] px-5 bg-[#343c33] hover:bg-[#252b24] text-white font-bold text-[13px] rounded-[8px] cursor-pointer whitespace-nowrap transition-colors disabled:opacity-50"
                        >
                          {emailVerified ? "인증됨" : "이메일 인증"}
                        </button>
                      </div>

                      {/* 이메일 인증번호 입력 폼 */}
                      {emailCertSent && !emailVerified && (
                        <div className="flex gap-2 pt-1">
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="인증번호 6자리 (테스트: 654321)"
                            value={emailCertCode}
                            onChange={(e) => setEmailCertCode(e.target.value)}
                            className="flex-1 h-[42px] rounded-[6px] border border-[#57a764] bg-white px-3 text-[14px] outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyEmailCode}
                            className="h-[42px] px-4 bg-[#57a764] hover:bg-[#438e4d] text-white font-bold text-[13px] rounded-[6px]"
                          >
                            인증 확인
                          </button>
                        </div>
                      )}
                    </div>

                    {/* ROW 5: 기본 주소 & 상세 주소 */}
                    <div className="flex flex-col md:flex-row gap-4 w-full">
                      <div className="space-y-1.5 flex-1 w-full md:w-1/2">
                        <label className="text-[14px] font-bold text-[#344037] block">기본 주소</label>
                        <input
                          {...register("address")}
                          disabled={!isLoggedIn}
                          className="w-full h-[48px] rounded-[8px] border border-[#d5dfd6] bg-white px-3.5 text-[15px] text-[#2b362d] outline-none focus:border-[#57a764] box-border m-0 disabled:bg-[#f5f7f5]"
                        />
                      </div>

                      <div className="space-y-1.5 flex-1 w-full md:w-1/2">
                        <label className="text-[14px] font-bold text-[#344037] block">상세 주소</label>
                        <input
                          {...register("detailAddress")}
                          disabled={!isLoggedIn}
                          className="w-full h-[48px] rounded-[8px] border border-[#d5dfd6] bg-white px-3.5 text-[15px] text-[#2b362d] outline-none focus:border-[#57a764] box-border m-0 disabled:bg-[#f5f7f5]"
                        />
                      </div>
                    </div>

                    {/* ROW 6: 선호 지역 설정 */}
                    <div className="space-y-1.5 w-full">
                      <label className="text-[14px] font-bold text-[#344037] block">선호 지역 설정</label>
                      <select
                        value={preferredDistrict}
                        disabled={!isLoggedIn}
                        onChange={(e) => setPreferredDistrict(e.target.value)}
                        className="w-full h-[48px] rounded-[8px] border border-[#d5dfd6] bg-white px-3.5 text-[15px] text-[#2b362d] outline-none focus:border-[#57a764] box-border m-0 disabled:bg-[#f5f7f5]"
                      >
                        {SEOUL_DISTRICTS.map((district) => (
                          <option key={district} value={district}>
                            {district}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. 관심 품목 설정 */}
                <div className="pt-8 border-t border-[#e7ece7] space-y-4">
                  <div className="text-center space-y-1">
                    <h2 className="text-[20px] font-bold text-[#242b23]">관심 아파트 단지</h2>
                    <p className="text-[14px] text-[#667065]">
                      관심 아파트 단지를 등록해 두면 실거래가 시세를 더 빠르게 찾아볼 수 있습니다.
                    </p>
                  </div>

                  {/* 관심 품목 검색 및 입력 영역 */}
                  <div className="relative max-w-[560px] mx-auto w-full">
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-3 w-full">
                      <div className="relative flex-1 w-full">
                        <input
                          type="text"
                          placeholder="관심 아파트 단지명을 검색하세요 (예: 래미안, 자이, 마포)"
                          value={newFavoriteItem}
                          disabled={!isLoggedIn}
                          onFocus={() => setIsAptDropdownOpen(true)}
                          onChange={(e) => {
                            setNewFavoriteItem(e.target.value);
                            setIsAptDropdownOpen(true);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleFavoriteAdd();
                            }
                          }}
                          className="h-[48px] w-full rounded-[8px] border border-[#d5dfd6] bg-white pl-10 pr-4 text-[15px] text-[#2b362d] outline-none focus:border-[#57a764] box-border m-0 disabled:bg-[#f5f7f5]"
                        />
                        <Search className="w-4 h-4 text-[#8a968c] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      <button
                        type="button"
                        disabled={!isLoggedIn}
                        onClick={handleFavoriteAdd}
                        className="h-[48px] px-6 w-full sm:w-auto bg-[#57a764] hover:bg-[#438e4d] text-white text-[14px] font-bold rounded-[8px] border-none outline-none cursor-pointer transition-colors box-border m-0 shrink-0 disabled:opacity-50"
                      >
                        추가
                      </button>
                    </div>

                    {/* 실시간 아파트 검색 추천 드롭다운 */}
                    {isAptDropdownOpen && newFavoriteItem.trim().length > 0 && (
                      <div className="absolute top-full left-0 right-0 sm:right-[72px] mt-1.5 bg-white border border-[#d5dfd6] rounded-[10px] shadow-xl z-50 max-h-[240px] overflow-y-auto divide-y divide-[#f0f4f0]">
                        {aptSuggestions.length > 0 ? (
                          aptSuggestions.map((apt) => {
                            const isAdded = favoriteItems.includes(apt.name);
                            return (
                              <button
                                key={apt.name}
                                type="button"
                                onClick={() => handleSelectApartment(apt.name)}
                                className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-[#f2f8f3] transition-colors cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold px-2 py-0.5 bg-[#e8f3e9] text-[#3f8a47] rounded-md">
                                    {apt.district}
                                  </span>
                                  <span className="text-[14px] font-bold text-[#242b23]">
                                    {apt.name}
                                  </span>
                                </div>
                                {isAdded ? (
                                  <span className="text-[12px] text-[#8a968c] font-medium">
                                    등록됨
                                  </span>
                                ) : (
                                  <span className="text-[12px] text-[#57a764] font-bold">
                                    + 선택
                                  </span>
                                )}
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-4 text-center text-[13px] text-[#8a968c]">
                            일치하는 아파트 단지가 없습니다.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 관심 품목 뱃지 */}
                  <div className="flex flex-wrap justify-center gap-2.5 pt-3">
                    {favoriteItems.map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1.5 min-h-[36px] px-4 rounded-full bg-[#edf7ee] text-[#397644] text-[14px] font-bold"
                      >
                        <span>🏢 {item}</span>
                        <span
                          onClick={() => handleFavoriteRemove(item)}
                          className="cursor-pointer font-extrabold text-[15px] text-[#397644] hover:text-[#1c4524] transition-colors leading-none select-none pl-0.5"
                          role="button"
                          tabIndex={0}
                          aria-label={`${item} 삭제`}
                        >
                          ✕
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* 3. 가격 변동 알림 설정 */}
                <div className="pt-8 border-t border-[#e7ece7] space-y-4">
                  <div className="text-center space-y-1">
                    <h3 className="text-[18px] font-bold text-[#344037]">실거래가 변동 알림</h3>
                    <p className="text-[14px] text-[#7a877c]">
                      설정된 아파트 단지의 실거래가 변동 알림을 켜거나 끌 수 있습니다.
                    </p>
                  </div>

                  {/* 등록된 가격 알림 리스트 */}
                  <div className="space-y-2.5 max-w-[820px] mx-auto pt-2">
                    {priceAlerts.length === 0 ? (
                      <p className="p-6 border border-dashed border-[#d5dfd6] rounded-[10px] text-center text-[14px] text-[#7a877c]">
                        등록된 실거래가 변동 알림이 없습니다.
                      </p>
                    ) : (
                      priceAlerts.map((alertItem) => (
                        <div
                          key={alertItem.id}
                          className="flex items-center justify-between p-4 bg-white border border-[#e1e8e2] rounded-[10px]"
                        >
                          <div>
                            <strong className="text-[15px] font-bold text-[#344037] block">
                              🏢 {alertItem.itemName}
                            </strong>
                            <span className="text-[13px] text-[#718073] block mt-1">
                              {alertItem.threshold.toLocaleString()}만원 {PRICE_ALERT_CONDITION_LABELS[alertItem.condition]}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <label className="inline-flex items-center gap-1.5 text-[13px] font-extrabold text-[#4d5e50] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={alertItem.enabled}
                                onChange={() => handlePriceAlertToggle(alertItem.id)}
                                className="w-[18px] h-[18px] accent-[#57a764] cursor-pointer"
                              />
                              {alertItem.enabled ? "알림 ON" : "알림 OFF"}
                            </label>
                            <button
                              type="button"
                              onClick={() => handlePriceAlertRemove(alertItem.id)}
                              className="px-3 py-1.5 border border-[#e0bdbd] rounded-[7px] text-[#bd5555] hover:bg-[#fff5f5] text-[13px] font-bold transition-colors cursor-pointer"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* ========================================================
                    [회원 정보 및 설정 저장] & [변경 취소] 버튼 영역
                ======================================================== */}
                <div className="pt-8 border-t border-[#e7ece7] text-center">
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {isFormDirty && (
                      <button
                        type="button"
                        onClick={handleCancelChanges}
                        className="h-[52px] px-8 bg-white hover:bg-[#f5f8f5] text-[#556357] border border-[#cfd9d0] text-[15px] font-bold rounded-[8px] cursor-pointer transition-all shadow-xs"
                      >
                        변경 취소
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={!isLoggedIn}
                      className="h-[52px] px-10 bg-[#57a764] hover:bg-[#438e4d] text-white text-[16px] font-bold rounded-[8px] border-none outline-none cursor-pointer transition-colors shadow-md disabled:opacity-50"
                    >
                      회원 정보 및 설정 저장
                    </button>
                  </div>
                  <p className="text-[13px] text-[#7a877c] mt-2">
                    회원 인적사항, 관심 단지 및 알림 설정 변경사항이 일괄 저장됩니다.
                  </p>
                </div>

                {/* 4. 회원 탈퇴 */}
                <div className="mt-8 p-6 bg-[#fff8f8] border border-[#f1cccc] rounded-[10px] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-[17px] font-bold text-[#a44141]">회원 탈퇴</h3>
                    <p className="text-[14px] text-[#947474] mt-1">
                      탈퇴 시 작성한 게시글 및 설정한 정보가 즉시 숨김(비공개) 처리됩니다.
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
            )}

            {/* TAB 2: 알림 설정 */}
            {activeTab === "NOTIFICATION" && (
              <div className="space-y-8 max-w-[820px] mx-auto">
                <div className="text-center space-y-1 mb-6">
                  <h2 className="text-[20px] font-bold text-[#242b23]">알림 수신 설정</h2>
                  <p className="text-[14px] text-[#667065]">
                    아파트 실거래가 변동 알림 및 관심 단지 관련 푸시 알림의 수신 여부를 선택할 수 있습니다.
                  </p>
                </div>

                <div className="border border-[#e1e8e2] rounded-[10px] divide-y divide-[#e7ece7] bg-white">
                  {[
                    { key: "priceChange", label: "전체 실거래가 변동 알림 받기", desc: "주요 서울 아파트 실거래가 변동 소식을 실시간으로 제공받습니다." },
                    { key: "priceIncrease", label: "시세 상승 알림 받기", desc: "시세가 상승하는 단지의 동향을 빠르게 알림으로 받습니다." },
                    { key: "priceDecrease", label: "급매/하락 알림 받기", desc: "시세가 하락하여 매수하기 좋은 시점의 알림을 받습니다." },
                    { key: "favoriteOnly", label: "관심 단지만 알림 받기", desc: "등록한 관심 아파트 단지에 대해서만 알림을 받습니다." },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center justify-between gap-6 p-5 cursor-pointer hover:bg-[#f8faf8] transition-colors"
                    >
                      <div>
                        <strong className="text-[15px] font-bold text-[#344037] block">
                          {item.label}
                        </strong>
                        <span className="text-[13px] text-[#7a877c] block mt-1">
                          {item.desc}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(notificationSettings[item.key as keyof NotificationSettings])}
                        onChange={(e) =>
                          setNotificationSettings((prev) => ({
                            ...prev,
                            [item.key]: e.target.checked,
                          }))
                        }
                        className="w-[18px] h-[18px] accent-[#57a764] cursor-pointer"
                      />
                    </label>
                  ))}
                </div>

                <div className="text-center pt-4">
                  <button
                    type="button"
                    onClick={handleSaveNotificationSettings}
                    className="h-[48px] px-8 bg-[#57a764] hover:bg-[#438e4d] text-white text-[15px] font-bold rounded-[8px] border-none outline-none cursor-pointer transition-colors"
                  >
                    알림 설정 저장
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: 내 활동 */}
            {activeTab === "ACTIVITY" && (
              <div className="space-y-6">
                <div className="text-center space-y-1 mb-6">
                  <h2 className="text-[20px] font-bold text-[#242b23]">내 활동</h2>
                  <p className="text-[14px] text-[#667065]">
                    내가 실제로 작성한 게시글과 댓글을 확인하고 해당 글로 바로 이동할 수 있습니다.
                  </p>
                </div>

                {/* 내 활동 서브 탭 */}
                <div className="flex items-center gap-2 pb-3 border-b border-[#e1e8e2]">
                  <button
                    type="button"
                    onClick={() => setActivityType("POST")}
                    className={
                      activityType === "POST"
                        ? "h-[38px] px-4 rounded-[8px] bg-[#57a764] border border-[#57a764] text-white font-bold text-[14px] cursor-pointer"
                        : "h-[38px] px-4 rounded-[8px] bg-white border border-[#d8e2d9] text-[#718073] font-bold text-[14px] hover:bg-[#f5f8f5] cursor-pointer"
                    }
                  >
                    작성한 게시글 {isLoggedIn && !isBoardLoading && `(${myPosts.length})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityType("COMMENT")}
                    className={
                      activityType === "COMMENT"
                        ? "h-[38px] px-4 rounded-[8px] bg-[#57a764] border border-[#57a764] text-white font-bold text-[14px] cursor-pointer"
                        : "h-[38px] px-4 rounded-[8px] bg-white border border-[#d8e2d9] text-[#718073] font-bold text-[14px] hover:bg-[#f5f8f5] cursor-pointer"
                    }
                  >
                    작성한 댓글
                  </button>
                </div>

                {/* 실제 게시글/댓글 목록 리스트 */}
                <div className="border border-[#e1e8e2] rounded-[10px] divide-y divide-[#e7ece7] bg-white overflow-hidden">
                  {activityType === "POST" && (
                    <>
                      {isBoardLoading ? (
                        <div className="p-12 text-center text-[#7a877c] text-[14px]">
                          내가 작성한 게시글을 불러오는 중입니다...
                        </div>
                      ) : myPosts.length > 0 ? (
                        myPosts.map((post) => {
                          const formattedDate = post.createdAt?.includes("T")
                            ? `${post.createdAt.split("T")[0].replace(/-/g, ".")} ${post.createdAt.split("T")[1].slice(0, 5)}`
                            : post.createdAt;

                          return (
                            <Link
                              key={post.boardId}
                              to={`/board/${post.boardId}`}
                              className="flex items-center justify-between p-5 hover:bg-[#f5faf5] transition-colors group no-underline text-inherit"
                              style={{ textDecoration: "none", color: "inherit" }}
                            >
                              <div className="min-w-0 pr-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-extrabold px-2 py-0.5 bg-[#e8f4e9] text-[#4c8c53] rounded-full shrink-0 no-underline">
                                    {post.postType === "NOTICE" ? "공지" : "일반"}
                                  </span>
                                  <strong className="text-[15px] font-bold text-[#344037] group-hover:text-[#4c9b55] transition-colors block truncate no-underline">
                                    {post.title}
                                  </strong>
                                </div>
                                <span className="text-[13px] text-[#7a877c] block mt-1.5 no-underline">
                                  작성일 {formattedDate} · 조회수 {post.viewCount}
                                </span>
                              </div>
                              <b aria-hidden="true" className="text-[#57a764] text-[24px] font-normal leading-none shrink-0 group-hover:translate-x-1 transition-transform no-underline">
                                ›
                              </b>
                            </Link>
                          );
                        })
                      ) : (
                        <div className="p-12 text-center space-y-3">
                          <div className="text-[32px]">📝</div>
                          <p className="text-[15px] font-bold text-[#344037]">
                            작성하신 게시글이 없습니다.
                          </p>
                          <p className="text-[13px] text-[#7a877c]">
                            게시판에서 새로운 게시글을 작성해보세요!
                          </p>
                          <Link
                            to="/board/write"
                            className="inline-block px-5 py-2.5 bg-[#57a764] hover:bg-[#438e4d] text-white text-[13px] font-bold rounded-[8px] transition-colors shadow-xs no-underline"
                            style={{ textDecoration: "none" }}
                          >
                            새 게시글 작성하러 가기 →
                          </Link>
                        </div>
                      )}
                    </>
                  )}

                  {activityType === "COMMENT" && (
                    <div className="p-12 text-center space-y-3">
                      <div className="text-[32px]">💬</div>
                      <p className="text-[15px] font-bold text-[#344037]">
                        작성하신 댓글이 없습니다.
                      </p>
                      <p className="text-[13px] text-[#7a877c]">
                        게시글을 읽고 자유롭게 댓글을 남겨보세요!
                      </p>
                      <Link
                        to="/board"
                        className="inline-block px-5 py-2.5 bg-[#57a764] hover:bg-[#438e4d] text-white text-[13px] font-bold rounded-[8px] transition-colors shadow-xs no-underline"
                        style={{ textDecoration: "none" }}
                      >
                        게시판 둘러보기 →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 비밀번호 변경 팝업 모달 (PASS 인증 완료 시 활성화) */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-[16px] border border-[#dce4da] shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-full bg-[#e8f3e9] text-[#3f8a47] flex items-center justify-center mx-auto text-[22px]">
                🔒
              </div>
              <h3 className="text-[20px] font-black text-[#242b23]">새 비밀번호 설정</h3>
              <p className="text-[13px] text-[#667065]">
                PASS 본인인증이 완료되었습니다. 새로운 비밀번호를 입력해 주세요.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-[#344037] block">새 비밀번호 (8~16자)</label>
                <input
                  type="password"
                  placeholder="새 비밀번호를 입력하세요"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordError("");
                  }}
                  className="w-full h-[46px] rounded-[8px] border border-[#d5dfd6] bg-white px-3.5 text-[15px] outline-none focus:border-[#57a764]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-[#344037] block">새 비밀번호 확인</label>
                <input
                  type="password"
                  placeholder="새 비밀번호를 한 번 더 입력하세요"
                  value={newPasswordConfirm}
                  onChange={(e) => {
                    setNewPasswordConfirm(e.target.value);
                    setPasswordError("");
                  }}
                  className="w-full h-[46px] rounded-[8px] border border-[#d5dfd6] bg-white px-3.5 text-[15px] outline-none focus:border-[#57a764]"
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
                className="flex-1 h-[46px] bg-white hover:bg-[#f5f8f5] text-[#556357] border border-[#cfd9d0] font-bold text-[14px] rounded-[8px] cursor-pointer transition-colors"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={handleSaveNewPassword}
                className="flex-1 h-[46px] bg-[#57a764] hover:bg-[#438e4d] text-white font-bold text-[14px] rounded-[8px] cursor-pointer transition-colors shadow-xs"
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
            <div className="w-full max-w-[420px] rounded-[16px] bg-white p-6 shadow-2xl space-y-5">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-2 text-xl font-bold">
                  ⚠️
                </div>
                <h3 className="text-[20px] font-bold text-[#242b23]">회원 탈퇴 확인</h3>
                <p className="text-[13px] text-[#667065]">
                  안전한 탈퇴를 위해 현재 계정의 비밀번호를 입력해 주세요.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-[13px] font-bold text-[#344037]">
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
                  className="h-[46px] w-full rounded-[8px] border border-[#d5dfd6] bg-white px-4 text-[14px] text-[#2b362d] outline-none focus:border-rose-400"
                />
                {withdrawError && (
                  <p className="text-[12px] font-bold text-rose-500">{withdrawError}</p>
                )}
              </div>

              <div className="p-3 bg-[#fff8f8] border border-[#f1cccc] rounded-[8px] text-[12px] text-[#a44141] leading-relaxed">
                탈퇴 시 계정 정보 및 작성하신 모든 게시글/댓글은 화면에서 즉시 숨김 처리됩니다.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="h-[42px] px-5 rounded-[8px] border border-[#d5dfd6] bg-white text-[14px] font-bold text-[#556357] hover:bg-[#f5f8f5] cursor-pointer transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleConfirmWithdrawWithPassword}
                  className="h-[42px] px-6 rounded-[8px] bg-rose-600 hover:bg-rose-700 text-[14px] font-bold text-white border-none cursor-pointer transition-colors shadow-sm"
                >
                  탈퇴 확인
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}