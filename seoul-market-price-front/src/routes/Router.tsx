import {
    BrowserRouter,
    Routes,
    Route
} from "react-router-dom";


import LoginPage from "../pages/Login/LoginPage";
import SignupPage from "../pages/Signup/SignupPage";
import FindPasswordPage from "../pages/FindPassword/FindPasswordPage";
import FindIdPage from "../pages/FindId/FindIdPage";
import KakaoLoginPage from "../pages/KakaoLogin/KakaoLoginPage";
import MainPage from "../pages/Main/MainPage";
import RequireAuth from "./RequireAuth";


function Router() {


    return (

        <BrowserRouter>

            <Routes>


                <Route
                    path="/"
                    element={<LoginPage />}
                />
                
                <Route
                    path="/main"
                    element={
                        <RequireAuth>
                            <MainPage />
                        </RequireAuth>
                    }
                />

                <Route
                    path="/signup"
                    element={<SignupPage />}
                />


                {/* 아이디 찾기 */}
                <Route
                    path="/find-id"
                    element={<FindIdPage />}
                />



                <Route
                    path="/find-password"
                    element={<FindPasswordPage />}
                />



                <Route
                    path="/kakao-login"
                    element={<KakaoLoginPage />}
                />


            </Routes>


        </BrowserRouter>

    );

}


export default Router;
