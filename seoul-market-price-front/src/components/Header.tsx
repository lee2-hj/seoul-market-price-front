import { Link } from "react-router-dom";
import { useState } from "react";
import { Menu, X } from "lucide-react";

import { logout } from "@/features/auth/utils/auth";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

interface NavLinkItem {
  to: string;
  label: string;
}

interface NavGroup {
  label: string;
  links: NavLinkItem[];
}
/* 추후 추가
const PRICE_LINKS: NavLinkItem[] = [
  { to: "/price", label: "품목별 시세 조회" },
  { to: "/price/detail", label: "가격 추이 그래프" },
  { to: "/price/detail", label: "급상승 / 급락 품목" },
];

const REGION_LINKS: NavLinkItem[] = [
  { to: "/region-price", label: "자치구 지도 비교" },
  { to: "/region-price/my-area", label: "자치구간 1:1 비교" },
];

const RECOMMEND_LINKS: NavLinkItem[] = [
  { to: "/recommendation", label: "오늘의 알뜰 품목" },
  { to: "/recommendation", label: "오늘의 가격하락 품목 추천" },
  { to: "/recommendation", label: "이달의 제철 농수산물" },
];
*/

const SUPPORT_LINKS: NavLinkItem[] = [
  { to: "/board", label: "공지사항" },
  { to: "/qna", label: "질의응답" },
  { to: "/faq", label: "자주 묻는 질문" },
];

/* 마이페이지(/mypage)는 하나의 라우트를 탭(?tab=)으로 구분해 쓴다.
   (src/pages/MyPage/MyPage.tsx 참고: PROFILE(기본) · NOTIFICATION · ACTIVITY) */
const MYPAGE_LINKS: NavLinkItem[] = [
  { to: "/mypage", label: "내 정보 수정" },
  { to: "/mypage", label: "관심품목 & 우리동네 설정" },
  { to: "/mypage?tab=NOTIFICATION", label: "가격 변동 타겟 알림" },
];

const NAV_GROUPS: NavGroup[] = [
  { label: "가격 상세 정보", links: [] },
  { label: "자치구별 가격정보", links: [] },
  { label: "스마트 추천", links: [] },
  { label: "고객센터", links: SUPPORT_LINKS },
];

const MYPAGE_GROUP: NavGroup = { label: "마이페이지", links: MYPAGE_LINKS };

const navTriggerClass =
  "group h-[76px] gap-[5px] rounded-none border-0 bg-transparent px-0 py-[27px] text-[14px] font-semibold whitespace-nowrap text-[#505850] hover:bg-transparent hover:text-[#4c9b55] focus:bg-transparent data-[state=open]:bg-transparent data-[state=open]:text-[#4c9b55] data-[state=open]:hover:bg-transparent data-[state=open]:focus:bg-transparent";

const dropdownContentClass =
  "!fixed inset-x-0 top-[76px] flex min-h-[85px] w-screen items-center justify-center gap-10 border-t border-[#edf1eb] border-b border-[#dfe7dd] bg-white/[.99] py-[18px] pb-[22px] shadow-[0_10px_25px_rgba(45,70,45,0.07),0_3px_8px_rgba(45,70,45,0.03)]";

function DropdownLinks({ links }: { links: NavLinkItem[] }) {
  return (
    <>
      {links.map((link) => (
        <NavigationMenuLink asChild key={`${link.to}-${link.label}`}>
          <Link
            to={link.to}
            className="group/link relative -mt-1 flex min-w-[155px] items-center gap-[9px] rounded-[7px] px-3.5 py-[7px] text-[13px] font-medium whitespace-nowrap text-[#626b63] no-underline transition-all duration-150 hover:translate-x-[3px] hover:bg-[#f3f8f2] hover:text-[#4c9956]"
          >
            <span className="size-1 shrink-0 rounded-full bg-[#b7c6b7] transition-colors duration-150 group-hover/link:bg-[#5da566]" />
            {link.label}
          </Link>
        </NavigationMenuLink>
      ))}
    </>
  );
}

/* 모바일 · 태블릿(<1024px) 전용 메뉴 패널
   NavigationMenu의 hover 기반 드롭다운은 터치 환경에 맞지 않아
   그룹별로 항상 펼쳐진 세로 목록으로 대체한다. */
function MobileNavPanel({
  groups,
  onNavigate,
}: {
  groups: NavGroup[];
  onNavigate: () => void;
}) {
  return (
    <nav className="flex flex-col divide-y divide-[#edf1eb]">
      <Link
        to="/"
        onClick={onNavigate}
        className="flex min-h-11 items-center px-1 text-[14px] font-semibold text-[#344037]"
      >
        홈
      </Link>

      {groups.map((group) => (
        <div key={group.label} className="py-2">
          <p className="px-1 py-2 text-[11px] font-bold tracking-[0.3px] text-[#899287]">
            {group.label}
          </p>

          <div className="flex flex-col">
            {group.links.map((link) => (
              <Link
                key={`${link.to}-${link.label}`}
                to={link.to}
                onClick={onNavigate}
                className="flex min-h-11 items-center gap-[9px] rounded-[7px] px-2 text-[13px] font-medium text-[#505850] no-underline transition-colors hover:bg-[#f3f8f2] hover:text-[#4c9956]"
              >
                <span className="size-1 shrink-0 rounded-full bg-[#b7c6b7]" />
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function Header() {
  // 로그인 여부와 표시용 회원명은 zustand(useAuthStore)가 기준(source of truth)이다.
  // accessToken이 HttpOnly 쿠키라 더 이상 직접 파싱할 수 없어,
  // 로그인 시 응답받은 값을 zustand에 저장해두고 그대로 구독한다.
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = user !== null;
  const userName = user?.name ?? null;
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 마이페이지 메뉴는 로그인 상태일 때만 노출한다.
  const mobileNavGroups = isAuthenticated
    ? [...NAV_GROUPS, MYPAGE_GROUP]
    : NAV_GROUPS;

  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = async () => {
    if (!window.confirm("로그아웃 하시겠습니까?")) {
      return;
    }

    closeMenu();
    // accessToken 쿠키 삭제 + /api/auth/logout 호출까지 끝난 뒤에
    // 이동해야 로그아웃 처리가 확실히 반영된다.
    await logout();
    window.location.href = "/";
  };

  return (
    <header className="tw-scope sticky top-0 z-[1000] w-full border-b border-[#e8ece6] bg-white/97 backdrop-blur-md [font-family:'Pretendard','Noto_Sans_KR',Arial,sans-serif]">
      <div className="mx-auto flex h-[76px] w-[min(1280px,calc(100%-32px))] items-center gap-3 sm:w-[min(1280px,calc(100%-48px))] sm:gap-5 lg:gap-[30px]">
        {/* Logo */}
        <Link
          to="/"
          onClick={closeMenu}
          className="flex min-w-0 shrink-0 items-center gap-[10px] text-[#263329] no-underline lg:min-w-[220px]"
        >
          <img
            src="/logo.png"
            alt="싸부 로고"
            className="h-[54px] sm:h-[58px] w-auto object-contain rounded-[6px] transition-transform hover:scale-105"
          />
          <span className="hidden whitespace-nowrap border-l border-[#dfe4dd] pl-2.5 text-[12px] font-semibold text-[#899287] md:inline">
            싸게 보는 부동산
          </span>
        </Link>

        {/* Navigation (Desktop, 1024px 이상) */}
        <NavigationMenu
          viewport={false}
          className="ml-auto hidden h-[76px] max-w-none flex-none items-center justify-start lg:flex"
        >
          <NavigationMenuList className="h-[76px] gap-4 xl:gap-[25px]">
            {/* 홈 */}
            <NavigationMenuItem className="flex h-[76px] shrink-0 items-center">
              <NavigationMenuLink
                asChild
                className="group relative h-[76px] flex-row items-center gap-[5px] rounded-none bg-transparent p-0 py-[27px] text-[14px] font-semibold whitespace-nowrap text-[#505850] no-underline hover:bg-transparent hover:text-[#4c9b55] focus:bg-transparent"
              >
                <Link to="/">
                  홈
                  <span className="absolute inset-x-0 bottom-4 h-[2px] scale-x-0 bg-[#62a967] transition-transform group-hover:scale-x-100" />
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            {/* 가격 상세 정보 */}
            <NavigationMenuItem className="flex h-[76px] shrink-0 items-center">
              <NavigationMenuTrigger className={navTriggerClass}>
                가격 상세 정보
              </NavigationMenuTrigger>
              <NavigationMenuContent className={dropdownContentClass}>
                <DropdownLinks links={[]} />
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* 자치구별 가격정보 */}
            <NavigationMenuItem className="flex h-[76px] shrink-0 items-center">
              <NavigationMenuTrigger className={navTriggerClass}>
                자치구별 가격정보
              </NavigationMenuTrigger>
              <NavigationMenuContent className={dropdownContentClass}>
                <DropdownLinks links={[]} />
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* 스마트 추천 */}
            <NavigationMenuItem className="flex h-[76px] shrink-0 items-center">
              <NavigationMenuTrigger className={navTriggerClass}>
                스마트 추천
              </NavigationMenuTrigger>
              <NavigationMenuContent className={dropdownContentClass}>
                <DropdownLinks links={[]} />
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* 고객센터 */}
            <NavigationMenuItem className="flex h-[76px] shrink-0 items-center">
              <NavigationMenuTrigger className={navTriggerClass}>
                고객센터
              </NavigationMenuTrigger>
              <NavigationMenuContent className={dropdownContentClass}>
                <DropdownLinks links={SUPPORT_LINKS} />
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* 마이페이지 (로그인 상태일 때만 노출) */}
            {isAuthenticated && (
              <NavigationMenuItem className="flex h-[76px] shrink-0 items-center">
                <NavigationMenuTrigger className={navTriggerClass}>
                  마이페이지
                </NavigationMenuTrigger>
                <NavigationMenuContent className={dropdownContentClass}>
                  <DropdownLinks links={MYPAGE_LINKS} />
                </NavigationMenuContent>
              </NavigationMenuItem>
            )}
          </NavigationMenuList>
        </NavigationMenu>

        {/* 사용자 영역 (Desktop) */}
        <div className="hidden shrink-0 items-center gap-[13px] lg:flex">
          {isAuthenticated ? (
            <>
              <span className="text-[14px] font-bold text-[#344037]">
                {userName ?? "회원"}님
              </span>

              <Button
                type="button"
                variant="outline"
                onClick={handleLogout}
                className="h-auto rounded-[8px] border-[#dfe5dd] px-[13px] py-[9px] text-[12px] font-semibold text-[#626a62] shadow-none hover:border-[#d2ded0] hover:bg-[#f4f7f3] hover:text-[#384239]"
              >
                로그아웃
              </Button>
            </>
          ) : (
            <Button
              asChild
              className="h-auto rounded-[8px] bg-[#57a764] px-4 py-[9px] text-[13px] font-bold text-white hover:bg-[#438e4d]"
            >
              <Link to="/login" className="no-underline">
                로그인
              </Link>
            </Button>
          )}
        </div>

        {/* 햄버거 버튼 (Mobile · Tablet, 1024px 미만) */}
        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={isMenuOpen}
          className="ml-auto flex size-11 shrink-0 items-center justify-center rounded-md text-[#344037] transition-colors hover:bg-[#f4f7f3] lg:hidden"
        >
          {isMenuOpen ? (
            <X className="size-6" aria-hidden="true" />
          ) : (
            <Menu className="size-6" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* 모바일 · 태블릿 메뉴 패널 */}
      {isMenuOpen && (
        <div className="absolute inset-x-0 top-[76px] max-h-[calc(100vh-76px)] overflow-y-auto border-t border-[#e8ece6] bg-white px-4 py-3 shadow-[0_15px_35px_rgba(45,70,45,0.09)] lg:hidden">
          <MobileNavPanel groups={mobileNavGroups} onNavigate={closeMenu} />

          <div className="mt-2 border-t border-[#edf1eb] pt-3">
            {isAuthenticated ? (
              <div className="flex min-h-11 items-center justify-between px-1">
                <span className="text-[14px] font-bold text-[#344037]">
                  {userName ?? "회원"}님
                </span>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLogout}
                  className="h-11 rounded-[8px] border-[#dfe5dd] px-4 text-[13px] font-semibold text-[#626a62] shadow-none hover:border-[#d2ded0] hover:bg-[#f4f7f3] hover:text-[#384239]"
                >
                  로그아웃
                </Button>
              </div>
            ) : (
              <Button
                asChild
                className="flex h-11 w-full items-center justify-center rounded-[8px] bg-[#57a764] text-[14px] font-bold text-white hover:bg-[#438e4d]"
              >
                <Link to="/login" onClick={closeMenu} className="no-underline">
                  로그인
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
