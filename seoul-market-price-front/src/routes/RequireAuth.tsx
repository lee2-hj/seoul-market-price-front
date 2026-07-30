import { useEffect } from "react";
import type { ReactNode } from "react";
import { isLogin } from "@/features/auth/utils/auth";
import { handleSessionExpired } from "@/features/auth/utils/session";


// accessToken 쿠키가 없으면(직접 삭제 등) 세션 만료 처리 후 로그인 페이지로 보낸다.
function RequireAuth({ children }: { children: ReactNode }) {

    const loggedIn = isLogin();

    useEffect(() => {

        if (!loggedIn) {

            void handleSessionExpired();

        }

    }, [loggedIn]);


    if (!loggedIn) {

        return null;

    }


    return <>{children}</>;

}

export default RequireAuth;
