import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

import { isLogin } from "@/features/auth/utils/auth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface PublicRouteProps {
  children: ReactNode;
}

function PublicRoute({ children }: PublicRouteProps) {
  /*
    이미 로그인한 사용자

    회원가입 / 아이디찾기 / 비밀번호찾기
    접근 차단

    → 메인 페이지 이동

  */

  if (isLogin()) {
    return <Navigate to="/" replace />;
  }

  /*
    비로그인 사용자만 접근 가능

  */

  return (
    <div className="public-page-shell tw-scope flex min-h-screen w-full flex-col bg-[#fbfbf7]">
      <Header />
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />
    </div>
  );
}

export default PublicRoute;
