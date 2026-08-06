import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";

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

const INITIAL_FAVORITE_ITEMS = ["사과", "배추", "쌀"];
const MY_PAGE_STORAGE_KEY = "myPageSettings";

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
  detailAddress: "싸농아파트 101동 1001호",
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
  { id: 1, itemName: "쌀", condition: "PRICE_BELOW", threshold: 4700, enabled: true },
  { id: 2, itemName: "배추", condition: "RATE_DOWN", threshold: 10, enabled: true },
];

const SEOUL_DISTRICTS = [
  "강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구",
  "노원구", "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구",
  "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구",
];

function getStoredMyPageSettings(): MyPageSettings | null {
  const saved = localStorage.getItem(MY_PAGE_STORAGE_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as MyPageSettings;
  } catch {
    return null;
  }
}

const MOCK_MY_POSTS = [
  { id: 13, title: "가격 예측 기능 의견", createdAt: "2026.07.30", viewCount: 17 },
  { id: 11, title: "가격 데이터 기준 문의", createdAt: "2026.07.29", viewCount: 23 },
  { id: 9, title: "검색 결과 정렬 문의", createdAt: "2026.07.28", viewCount: 10 },
];

const MOCK_MY_COMMENTS = [
  { id: 3, postId: 15, content: "좋은 정보 감사합니다. 다음 업데이트도 기대할게요.", postTitle: "농수산물 가격정보 서비스 오픈 안내", createdAt: "2026.08.04" },
  { id: 2, postId: 14, content: "우리 동네 가격 비교 기능을 자주 사용하고 있습니다.", postTitle: "자치구별 가격 비교 이용 안내", createdAt: "2026.08.03" },
  { id: 1, postId: 13, content: "가격 기준일이 궁금했는데 도움이 되었습니다.", postTitle: "가격정보 조회 기준 안내", createdAt: "2026.08.01" },
];

export default function MyPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabValue = searchParams.get("tab");
  const activeTab: MyPageTab = isMyPageTab(tabValue) ? tabValue : "PROFILE";

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

  const [profile, setProfile] = useState<Profile>(() => {
    const saved = getStoredMyPageSettings();
    return saved?.profile ? { ...DEFAULT_PROFILE, ...saved.profile } : DEFAULT_PROFILE;
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

  const [newPriceAlertItemName, setNewPriceAlertItemName] = useState("");
  const [newPriceAlertCondition, setNewPriceAlertCondition] = useState<PriceAlertCondition>("PRICE_BELOW");
  const [newPriceAlertThreshold, setNewPriceAlertThreshold] = useState("");

  useEffect(() => {
    const settingsToSave: MyPageSettings = {
      profile,
      favoriteItems,
      preferredDistrict,
      notificationSettings,
      priceAlerts,
    };
    localStorage.setItem(MY_PAGE_STORAGE_KEY, JSON.stringify(settingsToSave));
  }, [profile, favoriteItems, preferredDistrict, notificationSettings, priceAlerts]);

  const { register, handleSubmit } = useForm<Profile>({
    defaultValues: profile,
  });

  const onProfileSubmit = (data: Profile) => {
    setProfile(data);
    alert("내 정보가 저장되었습니다.");
  };

  const handleFavoriteAdd = () => {
    const item = newFavoriteItem.trim();
    if (!item) return alert("관심 품목을 입력해 주세요.");
    if (favoriteItems.includes(item)) return alert("이미 등록된 관심 품목입니다.");
    setFavoriteItems((prev) => [...prev, item]);
    setNewFavoriteItem("");
  };

  const handleFavoriteRemove = (target: string) => {
    setFavoriteItems((prev) => prev.filter((i) => i !== target));
  };

  const handlePriceAlertAdd = () => {
    const itemName = newPriceAlertItemName.trim();
    const threshold = Number(newPriceAlertThreshold);
    if (!itemName) return alert("알림을 받을 품목명을 입력해 주세요.");
    if (!threshold || threshold <= 0) return alert("가격 또는 등락률은 0보다 큰 숫자로 입력해 주세요.");

    const nextId = priceAlerts.length === 0 ? 1 : Math.max(...priceAlerts.map((a) => a.id)) + 1;
    setPriceAlerts((prev) => [
      ...prev,
      { id: nextId, itemName, condition: newPriceAlertCondition, threshold, enabled: true },
    ]);
    setNewPriceAlertItemName("");
    setNewPriceAlertThreshold("");
  };

  const handlePriceAlertToggle = (id: number) => {
    setPriceAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
  };

  const handlePriceAlertRemove = (id: number) => {
    setPriceAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const isSocialUser = profile.loginType === "SOCIAL";

  return (
    <div className="min-h-screen bg-[#fafcf9] py-12 px-5 sm:px-8">
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
            회원 정보와 서비스 알림 설정을 관리할 수 있습니다.
          </p>
        </div>

        {/* 메인 탭 */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 p-1.5 bg-white rounded-[10px] border border-[#dce4da] shadow-sm">
            <button
              onClick={() => handleTabChange("PROFILE")}
              className={`py-2.5 px-6 text-[14px] font-bold rounded-[8px] transition-all ${
                activeTab === "PROFILE"
                  ? "bg-[#57a764] text-white shadow-sm"
                  : "text-[#526055] hover:bg-[#f5f8f5]"
              }`}
            >
              내 정보
            </button>
            <button
              onClick={() => handleTabChange("NOTIFICATION")}
              className={`py-2.5 px-6 text-[14px] font-bold rounded-[8px] transition-all ${
                activeTab === "NOTIFICATION"
                  ? "bg-[#57a764] text-white shadow-sm"
                  : "text-[#526055] hover:bg-[#f5f8f5]"
              }`}
            >
              알림 설정
            </button>
            <button
              onClick={() => handleTabChange("ACTIVITY")}
              className={`py-2.5 px-6 text-[14px] font-bold rounded-[8px] transition-all ${
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
            <div className="space-y-10">
              {/* 소셜 회원 뱃지 */}
              {isSocialUser && (
                <div className="p-4 bg-[#eef6ee] border border-[#d3e6d5] rounded-[8px] text-[14px] text-[#3b7746] font-semibold">
                  카카오 소셜 로그인 회원입니다. 이메일과 전화번호는 소셜 계정 정보와 연동됩니다.
                </div>
              )}

              {/* 1. 관심 품목 설정 */}
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <h2 className="text-[20px] font-bold text-[#242b23]">관심 품목</h2>
                  <p className="text-[14px] text-[#667065]">
                    관심 품목을 등록해 두면 가격 정보를 더 빠르게 찾아볼 수 있습니다.
                  </p>
                </div>

                {/* 관심 품목 입력 영역 */}
                <div className="flex flex-col sm:flex-row justify-center items-center gap-3 max-w-[560px] mx-auto w-full">
                  <input
                    type="text"
                    placeholder="관심 품목 이름을 입력해 주세요. (예: 배추, 사과, 오징어)"
                    value={newFavoriteItem}
                    onChange={(e) => setNewFavoriteItem(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleFavoriteAdd())}
                    className="h-[48px] flex-1 w-full rounded-[8px] border border-[#d5dfd6] bg-white px-4 text-[15px] text-[#2b362d] outline-none focus:border-[#57a764] box-border m-0 shrink-0"
                  />
                  <button
                    type="button"
                    onClick={handleFavoriteAdd}
                    className="h-[48px] px-6 w-full sm:w-auto bg-[#57a764] hover:bg-[#438e4d] text-white text-[14px] font-bold rounded-[8px] border-none outline-none cursor-pointer transition-colors box-border m-0 shrink-0"
                  >
                    추가
                  </button>
                </div>

                {/* 관심 품목 뱃지 */}
                <div className="flex flex-wrap justify-center gap-2.5 pt-3">
                  {favoriteItems.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1.5 min-h-[36px] px-4 rounded-full bg-[#edf7ee] text-[#397644] text-[14px] font-bold"
                    >
                      <span>{item}</span>
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

              {/* 2. 가격 변동 알림 설정 */}
              <div className="pt-8 border-t border-[#e7ece7] space-y-4">
                <div className="text-center space-y-1">
                  <h3 className="text-[18px] font-bold text-[#344037]">가격 변동 알림</h3>
                  <p className="text-[14px] text-[#7a877c]">
                    관심 품목이나 주요 농수산물의 목표 가격 및 등락률 조건을 등록하여 알림을 받을 수 있습니다.
                  </p>
                </div>

                {/* 가격 변동 알림 4개 필드 */}
                <div className="flex flex-col sm:flex-row items-center gap-3 max-w-[820px] mx-auto w-full">
                  <input
                    type="text"
                    placeholder="알림 품목명 (예: 쌀)"
                    value={newPriceAlertItemName}
                    onChange={(e) => setNewPriceAlertItemName(e.target.value)}
                    className="h-[48px] w-full sm:w-[32%] rounded-[8px] border border-[#d5dfd6] bg-white px-3.5 text-[15px] text-[#2b362d] outline-none focus:border-[#57a764] box-border m-0 shrink-0"
                  />
                  <select
                    value={newPriceAlertCondition}
                    onChange={(e) => setNewPriceAlertCondition(e.target.value as PriceAlertCondition)}
                    className="h-[48px] w-full sm:w-[26%] rounded-[8px] border border-[#d5dfd6] bg-white px-3 text-[15px] text-[#2b362d] outline-none focus:border-[#57a764] box-border m-0 shrink-0"
                  >
                    <option value="PRICE_BELOW">가격 이하 (원)</option>
                    <option value="PRICE_ABOVE">가격 이상 (원)</option>
                    <option value="RATE_UP">등락률 상승 (%)</option>
                    <option value="RATE_DOWN">등락률 하락 (%)</option>
                  </select>
                  <input
                    type="number"
                    placeholder="목표값 (숫자)"
                    value={newPriceAlertThreshold}
                    onChange={(e) => setNewPriceAlertThreshold(e.target.value)}
                    className="h-[48px] w-full sm:w-[26%] rounded-[8px] border border-[#d5dfd6] bg-white px-3.5 text-[15px] text-[#2b362d] outline-none focus:border-[#57a764] box-border m-0 shrink-0"
                  />
                  <button
                    type="button"
                    onClick={handlePriceAlertAdd}
                    className="h-[48px] w-full sm:w-[16%] px-4 bg-[#57a764] hover:bg-[#438e4d] text-white text-[14px] font-bold rounded-[8px] border-none outline-none cursor-pointer whitespace-nowrap transition-colors box-border m-0 shrink-0"
                  >
                    알림 추가
                  </button>
                </div>

                {/* 등록된 가격 알림 리스트 */}
                <div className="space-y-2.5 max-w-[820px] mx-auto pt-2">
                  {priceAlerts.length === 0 ? (
                    <p className="p-6 border border-dashed border-[#d5dfd6] rounded-[10px] text-center text-[14px] text-[#7a877c]">
                      등록된 가격 변동 알림이 없습니다.
                    </p>
                  ) : (
                    priceAlerts.map((alertItem) => (
                      <div
                        key={alertItem.id}
                        className="flex items-center justify-between p-4 bg-white border border-[#e1e8e2] rounded-[10px]"
                      >
                        <div>
                          <strong className="text-[15px] font-bold text-[#344037] block">
                            {alertItem.itemName}
                          </strong>
                          <span className="text-[13px] text-[#718073] block mt-1">
                            {alertItem.threshold.toLocaleString()}{PRICE_ALERT_CONDITION_LABELS[alertItem.condition]}
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

              {/* 3. 프로필 정보 수정 폼 (Flex 독립 2열 배치로 겹침 원천 차단) */}
              <form onSubmit={handleSubmit(onProfileSubmit)} className="pt-8 border-t border-[#e7ece7] space-y-5 max-w-[820px] mx-auto">
                <div className="text-center space-y-1 mb-6">
                  <h3 className="text-[18px] font-bold text-[#344037]">회원 정보 관리</h3>
                  <p className="text-[14px] text-[#7a877c]">가입 시 등록된 필수 정보를 수정할 수 있습니다.</p>
                </div>

                {/* ROW 1: 아이디 & 비밀번호 변경 */}
                <div className="flex flex-col md:flex-row gap-4 w-full">
                  <div className="space-y-1.5 flex-1 w-full md:w-1/2">
                    <label className="text-[14px] font-bold text-[#344037] block">아이디</label>
                    <input
                      {...register("userId")}
                      readOnly
                      className="w-full h-[48px] rounded-[8px] border border-[#d5dfd6] bg-[#f5f7f5] px-3.5 text-[15px] text-[#7a877c] cursor-not-allowed outline-none box-border m-0"
                    />
                  </div>

                  {!isSocialUser && (
                    <div className="space-y-1.5 flex-1 w-full md:w-1/2">
                      <label className="text-[14px] font-bold text-[#344037] block">비밀번호 변경</label>
                      <button
                        type="button"
                        onClick={() => alert("비밀번호 변경 페이지로 이동합니다.")}
                        className="w-full h-[48px] rounded-[8px] border border-[#cfd9d0] bg-white text-[#526055] hover:bg-[#f5f8f5] font-bold text-[14px] cursor-pointer transition-colors box-border m-0"
                      >
                        비밀번호 변경하기
                      </button>
                    </div>
                  )}
                </div>

                {/* ROW 2: 이름 & 휴대폰 번호 */}
                <div className="flex flex-col md:flex-row gap-4 w-full">
                  <div className="space-y-1.5 flex-1 w-full md:w-1/2">
                    <label className="text-[14px] font-bold text-[#344037] block">이름</label>
                    <input
                      {...register("name")}
                      className="w-full h-[48px] rounded-[8px] border border-[#d5dfd6] bg-white px-3.5 text-[15px] text-[#2b362d] outline-none focus:border-[#57a764] box-border m-0"
                    />
                  </div>

                  <div className="space-y-1.5 flex-1 w-full md:w-1/2">
                    <label className="text-[14px] font-bold text-[#344037] block">휴대폰 번호</label>
                    <input
                      {...register("phone")}
                      className="w-full h-[48px] rounded-[8px] border border-[#d5dfd6] bg-white px-3.5 text-[15px] text-[#2b362d] outline-none focus:border-[#57a764] box-border m-0"
                    />
                  </div>
                </div>

                {/* ROW 3: 이메일 주소 */}
                <div className="space-y-1.5 w-full">
                  <label className="text-[14px] font-bold text-[#344037] block">이메일 주소</label>
                  <input
                    {...register("email")}
                    className="w-full h-[48px] rounded-[8px] border border-[#d5dfd6] bg-white px-3.5 text-[15px] text-[#2b362d] outline-none focus:border-[#57a764] box-border m-0"
                  />
                </div>

                {/* ROW 4: 기본 주소 & 상세 주소 */}
                <div className="flex flex-col md:flex-row gap-4 w-full">
                  <div className="space-y-1.5 flex-1 w-full md:w-1/2">
                    <label className="text-[14px] font-bold text-[#344037] block">기본 주소</label>
                    <input
                      {...register("address")}
                      className="w-full h-[48px] rounded-[8px] border border-[#d5dfd6] bg-white px-3.5 text-[15px] text-[#2b362d] outline-none focus:border-[#57a764] box-border m-0"
                    />
                  </div>

                  <div className="space-y-1.5 flex-1 w-full md:w-1/2">
                    <label className="text-[14px] font-bold text-[#344037] block">상세 주소</label>
                    <input
                      {...register("detailAddress")}
                      className="w-full h-[48px] rounded-[8px] border border-[#d5dfd6] bg-white px-3.5 text-[15px] text-[#2b362d] outline-none focus:border-[#57a764] box-border m-0"
                    />
                  </div>
                </div>

                {/* ROW 5: 선호 지역 설정 */}
                <div className="space-y-1.5 w-full">
                  <label className="text-[14px] font-bold text-[#344037] block">선호 지역 설정</label>
                  <select
                    value={preferredDistrict}
                    onChange={(e) => setPreferredDistrict(e.target.value)}
                    className="w-full h-[48px] rounded-[8px] border border-[#d5dfd6] bg-white px-3.5 text-[15px] text-[#2b362d] outline-none focus:border-[#57a764] box-border m-0"
                  >
                    {SEOUL_DISTRICTS.map((district) => (
                      <option key={district} value={district}>
                        서울특별시 {district}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-center pt-4">
                  <button
                    type="submit"
                    className="h-[48px] px-8 bg-[#57a764] hover:bg-[#438e4d] text-white text-[15px] font-bold rounded-[8px] border-none outline-none cursor-pointer transition-colors"
                  >
                    회원 정보 저장
                  </button>
                </div>
              </form>

              {/* 4. 회원 탈퇴 (Danger Zone) */}
              <div className="mt-12 p-6 bg-[#fff8f8] border border-[#f1cccc] rounded-[10px] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-[17px] font-bold text-[#a44141]">회원 탈퇴</h3>
                  <p className="text-[14px] text-[#947474] mt-1">
                    탈퇴 시 작성한 게시글 및 설정한 알림 정보가 모두 삭제될 수 있습니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("정말로 탈퇴하시겠습니까?")) {
                      alert("회원 탈퇴 처리되었습니다.");
                    }
                  }}
                  className="h-[44px] px-5 border border-[#d96666] bg-white text-[#c54e4e] hover:bg-[#fff0f0] font-bold text-[14px] rounded-[8px] cursor-pointer whitespace-nowrap transition-colors"
                >
                  회원 탈퇴
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: 알림 설정 */}
          {activeTab === "NOTIFICATION" && (
            <div className="space-y-8 max-w-[820px] mx-auto">
              <div className="text-center space-y-1 mb-6">
                <h2 className="text-[20px] font-bold text-[#242b23]">알림 수신 설정</h2>
                <p className="text-[14px] text-[#667065]">
                  가격 변동 알림 및 관심 품목 관련 푸시 알림의 수신 여부를 선택할 수 있습니다.
                </p>
              </div>

              <div className="border border-[#e1e8e2] rounded-[10px] divide-y divide-[#e7ece7] bg-white">
                {[
                  { key: "priceChange", label: "전체 가격 변동 알림 받기", desc: "모든 주요 농수산물 가격 변동 소식을 실시간으로 제공받습니다." },
                  { key: "priceIncrease", label: "가격 상승 알림 받기", desc: "시세가 급등하는 품목의 동향을 빠르게 알림으로 받습니다." },
                  { key: "priceDecrease", label: "가격 하락 알림 받기", desc: "시세가 하락하여 구매하기 좋은 시점의 알림을 받습니다." },
                  { key: "favoriteOnly", label: "관심 품목만 알림 받기", desc: "등록한 관심 품목에 대해서만 알림을 받습니다." },
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
                  onClick={() => alert("알림 설정이 저장되었습니다.")}
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
                  내가 작성한 게시글과 댓글을 확인하고 해당 글로 이동할 수 있습니다.
                </p>
              </div>

              {/* 내 활동 서브 탭 */}
              <div className="flex items-center gap-2 pb-3 border-b border-[#e1e8e2]">
                <button
                  onClick={() => setActivityType("POST")}
                  className={
                    activityType === "POST"
                      ? "h-[38px] px-4 rounded-[8px] bg-[#57a764] border border-[#57a764] text-white font-bold text-[14px] cursor-pointer"
                      : "h-[38px] px-4 rounded-[8px] bg-white border border-[#d8e2d9] text-[#718073] font-bold text-[14px] hover:bg-[#f5f8f5] cursor-pointer"
                  }
                >
                  작성한 게시글
                </button>
                <button
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

              {/* 리스트 */}
              <div className="border border-[#e1e8e2] rounded-[10px] divide-y divide-[#e7ece7] bg-white overflow-hidden">
                {activityType === "POST" &&
                  MOCK_MY_POSTS.map((post) => (
                    <Link
                      key={post.id}
                      to={`/board/${post.id}`}
                      className="flex items-center justify-between p-5 hover:bg-[#f5faf5] transition-colors"
                    >
                      <div className="min-w-0 pr-4">
                        <strong className="text-[15px] font-bold text-[#344037] block truncate">
                          {post.title}
                        </strong>
                        <span className="text-[13px] text-[#7a877c] block mt-1">
                          작성일 {post.createdAt} · 조회수 {post.viewCount}
                        </span>
                      </div>
                      <b aria-hidden="true" className="text-[#57a764] text-[28px] font-normal leading-none">
                        ›
                      </b>
                    </Link>
                  ))}

                {activityType === "COMMENT" &&
                  MOCK_MY_COMMENTS.map((comment) => (
                    <Link
                      key={comment.id}
                      to={`/board/${comment.postId}`}
                      className="flex items-center justify-between p-5 hover:bg-[#f5faf5] transition-colors"
                    >
                      <div className="min-w-0 pr-4">
                        <strong className="text-[15px] font-bold text-[#344037] block truncate">
                          {comment.postTitle}
                        </strong>
                        <span className="text-[13px] text-[#7a877c] block mt-1">
                          {comment.content} · 작성일 {comment.createdAt}
                        </span>
                      </div>
                      <b aria-hidden="true" className="text-[#57a764] text-[28px] font-normal leading-none">
                        ›
                      </b>
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}