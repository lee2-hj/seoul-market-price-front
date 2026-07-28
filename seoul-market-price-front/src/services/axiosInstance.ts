import axios from "axios";


const axiosInstance = axios.create({

    // Spring Boot 서버 주소
    baseURL: "http://localhost:8080",

    headers: {

        "Content-Type": "application/json"

    },

    timeout: 5000

});


// 요청 전에 토큰 자동 추가
axiosInstance.interceptors.request.use(

    (config) => {


        const token =
            localStorage.getItem("accessToken");


        if (token) {

            config.headers.Authorization =
                `Bearer ${token}`;

        }


        return config;

    },


    (error) => {

        return Promise.reject(error);

    }

);



export default axiosInstance;