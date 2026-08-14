import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { isLogin } from "@/features/auth/utils/auth";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { CheckCircle2 } from "lucide-react";
import PassAuth from "@/features/auth/components/PassAuth";
import { getBoardPostsApi, getBoardCommentsApi } from "@/api/api";
import apiMiddleware from "@/api/middleware";
import { getStoredReports, REPORT_STATUS_MAP } from "@/features/report/services/reportService";

/**
 * 마이페이지 상단 선택 탭
 */
type MyPageTab = "PROFILE" | "ACTIVITY";

/**
 * 내 활동 서브 탭
 */
type ActivityType = "POST" | "COMMENT" | "INQUIRY";

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

function isMyPageTab(value: string | null): value is MyPageTab {
  return value === "PROFILE" || value === "ACTIVITY";
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
  profile: Profile;
  preferredDistrict: string;
  favoriteItems?: string[];
  notificationSettings?: Record<string, boolean>;
  priceAlerts?: unknown[];
};

const DEFAULT_PROFILE: Profile = {
  loginType: "LOCAL",
  name: "",
  userId: "",
  phone: "",
  email: "",
  address: "",
  detailAddress: "",
};

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
      const storedProvider =
        (typeof sessionStorage !== "undefined" && sessionStorage.getItem("social_provider")) ||
        (typeof localStorage !== "undefined" && localStorage.getItem("social_provider"));
      const isSocial =
        Boolean(storedProvider) ||
        authUser.userId?.toLowerCase().startsWith("kakao_") ||
        authUser.userId?.toLowerCase().includes("kakao") ||
        authUser.userId?.toLowerCase().startsWith("google_") ||
        authUser.userId?.toLowerCase().includes("google") ||
        authUser.userId?.toLowerCase().startsWith("naver_") ||
        authUser.userId?.toLowerCase().includes("naver") ||
        authUser.userId?.startsWith("enc:v1:");
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
    const saved = getStoredMyPageSettings();
    return saved?.preferredDistrict ?? "";
  });

  // 원본 스냅샷 (변경 취소 시 복구할 기준 데이터)
  const [originalProfile, setOriginalProfile] = useState<Profile>(profile);
  const [originalDistrict, setOriginalDistrict] = useState<string>(preferredDistrict);

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
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const [emailVerified, setEmailVerified] = useState(false);
  const [emailCertSent, setEmailCertSent] = useState(false);
  const [emailCertCode, setEmailCertCode] = useState("");

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

  // 실제 탈퇴 처리 로직 (백엔드 DELETE /api/members/me 연동)
  const executeWithdrawal = async (password?: string) => {
    setIsWithdrawing(true);
    setWithdrawError("");
    try {
      const now = new Date().toISOString();
      await apiMiddleware.delete("/api/members/me", {
        data: {
          password: password || "",
          deletedAt: now,
        },
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

  const { register, handleSubmit, setValue, reset, watch } = useForm<Profile>({
    defaultValues: profile,
  });

  const formValues = watch();
  const emailValue = watch("email") || "";
  const isEmailValid = useMemo(() => {
    return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(emailValue.trim());
  }, [emailValue]);

  // 소셜 로그인 감지 및 공급자명 판별
  const rawUserId = authUser?.userId || profile.userId || "";
  const getSocialProviderName = (id: string, type: string) => {
    const fromStorage =
      (typeof sessionStorage !== "undefined" && sessionStorage.getItem("social_provider")) ||
      (typeof localStorage !== "undefined" && localStorage.getItem("social_provider"));
    if (fromStorage) return fromStorage;

    const lower = (id || "").toLowerCase();
    if (lower.startsWith("google_") || lower.includes("google")) return "구글";
    if (lower.startsWith("kakao_") || lower.includes("kakao")) return "카카오";
    if (lower.startsWith("naver_") || lower.includes("naver")) return "네이버";
    if (type === "SOCIAL") return "구글";
    if (rawUserId.startsWith("enc:v1:")) return "구글";
    return "";
  };

  const socialProvider = getSocialProviderName(rawUserId, profile.loginType);
  const isSocialUser =
    Boolean(socialProvider) ||
    profile.loginType === "SOCIAL" ||
    rawUserId.toLowerCase().startsWith("kakao_") ||
    rawUserId.toLowerCase().startsWith("google_") ||
    rawUserId.toLowerCase().startsWith("naver_") ||
    rawUserId.toLowerCase().includes("kakao") ||
    rawUserId.toLowerCase().includes("google") ||
    rawUserId.toLowerCase().includes("naver") ||
    rawUserId.startsWith("enc:v1:");

  // authUser 변경 시 해당 사용자 고유의 프로필 및 설정 동기화
  useEffect(() => {
    if (authUser?.userId) {
      const storedProvider =
        (typeof sessionStorage !== "undefined" && sessionStorage.getItem("social_provider")) ||
        (typeof localStorage !== "undefined" && localStorage.getItem("social_provider"));
      const isSocial =
        Boolean(storedProvider) ||
        authUser.userId?.toLowerCase().startsWith("kakao_") ||
        authUser.userId?.toLowerCase().includes("kakao") ||
        authUser.userId?.toLowerCase().startsWith("google_") ||
        authUser.userId?.toLowerCase().includes("google") ||
        authUser.userId?.toLowerCase().startsWith("naver_") ||
        authUser.userId?.toLowerCase().includes("naver") ||
        authUser.userId?.startsWith("enc:v1:");

      const saved = getStoredMyPageSettings(authUser.userId);
      const resolvedName = sanitizePlainText(authUser.name) || sanitizePlainText(saved?.profile?.name);
      const resolvedUserId = sanitizePlainText(authUser.userId) || sanitizePlainText(saved?.profile?.userId);

      const nextProfile: Profile = {
        ...DEFAULT_PROFILE,
        ...(saved?.profile || {}),
        name: resolvedName,
        userId: resolvedUserId,
        loginType: isSocial ? "SOCIAL" : "LOCAL",
      };

      const nextDistrict = saved?.preferredDistrict ?? "";

      setProfile(nextProfile);
      setOriginalProfile(nextProfile);
      reset(nextProfile);

      setPreferredDistrict(nextDistrict);
      setOriginalDistrict(nextDistrict);
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

    return boardData.items.filter((item: any) => {
      const author = (item.authorName || item.writer || item.author || "").trim().toLowerCase();
      return (currentName && author === currentName) || (currentId && author === currentId);
    });
  }, [boardData, authUser]);

  // 내가 작성한 댓글 조회 & 필터링
  const [myComments, setMyComments] = useState<
    Array<{
      commentId: number;
      boardId: number;
      boardTitle: string;
      content: string;
      createdAt: string;
    }>
  >([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || !authUser || !boardData?.items || boardData.items.length === 0) {
      setMyComments([]);
      return;
    }

    let isMounted = true;
    setIsCommentsLoading(true);

    const currentName = (authUser.name || "").trim().toLowerCase();
    const currentId = (authUser.userId || "").trim().toLowerCase();

    // 상위 최근 게시글들에 대해 댓글을 병렬 조회하여 내가 작성한 댓글 추출
    Promise.all(
      boardData.items.slice(0, 30).map(async (post) => {
        try {
          const comments = await getBoardCommentsApi(post.boardId);
          if (!Array.isArray(comments)) return [];

          return comments
            .filter((c: any) => {
              const cAuthorName = (
                c.writerName ||
                c.name ||
                ""
              )
                .trim()
                .toLowerCase();
              const cAuthorId = String(c.writerId || "")
                .trim()
                .toLowerCase();

              return (
                (currentId && cAuthorId === currentId) ||
                (currentName && cAuthorName === currentName) ||
                (currentId && cAuthorName === currentId)
              );
            })
            .map((c: any) => ({
              commentId: c.id || 0,
              boardId: post.boardId,
              boardTitle: post.title,
              content: c.content || "",
              createdAt: c.createdAt || "",
            }));
        } catch {
          return [];
        }
      })
    )
      .then((results) => {
        if (isMounted) {
          const flat = results.flat().sort((a, b) => (b.commentId || 0) - (a.commentId || 0));
          setMyComments(flat);
          setIsCommentsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsCommentsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isLoggedIn, authUser, boardData]);

  // 내가 작성한 문의사항 조회 & 필터링
  const myInquiries = (() => {
    if (!isLoggedIn || !authUser) return [];
    const allReports = getStoredReports();
    const currentName = (authUser.name || "").trim().toLowerCase();
    const currentId = (authUser.userId || "").trim().toLowerCase();

    return allReports.filter((r) => {
      const authorUserId = (r.authorUserId || "").trim().toLowerCase();
      const authorName = (r.authorName || "").trim().toLowerCase();
      return (
        (currentId && authorUserId === currentId) ||
        (currentName && (authorName === currentName || authorName.startsWith(currentName.slice(0, 1))))
      );
    });
  })();

  // 폼이 수정되었는지 여부 계산 (Dirty check)
  const isFormDirty = useMemo(() => {
    const isProfileChanged =
      (formValues.name ?? "") !== (originalProfile.name ?? "") ||
      (formValues.phone ?? "") !== (originalProfile.phone ?? "") ||
      (formValues.email ?? "") !== (originalProfile.email ?? "") ||
      (formValues.address ?? "") !== (originalProfile.address ?? "") ||
      (formValues.detailAddress ?? "") !== (originalProfile.detailAddress ?? "");

    const isDistrictChanged = preferredDistrict !== originalDistrict;
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
  ]);

  // [변경 취소] 버튼 클릭 핸들러
  const handleCancelChanges = () => {
    reset(originalProfile);
    setProfile(originalProfile);
    setPreferredDistrict(originalDistrict);
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

    if (authUser) {
      useAuthStore.getState().setUser({
        ...authUser,
        name:
          updatedProfile.name && !updatedProfile.name.startsWith("enc:v1:")
            ? updatedProfile.name
            : authUser.name,
        myGu: preferredDistrict || null,
      });
    }

    const previousSettings = getStoredMyPageSettings(
      authUser?.userId || profile.userId,
    );
    const settingsToSave: MyPageSettings = {
      ...previousSettings,
      profile: updatedProfile,
      preferredDistrict,
    };
    const userKey = getStorageKey(authUser?.userId || profile.userId);
    localStorage.setItem(userKey, JSON.stringify(settingsToSave));

    alert("회원 정보 및 설정이 성공적으로 저장되었습니다!");
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
  };

  // 이메일 인증 발송 및 검증
  const handleSendEmailCert = () => {
    if (!isLoggedIn) return alert("로그인 후 인증이 가능합니다.");
    const emailVal = (watch("email") || "").trim();
    if (!emailVal) {
      alert("이메일 주소를 먼저 입력해 주세요.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailVal)) {
      alert("올바른 이메일 형식(예: user@example.com)으로 입력해 주세요.");
      return;
    }
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


  return (
    <div className="min-h-screen bg-[#F5FAFC]">
      <div className="py-12 px-5 sm:px-8">
        <div className="max-w-[1000px] mx-auto space-y-8">
          {/* 헤더 */}
          <div className="text-center space-y-2 mb-8">
            <span className="inline-block px-3 py-1 bg-[#E6F4F2] text-[#0F766E] text-[11px] font-extrabold tracking-wider rounded-full uppercase">
              SSABU CUSTOMER CENTER
            </span>
            <h1 className="text-[36px] font-black text-[#123047] tracking-tight">
              마이페이지
            </h1>
            <p className="text-[15px] text-[#667065]">
              회원 정보 및 내 활동 내역을 한곳에서 관리합니다.
            </p>
          </div>

          {/* 메인 탭 */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2 p-1.5 bg-white rounded-[10px] border border-[#DCE8ED] shadow-sm">
              <button
                type="button"
                onClick={() => handleTabChange("PROFILE")}
                className={`py-2.5 px-6 text-[14px] font-bold rounded-[8px] transition-all cursor-pointer ${
                  activeTab === "PROFILE"
                    ? "bg-[#123047] text-white shadow-xs"
                    : "text-[#6B7280] hover:bg-[#F0F7FA]"
                }`}
              >
                내 정보 관리
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("ACTIVITY")}
                className={`py-2.5 px-6 text-[14px] font-bold rounded-[8px] transition-all cursor-pointer ${
                  activeTab === "ACTIVITY"
                    ? "bg-[#123047] text-white shadow-xs"
                    : "text-[#6B7280] hover:bg-[#F0F7FA]"
                }`}
              >
                내 활동
              </button>
            </div>
          </div>

          {/* 메인 카드 컨테이너 */}
          <div className="bg-white border border-[#DCE8ED] rounded-[12px] p-8 md:p-10 shadow-xs">
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
                      회원님의 필수 인적사항과 휴대폰 및 이메일 인증을 진행하실 수 있습니다.
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
                          phone={watch("phone")}
                          onSuccess={handlePassSuccess}
                          className="h-[48px] px-5 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white font-bold text-[14px] rounded-[8px] cursor-pointer whitespace-nowrap transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs shrink-0"
                        />
                      </div>
                      <p className="text-[12px] text-[#6B7280]">
                        휴대폰 번호는 직접 입력할 수 없으며, 우측 [인증하기]를 진행하면 실제 인증 번호가 자동 입력됩니다.
                      </p>
                    </div>

                    {/* ROW 4: 이메일 주소 + 이메일 인증 버튼 */}
                    <div className="space-y-1.5 w-full">
                      <div className="flex items-center justify-between">
                        <label className="text-[14px] font-bold text-[#13202B] block">이메일 주소</label>
                        {emailVerified && (
                          <span className="inline-flex items-center gap-1 text-[12px] font-extrabold text-[#0F766E]">
                            <CheckCircle2 className="w-4 h-4" /> 인증 완료
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          {...register("email")}
                          disabled={!isLoggedIn}
                          placeholder="이메일 주소를 입력해 주세요 (예: user@example.com)"
                          className="flex-1 h-[48px] rounded-[8px] border border-[#DCE8ED] bg-white px-3.5 text-[15px] text-[#13202B] outline-none focus:border-[#0F8AA8] disabled:bg-[#F0F7FA]"
                        />
                        <button
                          type="button"
                          disabled={!isLoggedIn || emailVerified || !isEmailValid}
                          onClick={handleSendEmailCert}
                          className="h-[48px] px-5 bg-[#123047] hover:bg-[#0B5E73] text-white font-bold text-[13px] rounded-[8px] whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
                            className="flex-1 h-[42px] rounded-[6px] border border-[#0F8AA8] bg-white px-3 text-[14px] outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyEmailCode}
                            className="h-[42px] px-4 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white font-bold text-[13px] rounded-[6px] cursor-pointer"
                          >
                            인증 확인
                          </button>
                        </div>
                      )}
                    </div>

                    {/* ROW 5: 기본 주소 & 상세 주소 */}
                    <div className="flex flex-col md:flex-row gap-4 w-full">
                      <div className="space-y-1.5 flex-1 w-full md:w-1/2">
                        <label className="text-[14px] font-bold text-[#13202B] block">기본 주소</label>
                        <input
                          {...register("address")}
                          disabled={!isLoggedIn}
                          placeholder="기본 주소를 입력해 주세요"
                          className="w-full h-[48px] rounded-[8px] border border-[#DCE8ED] bg-white px-3.5 text-[15px] text-[#13202B] outline-none focus:border-[#0F8AA8] box-border m-0 disabled:bg-[#F0F7FA]"
                        />
                      </div>

                      <div className="space-y-1.5 flex-1 w-full md:w-1/2">
                        <label className="text-[14px] font-bold text-[#13202B] block">상세 주소</label>
                        <input
                          {...register("detailAddress")}
                          disabled={!isLoggedIn}
                          placeholder="상세 주소(동, 호수 등)를 입력해 주세요"
                          className="w-full h-[48px] rounded-[8px] border border-[#DCE8ED] bg-white px-3.5 text-[15px] text-[#13202B] outline-none focus:border-[#0F8AA8] box-border m-0 disabled:bg-[#F0F7FA]"
                        />
                      </div>
                    </div>

                    {/* ROW 6: 선호 지역 설정 */}
                    <div className="space-y-1.5 w-full">
                      <label className="text-[14px] font-bold text-[#13202B] block">선호 지역 설정</label>
                      <select
                        value={preferredDistrict}
                        disabled={!isLoggedIn}
                        onChange={(e) => setPreferredDistrict(e.target.value)}
                        className={`w-full h-[48px] rounded-[8px] border border-[#DCE8ED] bg-white px-3.5 text-[15px] outline-none focus:border-[#0F8AA8] box-border m-0 disabled:bg-[#F0F7FA] ${
                          !preferredDistrict ? "text-[#9CA3AF]" : "text-[#13202B]"
                        }`}
                      >
                        <option value="" disabled className="text-gray-400">
                          선호지역을 설정해 주세요
                        </option>
                        {SEOUL_DISTRICTS.map((district) => (
                          <option key={district} value={district} className="text-[#13202B]">
                            {district}
                          </option>
                        ))}
                      </select>
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
                      disabled={!isLoggedIn}
                      className="h-[52px] px-10 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[16px] font-bold rounded-[8px] border-none outline-none cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                    >
                      회원 정보 저장
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
            )}

            {/* TAB 2: 내 활동 */}
            {activeTab === "ACTIVITY" && (
              <div className="space-y-6">
                <div className="text-center space-y-1 mb-6">
                  <h2 className="text-[20px] font-bold text-[#123047]">내 활동</h2>
                  <p className="text-[14px] text-[#6B7280]">
                    내가 실제로 작성한 게시글, 댓글 및 문의사항 현황을 확인하고 바로 이동할 수 있습니다.
                  </p>
                </div>

                {/* 내 활동 서브 탭 */}
                <div className="flex items-center gap-2 pb-3 border-b border-[#DCE8ED] overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActivityType("POST")}
                    className={
                      activityType === "POST"
                        ? "h-[38px] px-4 rounded-[8px] bg-[#0F8AA8] border border-[#0F8AA8] text-white font-bold text-[14px] cursor-pointer shrink-0"
                        : "h-[38px] px-4 rounded-[8px] bg-white border border-[#DCE8ED] text-[#6B7280] font-bold text-[14px] hover:bg-[#F0F7FA] cursor-pointer shrink-0"
                    }
                  >
                    작성한 게시글 {isLoggedIn && !isBoardLoading && `(${myPosts.length})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityType("COMMENT")}
                    className={
                      activityType === "COMMENT"
                        ? "h-[38px] px-4 rounded-[8px] bg-[#0F8AA8] border border-[#0F8AA8] text-white font-bold text-[14px] cursor-pointer shrink-0"
                        : "h-[38px] px-4 rounded-[8px] bg-white border border-[#DCE8ED] text-[#6B7280] font-bold text-[14px] hover:bg-[#F0F7FA] cursor-pointer shrink-0"
                    }
                  >
                    작성한 댓글 {isLoggedIn && !isCommentsLoading && `(${myComments.length})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityType("INQUIRY")}
                    className={
                      activityType === "INQUIRY"
                        ? "h-[38px] px-4 rounded-[8px] bg-[#0F8AA8] border border-[#0F8AA8] text-white font-bold text-[14px] cursor-pointer shrink-0"
                        : "h-[38px] px-4 rounded-[8px] bg-white border border-[#DCE8ED] text-[#6B7280] font-bold text-[14px] hover:bg-[#F0F7FA] cursor-pointer shrink-0"
                    }
                  >
                    문의사항 {isLoggedIn && `(${myInquiries.length})`}
                  </button>
                </div>

                {/* 실제 게시글/댓글 목록 리스트 */}
                <div className="border border-[#DCE8ED] rounded-[10px] divide-y divide-[#DCE8ED] bg-white overflow-hidden">
                  {activityType === "POST" && (
                    <>
                      {isBoardLoading ? (
                        <div className="p-12 text-center text-[#6B7280] text-[14px]">
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
                              className="flex items-center justify-between p-5 hover:bg-[#F0F7FA] transition-colors group no-underline text-inherit"
                              style={{ textDecoration: "none", color: "inherit" }}
                            >
                              <div className="min-w-0 pr-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-extrabold px-2 py-0.5 bg-[#E6F4F2] text-[#0F766E] rounded-full shrink-0 no-underline">
                                    {post.postType === "NOTICE" ? "공지" : "일반"}
                                  </span>
                                  <strong className="text-[15px] font-bold text-[#123047] group-hover:text-[#0F8AA8] transition-colors block truncate no-underline">
                                    {post.title}
                                  </strong>
                                </div>
                                <span className="text-[13px] text-[#6B7280] block mt-1.5 no-underline">
                                  작성일 {formattedDate} · 조회수 {post.viewCount}
                                </span>
                              </div>
                              <b aria-hidden="true" className="text-[#0F8AA8] text-[24px] font-normal leading-none shrink-0 group-hover:translate-x-1 transition-transform no-underline">
                                ›
                              </b>
                            </Link>
                          );
                        })
                      ) : (
                        <div className="p-12 text-center space-y-3">
                          <div className="text-[32px]">📝</div>
                          <p className="text-[15px] font-bold text-[#123047]">
                            작성하신 게시글이 없습니다.
                          </p>
                          <p className="text-[13px] text-[#6B7280]">
                            게시판에서 새로운 게시글을 작성해보세요!
                          </p>
                          <Link
                            to="/board/write"
                            className="inline-block px-5 py-2.5 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[13px] font-bold rounded-[8px] transition-colors shadow-xs no-underline"
                            style={{ textDecoration: "none" }}
                          >
                            새 게시글 작성하러 가기 →
                          </Link>
                        </div>
                      )}
                    </>
                  )}

                  {activityType === "COMMENT" && (
                    <>
                      {isCommentsLoading ? (
                        <div className="p-12 text-center text-[#6B7280] text-[14px]">
                          내가 작성한 댓글을 불러오는 중입니다...
                        </div>
                      ) : myComments.length > 0 ? (
                        myComments.map((comment) => {
                          const formattedDate = comment.createdAt?.includes("T")
                            ? `${comment.createdAt.split("T")[0].replace(/-/g, ".")} ${comment.createdAt.split("T")[1].slice(0, 5)}`
                            : comment.createdAt || "-";

                          return (
                            <Link
                              key={`${comment.boardId}-${comment.commentId}`}
                              to={`/board/${comment.boardId}`}
                              className="flex items-center justify-between p-5 hover:bg-[#F0F7FA] transition-colors group no-underline text-inherit"
                              style={{ textDecoration: "none", color: "inherit" }}
                            >
                              <div className="min-w-0 pr-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-extrabold px-2 py-0.5 bg-[#E6F4F2] text-[#0F766E] rounded-full shrink-0 no-underline">
                                    댓글
                                  </span>
                                  <strong className="text-[15px] font-bold text-[#123047] group-hover:text-[#0F8AA8] transition-colors block truncate no-underline">
                                    {comment.content}
                                  </strong>
                                </div>
                                <span className="text-[13px] text-[#6B7280] block mt-1.5 no-underline">
                                  원문 글: {comment.boardTitle} · 작성일 {formattedDate}
                                </span>
                              </div>
                              <b aria-hidden="true" className="text-[#0F8AA8] text-[24px] font-normal leading-none shrink-0 group-hover:translate-x-1 transition-transform no-underline">
                                ›
                              </b>
                            </Link>
                          );
                        })
                      ) : (
                        <div className="p-12 text-center space-y-3">
                          <div className="text-[32px]">💬</div>
                          <p className="text-[15px] font-bold text-[#123047]">
                            작성하신 댓글이 없습니다.
                          </p>
                          <p className="text-[13px] text-[#6B7280]">
                            게시글을 읽고 자유롭게 댓글을 남겨보세요!
                          </p>
                          <Link
                            to="/board"
                            className="inline-block px-5 py-2.5 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[13px] font-bold rounded-[8px] transition-colors shadow-xs no-underline"
                            style={{ textDecoration: "none" }}
                          >
                            게시판 둘러보기 →
                          </Link>
                        </div>
                      )}
                    </>
                  )}

                  {activityType === "INQUIRY" && (
                    <>
                      {myInquiries.length > 0 ? (
                        myInquiries.map((inquiry) => {
                          const statusMeta = REPORT_STATUS_MAP[inquiry.status] || {
                            label: "접수대기",
                            bg: "bg-[#fff8e6]",
                            text: "text-[#b47500]",
                            border: "border-[#fae3a8]",
                          };

                          return (
                            <Link
                              key={inquiry.id}
                              to={`/report/${inquiry.id}`}
                              className="flex items-center justify-between p-5 hover:bg-[#F0F7FA] transition-colors group no-underline text-inherit"
                              style={{ textDecoration: "none", color: "inherit" }}
                            >
                              <div className="min-w-0 pr-4">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
                                  >
                                    {statusMeta.label}
                                  </span>
                                  <strong className="text-[15px] font-bold text-[#123047] group-hover:text-[#0F8AA8] transition-colors block truncate no-underline">
                                    {inquiry.title}
                                  </strong>
                                </div>
                                <span className="text-[13px] text-[#6B7280] block mt-1.5 no-underline">
                                  접수일 {inquiry.createdAt} · 대상: {inquiry.targetProperty}
                                </span>
                              </div>
                              <b
                                aria-hidden="true"
                                className="text-[#0F8AA8] text-[24px] font-normal leading-none shrink-0 group-hover:translate-x-1 transition-transform no-underline"
                              >
                                ›
                              </b>
                            </Link>
                          );
                        })
                      ) : (
                        <div className="p-12 text-center space-y-3">
                          <div className="text-[32px]">🙋</div>
                          <p className="text-[15px] font-bold text-[#123047]">
                            등록하신 문의사항이 없습니다.
                          </p>
                          <p className="text-[13px] text-[#6B7280]">
                            궁금한 점이나 건의사항이 있으시면 언제든 문의를 남겨주세요!
                          </p>
                          <Link
                            to="/report/write"
                            className="inline-block px-5 py-2.5 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[13px] font-bold rounded-[8px] transition-colors shadow-xs no-underline"
                            style={{ textDecoration: "none" }}
                          >
                            문의사항 작성하러 가기 →
                          </Link>
                        </div>
                      )}
                    </>
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
