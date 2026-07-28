import {
    BrowserRouter,
    Routes,
    Route
} from "react-router-dom";


import LoginPage from "../pages/Login/LoginPage";
import SignupPage from "../pages/Signup/SignupPage";
import FindPasswordPage from "../pages/FindPassword/FindPasswordPage";


function Router() {


    return (

        <BrowserRouter>

            <Routes>


                {/* 로그인 */}
                <Route
                    path="/"
                    element={<LoginPage />}
                />


                {/* 회원가입 */}
                <Route
                    path="/signup"
                    element={<SignupPage />}
                />


                {/* 비밀번호 찾기 */}
                <Route
                    path="/find-password"
                    element={<FindPasswordPage />}
                />


            </Routes>

        </BrowserRouter>

    );

}


export default Router;