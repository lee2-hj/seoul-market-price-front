import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { BarChart3, Check, ChevronDown, Headphones, LogIn, Map, MapPin, Menu, Search, UserRound, X } from "lucide-react";

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
      { to: "/faq", label: "자주 묻는 질문" },
      { to: "/report", label: "싸부 신고센터" },
    ],
  },
];

const MYPAGE_LINKS: MenuLink[] = [
  { to: "/mypage", label: "내 정보 수정" },
  { to: "/mypage", label: "관심 단지" },
  { to: "/mypage?tab=NOTIFICATION", label: "알림 설정" },
  { to: "/mypage?tab=ACTIVITY", label: "활동 내역" },
];

const SEOUL_DISTRICTS = [
  "강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구",
  "노원구", "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구",
  "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구",
];

const REGION_STORAGE_KEY = "ssabu_selected_region";

function getSavedRegion(userId?: string): string {
  if (userId) {
    const settings = localStorage.getItem(`myPageSettings_${userId.trim().toLowerCase()}`);
    if (settings) {
      try {
        const preferredDistrict = JSON.parse(settings)?.preferredDistrict;
        if (SEOUL_DISTRICTS.includes(preferredDistrict)) return preferredDistrict;
      } catch {
        // 손상된 마이페이지 설정은 공통 지역값으로 대체한다.
      }
    }
  }

  const saved = localStorage.getItem(REGION_STORAGE_KEY);
  return saved && SEOUL_DISTRICTS.includes(saved) ? saved : "강남구";
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `group relative flex h-[68px] items-center gap-2 whitespace-nowrap px-1 text-[13px] font-extrabold tracking-[-0.025em] transition-colors no-underline after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-t-full after:transition-colors ${isActive ? "text-[#0F8AA8] after:bg-[#0F8AA8]" : "text-[#13202B] after:bg-transparent hover:text-[#0F8AA8]"
  }`;

function DesktopDropdown({ label, links, icon: Icon }: { label: string; links: MenuLink[]; icon: typeof Search }) {
  return (
    <div className="group relative flex h-[68px] items-center">
      <button type="button" className="flex h-full items-center gap-2 border-0 bg-transparent px-1 text-[13px] font-extrabold tracking-[-0.025em] text-[#13202B] hover:text-[#0F8AA8]">
        <Icon className="size-[18px] stroke-[1.8]" />{label}<ChevronDown className="size-3.5" />
      </button>
      <div className="invisible absolute left-1/2 top-[64px] z-50 w-[190px] -translate-x-1/2 translate-y-1 rounded-[10px] border border-[#DCE8ED] bg-white p-2 opacity-0 shadow-[0_12px_30px_rgba(18,48,71,0.12)] transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
        {links.map((item) => (
          <Link key={`${item.to}-${item.label}`} to={item.to} className="flex min-h-10 items-center rounded-[7px] px-3 text-[12px] font-semibold text-[#6B7280] no-underline hover:bg-[#E8F6F9] hover:text-[#0F8AA8]">
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
  const [regionOpen, setRegionOpen] = useState(false);
  const [region, setRegion] = useState(() => getSavedRegion());
  const isAuthenticated = user !== null;

  useEffect(() => {
    setRegion(getSavedRegion(user?.userId));
  }, [user?.userId]);

  const handleRegionChange = (nextRegion: string) => {
    setRegion(nextRegion);
    setRegionOpen(false);
    localStorage.setItem(REGION_STORAGE_KEY, nextRegion);

    if (user?.userId) {
      const key = `myPageSettings_${user.userId.trim().toLowerCase()}`;
      try {
        const current = JSON.parse(localStorage.getItem(key) ?? "{}");
        localStorage.setItem(key, JSON.stringify({ ...current, preferredDistrict: nextRegion }));
      } catch {
        localStorage.setItem(key, JSON.stringify({ preferredDistrict: nextRegion }));
      }
    }
  };

  const handleLogout = async () => {
    if (!window.confirm("로그아웃 하시겠습니까?")) return;
    setOpen(false);
    await logout();
    window.location.href = "/";
  };

  return (
    <header className="tw-scope sticky top-0 z-[1000] w-full border-b border-[#DCE8ED] bg-white/95 backdrop-blur-xl shadow-[0_3px_13px_rgba(18,48,71,0.06)] [font-family:'Pretendard','Noto_Sans_KR',Arial,sans-serif]">
      <div className="mx-auto flex h-[72px] w-[min(1490px,calc(100%-48px))] items-center gap-7 max-[1240px]:w-[min(980px,calc(100%-36px))] max-[760px]:w-[calc(100%-24px)]">
        <Link to="/" onClick={() => setOpen(false)} className="flex h-[72px] w-[150px] shrink-0 items-center justify-start overflow-hidden no-underline max-[760px]:w-[116px]">
          <img src="/logo-teal.png" alt="싸부 로고" className="h-[102px] w-[102px] max-w-none object-contain max-[760px]:h-[92px] max-[760px]:w-[92px]" />
        </Link>

        <nav className="ml-auto hidden h-[68px] items-center gap-8 lg:flex" aria-label="주요 메뉴">
          {NAV_ITEMS.map((item) => item.links ? (
            <DesktopDropdown key={item.label} label={item.label} links={item.links} icon={item.icon} />
          ) : (
            <NavLink key={item.label} to={item.to!} className={linkClass}><item.icon className="size-[18px] stroke-[1.8]" />{item.label}</NavLink>
          ))}
          {isAuthenticated && <DesktopDropdown label="마이페이지" links={MYPAGE_LINKS} icon={UserRound} />}
        </nav>

        <div className="hidden shrink-0 items-center gap-2.5 lg:flex">
          <div className="relative">
            <button
              type="button"
              onClick={() => setRegionOpen((value) => !value)}
              aria-haspopup="listbox"
              aria-expanded={regionOpen}
              className="flex h-[42px] items-center gap-1.5 rounded-[10px] border border-[#DCE8ED] bg-white px-3 text-[12px] font-extrabold text-[#123047] shadow-[0_2px_7px_rgba(18,48,71,0.05)] transition-colors hover:border-[#7CC9D8] hover:bg-[#F5FAFC]"
            >
              <MapPin className="size-4 text-[#0F8AA8]" />
              <span>{region}</span>
              <ChevronDown className={`size-3.5 text-[#778077] transition-transform ${regionOpen ? "rotate-180" : ""}`} />
            </button>

            {regionOpen && (
              <div className="absolute right-0 top-[49px] z-50 w-[250px] rounded-[12px] border border-[#e0e6df] bg-white p-3 shadow-[0_16px_36px_rgba(26,48,25,0.15)]" role="listbox" aria-label="내 지역 선택">
                <div className="mb-2 px-1 text-[11px] font-extrabold text-[#748075]">내 지역 선택</div>
                <div className="grid max-h-[260px] grid-cols-2 gap-1 overflow-y-auto pr-1">
                  {SEOUL_DISTRICTS.map((district) => (
                    <button
                      key={district}
                      type="button"
                      role="option"
                      aria-selected={region === district}
                      onClick={() => handleRegionChange(district)}
                      className={`flex min-h-9 items-center justify-between rounded-[7px] border-0 px-2.5 text-left text-[12px] font-semibold transition-colors ${region === district ? "bg-[#E8F6F9] text-[#0F8AA8]" : "bg-transparent text-[#6B7280] hover:bg-[#F5FAFC]"}`}
                    >
                      {district}{region === district && <Check className="size-3.5" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {isAuthenticated ? (
            <>
              <span className="flex items-center gap-1.5 text-[13px] font-extrabold text-[#263329]"><UserRound className="size-4" />{user?.name ?? "회원"}님</span>
              <Button type="button" variant="outline" onClick={handleLogout} className="h-9 rounded-[8px] border-[#dfe5dd] px-3 text-[11px] font-bold text-[#596259] shadow-none hover:bg-[#f4f8f2]">로그아웃</Button>
            </>
          ) : (
            <Button asChild className="group h-[42px] rounded-[10px] border border-[#0B5E73] bg-gradient-to-b from-[#0F8AA8] to-[#0B5E73] px-[18px] text-[12px] font-extrabold text-white shadow-[0_4px_10px_rgba(15,138,168,0.18)] transition-all hover:-translate-y-0.5 hover:from-[#0D7E99] hover:to-[#094E60] hover:shadow-[0_7px_15px_rgba(15,138,168,0.24)]">
              <Link to="/login" className="flex items-center gap-2 no-underline"><LogIn className="size-4 transition-transform group-hover:translate-x-0.5" />로그인</Link>
            </Button>
          )}
        </div>

        <button type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? "메뉴 닫기" : "메뉴 열기"} className="ml-auto flex size-11 items-center justify-center rounded-[8px] border-0 bg-transparent text-[#263329] hover:bg-[#f3f7f1] lg:hidden">
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {open && (
        <div className="absolute left-1/2 top-[72px] max-h-[calc(100vh-78px)] w-[min(980px,calc(100%-36px))] -translate-x-1/2 overflow-y-auto rounded-b-[12px] border border-[#e5e8e4] bg-white px-5 py-4 shadow-[0_18px_35px_rgba(26,48,25,0.12)] max-[760px]:w-[calc(100%-24px)] lg:hidden">
          <nav className="mx-auto flex max-w-[720px] flex-col" aria-label="모바일 메뉴">
            <Link to="/" onClick={() => setOpen(false)} className="flex min-h-11 items-center text-[14px] font-extrabold no-underline">홈</Link>
            {NAV_ITEMS.flatMap((item) => item.links ?? [{ to: item.to!, label: item.label }]).map((item) => (
              <Link key={`${item.to}-${item.label}`} to={item.to} onClick={() => setOpen(false)} className="flex min-h-11 items-center border-t border-[#f0f2ef] text-[13px] font-semibold text-[#505850] no-underline">{item.label}</Link>
            ))}
            {isAuthenticated && MYPAGE_LINKS.map((item) => <Link key={`${item.to}-${item.label}`} to={item.to} onClick={() => setOpen(false)} className="flex min-h-11 items-center border-t border-[#f0f2ef] text-[13px] font-semibold text-[#505850] no-underline">{item.label}</Link>)}
            <label className="mt-3 flex items-center gap-2 border-t border-[#e5e8e4] pt-3 text-[13px] font-extrabold text-[#344037]">
              <MapPin className="size-4 text-[#0F8AA8]" />
              <span className="shrink-0">내 지역</span>
              <select value={region} onChange={(event) => handleRegionChange(event.target.value)} className="ml-auto h-10 min-w-0 flex-1 rounded-[8px] border border-[#dfe5dd] bg-white px-3 text-[13px] font-semibold text-[#344037] outline-none focus:border-[#6ca875]">
                {SEOUL_DISTRICTS.map((district) => <option key={district} value={district}>{district}</option>)}
              </select>
            </label>
            <div className="mt-3 border-t border-[#e5e8e4] pt-3">
              {isAuthenticated ? <Button type="button" variant="outline" onClick={handleLogout} className="h-11 w-full rounded-[8px]">{user?.name ?? "회원"}님 · 로그아웃</Button> : <Button asChild className="h-11 w-full rounded-[8px] bg-[#0F8AA8] text-white"><Link to="/login" onClick={() => setOpen(false)} className="no-underline">로그인</Link></Button>}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
