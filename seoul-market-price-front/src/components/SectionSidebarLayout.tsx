import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import type { SectionMenuItem } from "@/config/sectionNavigation";
import { cn } from "@/lib/utils";

interface SectionSidebarLayoutProps {
  sectionTitle: string;
  menuItems: SectionMenuItem[];
  children: ReactNode;
}

export default function SectionSidebarLayout({
  sectionTitle,
  menuItems,
  children,
}: SectionSidebarLayoutProps) {
  const location = useLocation();

  return (
    <div className="tw-scope min-h-screen bg-[#F8FAFC] text-[#0F172A] [font-family:'Pretendard','Noto_Sans_KR',Arial,sans-serif]">
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[224px_minmax(0,1fr)]">
          <aside className="h-fit w-full lg:sticky lg:top-[96px]">
            <Card className="rounded-xl border-[#E2E8F0] shadow-none">
              <CardContent className="p-4">
                <h2 className="mb-4 text-[16px] font-black text-[#0F172A]">
                  {sectionTitle}
                </h2>
                <nav className="flex flex-col gap-1" aria-label={`${sectionTitle} 메뉴`}>
                  {menuItems.map(({ label, to, icon: Icon, end, isActive }) => {
                    const customIsActive = isActive?.(location);
                    const isItemActive = customIsActive ?? (location.pathname === to);

                    return (
                      <NavLink
                        key={to}
                        to={to}
                        end={end}
                        onClick={(e) => {
                          if (isItemActive) {
                            e.preventDefault();
                          }
                        }}
                        aria-current={
                          isActive ? (customIsActive ? "page" : false) : undefined
                        }
                        className={({ isActive: isPathActive }) =>
                          cn(
                            "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors no-underline",
                            (customIsActive ?? isPathActive)
                              ? "bg-[#E8F6F9] font-bold text-[#0F8AA8]"
                              : "text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]",
                          )
                        }
                      >
                        <Icon
                          aria-hidden="true"
                          className="size-4 shrink-0 stroke-[1.8]"
                        />
                        <span>{label}</span>
                      </NavLink>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </aside>

          <main className="min-w-0 space-y-4">{children}</main>
        </div>
      </div>
    </div>
  );
}
