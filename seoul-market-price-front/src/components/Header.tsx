import { Link } from "react-router-dom";
import { getLoginUser, logout } from "@/features/auth/utils/auth";

export default function Header() {
  const loginUser = getLoginUser();

  const handleLogout = () => {
    logout();
    alert("로그아웃 되었습니다.");
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-[1000] w-full bg-white/95 backdrop-blur-md border-b border-[#e8ece6] shadow-sm [&_a]:no-underline">
      <div className="max-w-[1280px] mx-auto h-[76px] px-6 flex items-center justify-between gap-6">
        {/* 로고 */}
        <Link to="/" className="flex items-center gap-2 min-w-[240px] shrink-0 no-underline">
          <span className="text-[26px]">🥕</span>
          <span className="text-[#263329] text-[24px] font-black tracking-tight">싸.농</span>
          <span className="pl-2 border-l border-[#dfe4dd] text-[#899287] text-[12px] whitespace-nowrap">
            싸게 보는 농수산물
          </span>
        </Link>

        {/* 내비게이션 메뉴 */}
        <nav className="hidden md:flex items-center gap-6 text-[15px] font-bold text-[#445045]">
          <Link to="/" className="hover:text-[#4c9b55] transition-colors py-2 no-underline">
            홈
          </Link>

          {/* 가격 상세 정보 */}
          <div className="relative group py-2">
            <Link to="/price" className="flex items-center gap-1 hover:text-[#4c9b55] transition-colors no-underline">
              가격 상세 정보 <span className="text-[10px]">▼</span>
            </Link>
            <div className="absolute top-full left-0 hidden group-hover:block w-48 bg-white border border-[#e8ece6] rounded-[8px] shadow-lg py-2 text-[14px]">
              <Link to="/price" className="block px-4 py-2 hover:bg-[#f4f7f3] hover:text-[#4c9b55] no-underline">
                품목별 시세 조회
              </Link>
              <Link to="/price/detail" className="block px-4 py-2 hover:bg-[#f4f7f3] hover:text-[#4c9b55] no-underline">
                가격 추이 그래프
              </Link>
              <Link to="/price/detail" className="block px-4 py-2 hover:bg-[#f4f7f3] hover:text-[#4c9b55] no-underline">
                급상승 / 급락 품목
              </Link>
            </div>
          </div>

          {/* 자치구별 가격정보 */}
          <div className="relative group py-2">
            <Link to="/region-price" className="flex items-center gap-1 hover:text-[#4c9b55] transition-colors no-underline">
              자치구별 가격정보 <span className="text-[10px]">▼</span>
            </Link>
            <div className="absolute top-full left-0 hidden group-hover:block w-48 bg-white border border-[#e8ece6] rounded-[8px] shadow-lg py-2 text-[14px]">
              <Link to="/region-price" className="block px-4 py-2 hover:bg-[#f4f7f3] hover:text-[#4c9b55] no-underline">
                자치구 지도 비교
              </Link>
              <Link to="/region-price/my-area" className="block px-4 py-2 hover:bg-[#f4f7f3] hover:text-[#4c9b55] no-underline">
                자치구간 1:1 비교
              </Link>
            </div>
          </div>

          {/* 스마트 추천 */}
          <div className="relative group py-2">
            <Link to="/recommendation" className="flex items-center gap-1 hover:text-[#4c9b55] transition-colors no-underline">
              스마트 추천 <span className="text-[10px]">▼</span>
            </Link>
            <div className="absolute top-full left-0 hidden group-hover:block w-52 bg-white border border-[#e8ece6] rounded-[8px] shadow-lg py-2 text-[14px]">
              <Link to="/recommendation" className="block px-4 py-2 hover:bg-[#f4f7f3] hover:text-[#4c9b55] no-underline">
                오늘의 알뜰 품목
              </Link>
              <Link to="/recommendation" className="block px-4 py-2 hover:bg-[#f4f7f3] hover:text-[#4c9b55] no-underline">
                오늘의 가격하락 품목 추천
              </Link>
              <Link to="/recommendation" className="block px-4 py-2 hover:bg-[#f4f7f3] hover:text-[#4c9b55] no-underline">
                이달의 제철 농수산물
              </Link>
            </div>
          </div>

          {/* 고객센터 */}
          <div className="relative group py-2">
            <Link to="/board" className="flex items-center gap-1 hover:text-[#4c9b55] transition-colors no-underline">
              고객센터 <span className="text-[10px]">▼</span>
            </Link>
            <div className="absolute top-full left-0 hidden group-hover:block w-40 bg-white border border-[#e8ece6] rounded-[8px] shadow-lg py-2 text-[14px]">
              <Link to="/board" className="block px-4 py-2 hover:bg-[#f4f7f3] hover:text-[#4c9b55] no-underline">
                게시판 (공지사항)
              </Link>
              <Link to="/qna" className="block px-4 py-2 hover:bg-[#f4f7f3] hover:text-[#4c9b55] no-underline">
                질의응답
              </Link>
              <Link to="/faq" className="block px-4 py-2 hover:bg-[#f4f7f3] hover:text-[#4c9b55] no-underline">
                자주 묻는 질문
              </Link>
            </div>
          </div>

          {/* 마이페이지 */}
          <div className="relative group py-2">
            <Link to="/mypage" className="flex items-center gap-1 hover:text-[#4c9b55] transition-colors no-underline">
              마이페이지 <span className="text-[10px]">▼</span>
            </Link>
            <div className="absolute top-full right-0 hidden group-hover:block w-52 bg-white border border-[#e8ece6] rounded-[8px] shadow-lg py-2 text-[14px]">
              <Link to="/mypage" className="block px-4 py-2 hover:bg-[#f4f7f3] hover:text-[#4c9b55] no-underline">
                내 정보 수정
              </Link>
              <Link to="/mypage" className="block px-4 py-2 hover:bg-[#f4f7f3] hover:text-[#4c9b55] no-underline">
                관심품목 설정
              </Link>
              <Link to="/mypage" className="block px-4 py-2 hover:bg-[#f4f7f3] hover:text-[#4c9b55] no-underline">
                가격 변동 타겟 알림
              </Link>
            </div>
          </div>
        </nav>

        {/* 사용자 영역 */}
        <div className="flex items-center gap-3">
          {loginUser ? (
            <>
              <span className="text-[14px] font-bold text-[#344037]">
                {loginUser.name || "사용자"}님
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="h-[36px] px-3.5 border border-[#dce4da] bg-white text-[#526055] hover:bg-[#f4f7f3] font-bold text-[13px] rounded-[7px] cursor-pointer transition-colors"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="h-[36px] px-4 bg-[#57a764] hover:bg-[#438e4d] text-white font-bold text-[13px] rounded-[7px] flex items-center justify-center transition-colors no-underline"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
