export interface User {
    studentNo: string
    username: string
    role: 'user' | 'admin' | 'functionary' | 'superAdmin'
}

export interface LoginResponse {
    token: string
    studentNo: string
    username: string
    role: 'user' | 'admin' | 'functionary' | 'superAdmin'
}
