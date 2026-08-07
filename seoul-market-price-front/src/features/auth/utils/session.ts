import { logout } from "./auth";


// 알럿이 여러 번 겹쳐 뜨는 것을 막기 위한 플래그
let handled = false;


// 세션 만료 처리
// 1. 쿠키/로컬 저장소의 토큰 정보를 모두 지운다.
// 2. 알럿으로 세션 만료를 안내한다.
// 3. 사용자가 확인을 누르면 로그인 페이지로 이동한다.
export async function handleSessionExpired(){

    if(handled){
        return;
    }

    handled = true;


    await logout();


    alert(
        "세션이 만료되었습니다."
    );


    window.location.href = "/login";

}
