import { httpRequest } from './http'
import type { LoginResponse, User } from '@/entity/User'


const API_BASE_URL = 'https://unscreenable-cathrine-unprejudicially.ngrok-free.dev/api'

export interface ApiResponse<T> {
    code: number
    message: string
    data: T
}

export const userService = {
    /**
     * Login user
     */
    async login(studentNo: string, password: string): Promise<LoginResponse> {
        const res = await httpRequest<ApiResponse<LoginResponse>>({
            method: 'get',
            url: `${API_BASE_URL}/user/login`,
            params: { studentNo, password }
        })
        if (res.code === 200) {
            const userData = res.data

            // Store token in localStorage
            localStorage.setItem('token', userData.token)
            // Store normalized user info in cache
            localStorage.setItem('userInfo', JSON.stringify(userData))
            return userData
        } else {
            throw new Error(res.message)
        }
    },


    async getUserInfo(token?: string): Promise<User> {
        const authToken = token || localStorage.getItem('token')

        if (!authToken) {
            throw new Error('No token found')
        }

        const res = await httpRequest<ApiResponse<User>>({
            method: 'get',
            url: `${API_BASE_URL}/user/getUser`,
            headers: { Authorization: `Bearer ${authToken}` }
        })
        if (res.code === 200) {
            return res.data
        } else {
            throw new Error(res.message)
        }
    },

    async getUserByStudentNo(studentNo: string): Promise<User | null> {
        try {
            const res = await httpRequest<ApiResponse<User>>({
                method: 'get',
                url: `${API_BASE_URL}/user/getUserByStudentNo`,
                params: { studentNo }
            })
            if (res.code === 200) {
                return res.data
            }
            return null
        } catch {
            return null
        }
    },


    getCachedUserInfo(): User | null {
        const userInfoStr = localStorage.getItem('userInfo')
        if (userInfoStr) {
            try {
                return JSON.parse(userInfoStr)
            } catch {
                return null
            }
        }
        return null
    },

    /**
     * Logout user
     */
    logout(): void {
        localStorage.removeItem('token')
        localStorage.removeItem('userInfo')
    },

    async verifyToken(): Promise<string> {
        const token = localStorage.getItem('token')
        if (!token) return "No token"

        try {
            const res = await httpRequest<ApiResponse<any>>({
                method: 'get',
                url: `${API_BASE_URL}/user/verifyToken`,
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.code !== 200) {
                return res.message
            }
            return "Pass"
        } catch (e: any) {
            return e.message || "Verification failed"
        }
    },

    async getAllUsers(): Promise<User[]> {
        const token = localStorage.getItem('token')
        const res = await httpRequest<ApiResponse<User[]>>({
            method: 'get',
            url: `${API_BASE_URL}/user/listAll`,
            headers: { Authorization: `Bearer ${String(token || '')}` }
        })
        if (res.code === 200) {
            return res.data
        }
        return []
    }
}
