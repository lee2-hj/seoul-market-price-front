import { Link } from "react-router-dom";

const FOOTER_LINKS = [
  { to: "/price", label: "가격정보" },
  { to: "/region-price", label: "지역별 가격" },
  { to: "/notice", label: "공지사항" },
  { to: "/qna", label: "질의응답" },
  { to: "/mypage", label: "마이페이지" },
];

export default function Footer() {
  return (
    <footer className="tw-scope w-full bg-[#263329] text-white [font-family:'Pretendard','Noto_Sans_KR',Arial,sans-serif]">
      <div className="mx-auto flex w-[min(1280px,calc(100%-32px))] min-h-[180px] flex-col items-center justify-center gap-5 py-9 sm:w-[min(1280px,calc(100%-48px))] md:flex-row md:justify-between md:gap-[30px] md:py-0">
        <div className="flex items-center gap-2">
          <span className="text-[21px]">🥕</span>
          <strong className="text-[18px]">싸.농</strong>
          <small className="border-l border-[#4d594e] pl-2 text-[9px] text-[#9da99e]">
            싸게 보는 농수산물
          </small>
        </div>

        <div className="flex flex-wrap justify-center gap-x-[18px] gap-y-2 sm:gap-[22px]">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.to + link.label}
              to={link.to}
              className="text-[11px] text-[#bec8bf] no-underline transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <p className="text-[9px] text-[#818c82]">© 2026 싸농. All rights reserved.</p>
      </div>
    </footer>
  );
}
