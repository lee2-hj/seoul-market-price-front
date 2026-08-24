import { useSearchParams } from "react-router-dom";

import SectionSidebarLayout from "@/components/SectionSidebarLayout";
import { MYPAGE_NAVIGATION } from "@/config/sectionNavigation";

import MyActivityPage from "./MyActivityPage";
import MyProfilePage from "./MyProfilePage";

type MyPageTab = "PROFILE" | "ACTIVITY";

function isMyPageTab(value: string | null): value is MyPageTab {
  return value === "PROFILE" || value === "ACTIVITY";
}

export default function MyPage() {
  const [searchParams] = useSearchParams();
  const tabValue = searchParams.get("tab");
  const activeTab: MyPageTab = isMyPageTab(tabValue) ? tabValue : "PROFILE";

  return (
    <SectionSidebarLayout
      sectionTitle={MYPAGE_NAVIGATION.sectionTitle}
      menuItems={MYPAGE_NAVIGATION.menuItems}
    >
      <div className="space-y-2 text-center">
        <span className="inline-block rounded-full bg-[#E6F4F2] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#0F766E]">
          SSABU CUSTOMER CENTER
        </span>
        <h1 className="text-[36px] font-black tracking-tight text-[#123047]">
          마이페이지
        </h1>
        <p className="text-[15px] text-[#667065]">
          회원 정보 및 내 활동 내역을 한곳에서 관리합니다.
        </p>
      </div>

      {activeTab === "ACTIVITY" ? <MyActivityPage /> : <MyProfilePage />}
    </SectionSidebarLayout>
  );
}
