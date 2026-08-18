import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { BarChart3, ChevronDown, Headphones, LoaderCircle, LocateFixed, LogIn, Map, Menu, Search, UserRound, X } from "lucide-react";

import axios from "axios";
import { getCurrentDistrictApi } from "@/api/api";
import { logout } from "@/features/auth/utils/auth";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { Button } from "@/components/ui/button";

type MenuLink = { to: string; label: string };

const NAV_ITEMS: Array<{ label: string; to?: string; icon: typeof Search; links?: MenuLink[]; hidden?: boolean }> = [
  { label: "매물 검색", to: "/price", icon: Search, hidden: true },
  {
    label: "가격정보",
    icon: Map,
    links: [
      { to: "/price/compare-list", label: "지역별 비교(리스트)" },
      { to: "/region-map", label: "지역별 비교(지도)" },
      { to: "/price/detail", label: "단지별 시세" },
    ],
  },
  { label: "가격 추이", to: "/trends", icon: BarChart3 },
  {
    label: "고객센터",
    icon: Headphones,
    links: [
      { to: "/board", label: "게시판" },
      { to: "/qna", label: "질의응답" },
      { to: "/faq", label: "자주 묻는 질문" },
      { to: "/report", label: "문의사항" },
    ],
  },
];

const MYPAGE_LINKS: MenuLink[] = [
  { to: "/mypage", label: "내 정보 관리" },
  { to: "/mypage?tab=ACTIVITY", label: "활동 내역" },
];

const SEOUL_DISTRICTS = [
  "강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구",
  "노원구", "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구",
  "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구",
];

const REGION_STORAGE_KEY = "ssabu_selected_region";
const TEST_LATITUDE_STORAGE_KEY = "latitude";
const TEST_LONGITUDE_STORAGE_KEY = "longitude";

const DESKTOP_MENU_TEXT_CLASS =
  "text-[13px] font-medium tracking-[-0.025em] text-[#13202B]";
const linkClass = `flex h-[68px] items-center gap-2 whitespace-nowrap px-1 transition-colors no-underline hover:text-[#0F8AA8] ${DESKTOP_MENU_TEXT_CLASS}`;

function DesktopDropdown({ label, links, icon: Icon }: { label: string; links: MenuLink[]; icon: typeof Search }) {
  return (
    <div className="group relative flex h-[68px] items-center">
      <button type="button" className={`flex h-full items-center gap-2 border-0 bg-transparent px-1 transition-colors hover:text-[#0F8AA8] ${DESKTOP_MENU_TEXT_CLASS}`}>
        <Icon className="size-[18px] stroke-[1.8]" />{label}<ChevronDown className="size-3.5" />
      </button>
      <div className="invisible absolute left-1/2 top-[64px] z-50 w-[190px] -translate-x-1/2 translate-y-1 rounded-[10px] border border-[#DCE8ED] bg-white p-2 opacity-0 shadow-[0_12px_30px_rgba(18,48,71,0.12)] transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        {links.map((item) => (
          <Link
            key={`${item.to}-${item.label}`}
            to={item.to}
            className="flex min-h-10 items-center rounded-[7px] px-3 text-[12px] font-semibold text-[#6B7280] no-underline hover:bg-[#E8F6F9] hover:text-[#0F8AA8]"
          >
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
  const [locating, setLocating] = useState(false);
  const isAuthenticated = user !== null;
  const region =
    user?.preferredDistrict && SEOUL_DISTRICTS.includes(user.preferredDistrict)
      ? user.preferredDistrict
      : "중구";

  const handleRegionChange = (nextRegion: string) => {
    const normalizedRegion = nextRegion.trim();
    localStorage.setItem(REGION_STORAGE_KEY, normalizedRegion);

    // 로그인 중 위치 조회 결과를 인증 사용자 상태에도 반영해야
    // Header가 재렌더링/재마운트되어도 DB 초기값으로 되돌아가지 않는다.
    if (user) {
      useAuthStore.getState().setUser({
        ...user,
        preferredDistrict: normalizedRegion,
      });
    }

  };

  const handleLocate = () => {
    if (locating) return;

    const updateDistrictFromCoordinates = async (
      latitude: number,
      longitude: number,
      source: "localStorage" | "browser",
      accuracyMeters?: number,
    ) => {
      console.info(`[현재 위치 조회] ${source} 좌표`, {
        latitude,
        longitude,
        ...(accuracyMeters === undefined ? {} : { accuracyMeters }),
      });

      const { district } = await getCurrentDistrictApi(latitude, longitude);
      console.info("[현재 위치 조회] 변환된 자치구", district);
      if (!SEOUL_DISTRICTS.includes(district)) {
        throw new Error("현재 위치가 서울 지역이 아닙니다.");
      }
      handleRegionChange(district);
    };

    // 개발 모드에서는 데스크톱 위치 정확도에 영향받지 않도록
    // localStorage에 수동 입력한 테스트 좌표를 사용한다.
    // 운영 빌드에서는 이 분기를 타지 않고 아래 브라우저 위치 조회를 사용한다.
    if (import.meta.env.DEV) {
      const latitudeValue = localStorage.getItem(TEST_LATITUDE_STORAGE_KEY);
      const longitudeValue = localStorage.getItem(TEST_LONGITUDE_STORAGE_KEY);
      const latitude = Number(latitudeValue);
      const longitude = Number(longitudeValue);

      if (
        latitudeValue === null || longitudeValue === null ||
        !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180
      ) {
        window.alert(
          "개발자 도구에서 localStorage의 latitude와 longitude 값을 먼저 입력해 주세요.",
        );
        return;
      }

      setLocating(true);
      void updateDistrictFromCoordinates(latitude, longitude, "localStorage")
        .catch((error) => {
          const message = axios.isAxiosError(error)
            ? error.response?.data?.message
            : error instanceof Error
              ? error.message
              : undefined;
          window.alert(message || "테스트 좌표의 자치구를 확인할 수 없습니다.");
        })
        .finally(() => setLocating(false));
      return;
    }

    // 운영 모드에서는 기존 방식대로 브라우저의 실제 현재 위치를 사용한다.
    if (!navigator.geolocation) {
      window.alert("현재 브라우저에서는 위치 정보를 사용할 수 없습니다.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          await updateDistrictFromCoordinates(
            coords.latitude,
            coords.longitude,
            "browser",
            coords.accuracy,
          );
        } catch (error) {
          const message = axios.isAxiosError(error)
            ? error.response?.data?.message
            : error instanceof Error
              ? error.message
              : undefined;
          window.alert(message || "현재 위치의 자치구를 확인할 수 없습니다.");
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          window.alert("현재 위치를 확인하려면 위치 권한을 허용해 주세요.");
        } else if (error.code === error.TIMEOUT) {
          window.alert("위치 정보 요청 시간이 초과되었습니다. 다시 시도해 주세요.");
        } else {
          window.alert("현재 위치 정보를 가져올 수 없습니다.");
        }
      },
      // 이전 위치 캐시나 IP 기반의 대략적인 위치보다 현재 장치가 제공할 수
      // 있는 가장 정확한 좌표를 요청한다.
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
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
          {NAV_ITEMS.filter((item) => !item.hidden).map((item) => item.links ? (
            <DesktopDropdown key={item.label} label={item.label} links={item.links} icon={item.icon} />
          ) : (
            <NavLink key={item.label} to={item.to!} className={linkClass}><item.icon className="size-[18px] stroke-[1.8]" />{item.label}</NavLink>
          ))}
          {isAuthenticated && <DesktopDropdown label="마이페이지" links={MYPAGE_LINKS} icon={UserRound} />}
        </nav>

        <div className="hidden shrink-0 items-center gap-2.5 lg:flex">
          {isAuthenticated && <div className="flex h-[42px] items-center gap-1 text-[#123047]">
            <span className="text-[20px] font-extrabold">{region}</span>
            <button
              type="button"
              onClick={handleLocate}
              disabled={locating}
              aria-label="현재 위치로 자치구 찾기"
              title="내 위치 보기"
              className="flex size-8 items-center justify-center rounded-full border-0 bg-transparent text-[#69747C] transition-colors hover:bg-[#E8F6F9] hover:text-[#0F8AA8] disabled:cursor-wait disabled:opacity-60"
            >
              {locating ? <LoaderCircle className="size-[18px] animate-spin" /> : <LocateFixed className="size-[18px]" />}
            </button>
          </div>}
          {isAuthenticated ? (
            <>
              <span className="flex items-center gap-1.5 text-[13px] font-extrabold text-[#263329]"><UserRound className="size-4" />{user?.name}님</span>
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
            {NAV_ITEMS.filter((item) => !item.hidden).flatMap((item) => item.links ?? [{ to: item.to!, label: item.label }]).map((item) => (
              <Link key={`${item.to}-${item.label}`} to={item.to} onClick={() => setOpen(false)} className="flex min-h-11 items-center border-t border-[#f0f2ef] text-[13px] font-semibold text-[#505850] no-underline">{item.label}</Link>
            ))}
            {isAuthenticated && MYPAGE_LINKS.map((item) => <Link key={`${item.to}-${item.label}`} to={item.to} onClick={() => setOpen(false)} className="flex min-h-11 items-center border-t border-[#f0f2ef] text-[13px] font-semibold text-[#505850] no-underline">{item.label}</Link>)}
            {isAuthenticated && <div className="mt-3 flex items-center gap-2 border-t border-[#e5e8e4] pt-3 text-[13px] font-extrabold text-[#344037]">
              <span>내 지역</span>
              <span className="ml-auto text-[20px]">{region}</span>
              <button type="button" onClick={handleLocate} disabled={locating} aria-label="현재 위치로 자치구 찾기" title="내 위치 보기" className="flex size-9 items-center justify-center rounded-full border-0 bg-transparent text-[#69747C] hover:bg-[#E8F6F9] hover:text-[#0F8AA8] disabled:cursor-wait disabled:opacity-60">
                {locating ? <LoaderCircle className="size-[18px] animate-spin" /> : <LocateFixed className="size-[18px]" />}
              </button>
            </div>}
            <div className="mt-3 border-t border-[#e5e8e4] pt-3">
              {isAuthenticated ? <Button type="button" variant="outline" onClick={handleLogout} className="h-11 w-full rounded-[8px]">{user?.name}님 · 로그아웃</Button> : <Button asChild className="h-11 w-full rounded-[8px] bg-[#0F8AA8] text-white"><Link to="/login" onClick={() => setOpen(false)} className="no-underline">로그인</Link></Button>}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
