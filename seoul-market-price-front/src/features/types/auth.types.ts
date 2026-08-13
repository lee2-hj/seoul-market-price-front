export interface LoginUser {
    userId: string;
    name: string;
    role: string;
    accessToken?: string;
}



export interface LoginRequest {

    userId: string;

    password: string;

}



export interface LoginResponse {

    accessToken: string;

    refreshToken: string;

    user: LoginUser;

}