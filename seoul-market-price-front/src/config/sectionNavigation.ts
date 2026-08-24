import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Building2,
  CircleHelp,
  ClipboardList,
  MapPin,
  MessageSquareText,
  UserRound,
} from "lucide-react";
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

export const CUSTOMER_CENTER_NAVIGATION: SectionNavigation = {
  sectionTitle: "고객센터",
  menuItems: [
    {
      label: "게시판",
      to: "/board",
      icon: ClipboardList,
      isActive: ({ pathname }) =>
        pathname === "/board" || pathname.startsWith("/board/"),
    },
    {
      label: "질의응답",
      to: "/qna",
      icon: MessageSquareText,
      isActive: ({ pathname }) =>
        pathname === "/qna" || pathname.startsWith("/qna/"),
    },
    {
      label: "자주 묻는 질문",
      to: "/faq",
      icon: CircleHelp,
      isActive: ({ pathname }) => pathname === "/faq",
    },
  ],
};
