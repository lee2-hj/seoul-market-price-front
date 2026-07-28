import axiosInstance from "../../../services/axiosInstance";


interface LoginRequest {

    username: string;

    password: string;

}



export async function login(

    data: LoginRequest

) {


    const response = await axiosInstance.post(

        "/auth/login",

        data

    );


    return response.data;

}