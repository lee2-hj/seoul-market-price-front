import type { LucideIcon } from "lucide-react";
import { Building2, MapPin } from "lucide-react";

export interface SectionMenuItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
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
