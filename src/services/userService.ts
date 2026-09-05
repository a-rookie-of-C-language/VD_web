import {httpRequest} from './http'
import type {LoginResponse, User} from '@/entity/User'
import {API_BASE_URL} from '@/config'

export interface ApiResponse<T> {
    code: number
    message: string
    data: T
}

const VERIFY_CACHE_TTL_MS = 30_000

let lastVerifyAt = 0
let lastVerifyResult = 'No token'
let verifyInFlight: Promise<string> | null = null

function clearVerifyCache(): void {
    lastVerifyAt = 0
    lastVerifyResult = 'No token'
    verifyInFlight = null
}

export const userService = {
    async login(studentNo: string, password: string): Promise<LoginResponse> {
        const response = await httpRequest<ApiResponse<LoginResponse>>({
            method: 'post',
            url: `${API_BASE_URL}/user/login`,
            data: { studentNo, password }
        })
        if (response.code === 200) {
            const userData = response.data
            localStorage.setItem('token', userData.token)
            localStorage.setItem('userInfo', JSON.stringify(userData))
            lastVerifyAt = Date.now()
            lastVerifyResult = 'Pass'
            return userData
        }
        throw new Error(response.message)
    },

    async getUserInfo(token?: string): Promise<User> {
        const headers: Record<string, string> = {}
        if (token) {
            headers['Authorization'] = `Bearer ${token}`
        }

        const res = await httpRequest<ApiResponse<User>>({
            method: 'get',
            url: `${API_BASE_URL}/user/getUser`,
            ...(token ? { headers } : {})
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
                params: {studentNo}
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

    logout(): void {
        localStorage.removeItem('token')
        localStorage.removeItem('userInfo')
        clearVerifyCache()
    },

    async verifyToken(force = false): Promise<string> {
        const token = localStorage.getItem('token')
        if (!token) {
            clearVerifyCache()
            return "No token"
        }

        const now = Date.now()
        if (!force && lastVerifyAt > 0 && (now - lastVerifyAt) < VERIFY_CACHE_TTL_MS) {
            return lastVerifyResult
        }

        if (verifyInFlight) {
            return verifyInFlight
        }

        verifyInFlight = (async () => {
            try {
                const timeoutPromise = new Promise<string>((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), 5000)
                )

                const verifyPromise = httpRequest<ApiResponse<unknown>>({
                    method: 'get',
                    url: `${API_BASE_URL}/user/verifyToken`
                }).then(res => {
                    if (res.code !== 200) {
                        return res.message
                    }
                    return "Pass"
                })

                const result = await Promise.race([verifyPromise, timeoutPromise])
                lastVerifyAt = Date.now()
                lastVerifyResult = result
                return result
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : 'Verification failed'
                lastVerifyAt = Date.now()
                lastVerifyResult = message
                return message
            } finally {
                verifyInFlight = null
            }
        })()

        return verifyInFlight
    },

    async getAllUsers(): Promise<User[]> {
        const res = await httpRequest<ApiResponse<User[]>>({
            method: 'get',
            url: `${API_BASE_URL}/user/listAll`
        })
        if (res.code === 200) {
            return res.data
        }
        return []
    }
}
