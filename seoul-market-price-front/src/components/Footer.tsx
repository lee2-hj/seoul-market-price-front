export default function Footer() {
  return (
    <footer className="tw-scope w-full bg-[#92979C] text-white [font-family:'Pretendard','Noto_Sans_KR',Arial,sans-serif]">
      <div className="mx-auto flex min-h-[112px] w-[min(1280px,calc(100%-32px))] flex-col items-center justify-between gap-5 py-7 sm:w-[min(1280px,calc(100%-48px))] md:flex-row md:py-0">
        <div className="flex items-center gap-3">
          <img
            src="/logo-teal.png"
            alt="싸부 로고"
            className="h-[54px] w-auto object-contain"
          />
          <div className="flex flex-col">
            <strong className="text-[15px] font-extrabold tracking-[-0.03em]">SSABU</strong>
            <span className="text-[10px] text-white/80">싸게 보는 부동산</span>
          </div>
        </div>

        <div className="text-center text-[10px] leading-5 text-white/80 md:text-right">
          <p>본 서비스의 가격 정보는 공개 데이터를 기반으로 제공됩니다.</p>
          <p>© 2026 SSABU. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
