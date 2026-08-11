import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { BarChart3, ChevronDown, Headphones, LogIn, Map, Menu, Search, UserRound, X } from "lucide-react";

import { logout } from "@/features/auth/utils/auth";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { Button } from "@/components/ui/button";

type MenuLink = { to: string; label: string };

const NAV_ITEMS: Array<{ label: string; to?: string; icon: typeof Search; links?: MenuLink[] }> = [
  { label: "매물 검색", to: "/price", icon: Search },
  { label: "지역별 비교", to: "/price", icon: Map },
  { label: "가격 추이", to: "/price", icon: BarChart3 },
  {
    label: "고객센터",
    icon: Headphones,
    links: [
      { to: "/board", label: "공지사항" },
      { to: "/qna", label: "질의응답" },
      { to: "/qna", label: "자주 묻는 질문" },
    ],
  },
];

const MYPAGE_LINKS: MenuLink[] = [
  { to: "/mypage", label: "내 정보 수정" },
  { to: "/mypage", label: "관심 단지" },
  { to: "/mypage?tab=NOTIFICATION", label: "알림 설정" },
  { to: "/mypage?tab=ACTIVITY", label: "활동 내역" },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `group relative flex h-[68px] items-center gap-2 whitespace-nowrap px-1 text-[13px] font-extrabold tracking-[-0.025em] transition-colors no-underline after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-t-full after:transition-colors ${
    isActive ? "text-[#177827] after:bg-[#177827]" : "text-[#343934] after:bg-transparent hover:text-[#177827]"
  }`;

function DesktopDropdown({ label, links, icon: Icon }: { label: string; links: MenuLink[]; icon: typeof Search }) {
  return (
    <div className="group relative flex h-[68px] items-center">
      <button type="button" className="flex h-full items-center gap-2 border-0 bg-transparent px-1 text-[13px] font-extrabold tracking-[-0.025em] text-[#343934] hover:text-[#177827]">
        <Icon className="size-[18px] stroke-[1.8]" />{label}<ChevronDown className="size-3.5" />
      </button>
      <div className="invisible absolute left-1/2 top-[64px] z-50 w-[190px] -translate-x-1/2 translate-y-1 rounded-[10px] border border-[#e5e8e4] bg-white p-2 opacity-0 shadow-[0_12px_30px_rgba(26,48,25,0.12)] transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
        {links.map((item) => (
          <Link key={`${item.to}-${item.label}`} to={item.to} className="flex min-h-10 items-center rounded-[7px] px-3 text-[12px] font-semibold text-[#596059] no-underline hover:bg-[#f1faeb] hover:text-[#177827]">
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Header() {
  const user = useAuthStore((state) => state.user);
  const [open, setOpen] = useState(false);
  const isAuthenticated = user !== null;

  const handleLogout = async () => {
    if (!window.confirm("로그아웃 하시겠습니까?")) return;
    setOpen(false);
    await logout();
    window.location.href = "/";
  };

  return (
    <header className="tw-scope sticky top-0 z-[1000] w-full bg-[#fbfbf7] px-1.5 pt-1.5 backdrop-blur-xl [font-family:'Pretendard','Noto_Sans_KR',Arial,sans-serif]">
      <div className="mx-auto flex h-[68px] w-full items-center gap-7 rounded-[12px] border border-[#e3e7e1] bg-white/97 px-5 shadow-[0_3px_13px_rgba(33,49,30,0.07)] sm:px-7">
        <Link to="/" onClick={() => setOpen(false)} className="flex min-w-0 shrink-0 items-center gap-2.5 no-underline lg:min-w-[205px]">
          <img src="/logo.png" alt="싸부 로고" className="h-[57px] w-auto rounded-[6px] object-contain" />
          <span className="hidden border-l border-[#e1e5df] pl-2.5 text-[10px] font-bold text-[#7e857e] xl:inline">싸게 보는 부동산</span>
        </Link>

        <nav className="ml-auto hidden h-[68px] items-center gap-8 lg:flex" aria-label="주요 메뉴">
          {NAV_ITEMS.map((item) => item.links ? (
            <DesktopDropdown key={item.label} label={item.label} links={item.links} icon={item.icon} />
          ) : (
            <NavLink key={item.label} to={item.to!} className={linkClass}><item.icon className="size-[18px] stroke-[1.8]" />{item.label}</NavLink>
          ))}
          <DesktopDropdown label="마이페이지" links={MYPAGE_LINKS} icon={UserRound} />
        </nav>

        <div className="hidden shrink-0 items-center gap-2.5 lg:flex">
          {isAuthenticated ? (
            <>
              <span className="flex items-center gap-1.5 text-[13px] font-extrabold text-[#263329]"><UserRound className="size-4" />{user?.name ?? "회원"}님</span>
              <Button type="button" variant="outline" onClick={handleLogout} className="h-9 rounded-[8px] border-[#dfe5dd] px-3 text-[11px] font-bold text-[#596259] shadow-none hover:bg-[#f4f8f2]">로그아웃</Button>
            </>
          ) : (
            <Button asChild className="group h-[42px] rounded-[10px] border border-[#116b22] bg-gradient-to-b from-[#1b8830] to-[#116f24] px-[18px] text-[12px] font-extrabold text-white shadow-[0_4px_10px_rgba(23,120,39,0.18)] transition-all hover:-translate-y-0.5 hover:from-[#177d2b] hover:to-[#0b641c] hover:shadow-[0_7px_15px_rgba(23,120,39,0.24)]">
              <Link to="/login" className="flex items-center gap-2 no-underline"><LogIn className="size-4 transition-transform group-hover:translate-x-0.5" />로그인</Link>
            </Button>
          )}
        </div>

        <button type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? "메뉴 닫기" : "메뉴 열기"} className="ml-auto flex size-11 items-center justify-center rounded-[8px] border-0 bg-transparent text-[#263329] hover:bg-[#f3f7f1] lg:hidden">
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {open && (
        <div className="absolute inset-x-1.5 top-[75px] max-h-[calc(100vh-78px)] overflow-y-auto rounded-b-[12px] border border-[#e5e8e4] bg-white px-5 py-4 shadow-[0_18px_35px_rgba(26,48,25,0.12)] lg:hidden">
          <nav className="mx-auto flex max-w-[720px] flex-col" aria-label="모바일 메뉴">
            <Link to="/" onClick={() => setOpen(false)} className="flex min-h-11 items-center text-[14px] font-extrabold no-underline">홈</Link>
            {NAV_ITEMS.flatMap((item) => item.links ?? [{ to: item.to!, label: item.label }]).map((item) => (
              <Link key={`${item.to}-${item.label}`} to={item.to} onClick={() => setOpen(false)} className="flex min-h-11 items-center border-t border-[#f0f2ef] text-[13px] font-semibold text-[#505850] no-underline">{item.label}</Link>
            ))}
            {MYPAGE_LINKS.map((item) => <Link key={`${item.to}-${item.label}`} to={item.to} onClick={() => setOpen(false)} className="flex min-h-11 items-center border-t border-[#f0f2ef] text-[13px] font-semibold text-[#505850] no-underline">{item.label}</Link>)}
            <div className="mt-3 border-t border-[#e5e8e4] pt-3">
              {isAuthenticated ? <Button type="button" variant="outline" onClick={handleLogout} className="h-11 w-full rounded-[8px]">{user?.name ?? "회원"}님 · 로그아웃</Button> : <Button asChild className="h-11 w-full rounded-[8px] bg-[#177827] text-white"><Link to="/login" onClick={() => setOpen(false)} className="no-underline">로그인</Link></Button>}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
