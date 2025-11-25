import axios from 'axios'
import type { LoginResponse, User } from '@/entity/User'

const API_BASE_URL = 'http://localhost:8080'

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
        const response = await axios.get<ApiResponse<LoginResponse>>(
            `${API_BASE_URL}/user/login`,
            {
                params: { studentNo, password }
            }
        )

        if (response.data.code === 200) {
            const userData = response.data.data

            // Store token in localStorage
            localStorage.setItem('token', userData.token)
            // Store normalized user info in cache
            localStorage.setItem('userInfo', JSON.stringify(userData))
            return userData
        } else {
            throw new Error(response.data.message)
        }
    },

    /**
     * Get user info from token
     */
    async getUserInfo(token?: string): Promise<User> {
        const authToken = token || localStorage.getItem('token')

        if (!authToken) {
            throw new Error('No token found')
        }

        const response = await axios.get<ApiResponse<User>>(
            `${API_BASE_URL}/user/getUser`,
            {
                params: { token: authToken }
            }
        )

        if (response.data.code === 200) {
            return response.data.data
        } else {
            throw new Error(response.data.message)
        }
    },

    /**
     * Get user by studentNo (for resolving names)
     */
    async getUserByStudentNo(studentNo: string): Promise<User> {
        const token = localStorage.getItem('token')
        const response = await axios.get<ApiResponse<User>>(
            `${API_BASE_URL}/user/getUserByStudentNo`,
            { params: { studentNo }, headers: { Authorization: `Bearer ${String(token || '')}` } }
        )
        if (response.data.code === 200) {
            return response.data.data
        } else {
            throw new Error(response.data.message)
        }
    },

    /**
     * Get cached user info from localStorage
     */
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
    }
}
