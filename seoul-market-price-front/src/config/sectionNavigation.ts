import type { LucideIcon } from "lucide-react";
import { Activity, Building2, MapPin, UserRound } from "lucide-react";
import type { Location } from "react-router-dom";

export interface SectionMenuItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
  isActive?: (location: Location) => boolean;
}

export interface SectionNavigation {
  sectionTitle: string;
  menuItems: SectionMenuItem[];
}

export const TRENDS_NAVIGATION: SectionNavigation = {
  sectionTitle: "거래동향",
  menuItems: [
    {
      label: "아파트별 거래동향",
      to: "/trends",
      icon: Building2,
      end: true,
    },
    {
      label: "지역별 거래동향",
      to: "/trends/region",
      icon: MapPin,
    },
  ],
};

export const MYPAGE_NAVIGATION: SectionNavigation = {
  sectionTitle: "마이페이지",
  menuItems: [
    {
      label: "내 정보",
      to: "/mypage",
      icon: UserRound,
      isActive: ({ pathname, search }) => {
        if (pathname !== "/mypage") return false;
        return new URLSearchParams(search).get("tab") !== "ACTIVITY";
      },
    },
    {
      label: "내 활동",
      to: "/mypage?tab=ACTIVITY",
      icon: Activity,
      isActive: ({ pathname, search }) =>
        pathname === "/mypage" &&
        new URLSearchParams(search).get("tab") === "ACTIVITY",
    },
  ],
};
