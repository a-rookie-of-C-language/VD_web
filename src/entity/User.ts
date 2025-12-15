export interface User {
    studentNo: string
    username: string
    role: 'user' | 'admin' | 'functionary' | 'superAdmin'
    clazz?: string
    grade?: string
    college?: string
}

export interface LoginResponse {
    token: string
    studentNo: string
    username: string
    role: 'user' | 'admin' | 'functionary' | 'superAdmin'
}
