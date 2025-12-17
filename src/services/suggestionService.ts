import { httpRequest } from './http'

const API_BASE_URL = import.meta.env.DEV
    ? 'http://localhost:8080/api'
    : 'https://unscreenable-cathrine-unprejudicially.ngrok-free.dev/api'

export interface Suggestion {
    id: string
    title: string
    content: string
    createTime: string
    status: 'PENDING' | 'REPLIED'
    replyContent?: string
    replyTime?: string
    studentNo?: string
    username?: string
}

export interface SuggestionListResponse {
    items: Suggestion[]
    total: number
}

export const suggestionService = {
    async createSuggestion(data: { title: string; content: string }): Promise<void> {
        const token = localStorage.getItem('token')
        await httpRequest<any>({
            method: 'post',
            url: `${API_BASE_URL}/suggestions`,
            data,
            headers: { Authorization: `Bearer ${String(token || '')}` }
        })
    },

    async getMySuggestions(page: number = 1, pageSize: number = 10): Promise<SuggestionListResponse> {
        const token = localStorage.getItem('token')
        const res = await httpRequest<{ data: SuggestionListResponse }>({
            method: 'get',
            url: `${API_BASE_URL}/suggestions/my`,
            params: { page, pageSize },
            headers: { Authorization: `Bearer ${String(token || '')}` }
        })
        return res.data || { items: [], total: 0 }
    },

    async getAllSuggestions(page: number = 1, pageSize: number = 10, status?: string): Promise<SuggestionListResponse> {
        const token = localStorage.getItem('token')
        const res = await httpRequest<{ data: SuggestionListResponse }>({
            method: 'get',
            url: `${API_BASE_URL}/suggestions`,
            params: { page, pageSize, status },
            headers: { Authorization: `Bearer ${String(token || '')}` }
        })
        return res.data || { items: [], total: 0 }
    },

    async replySuggestion(id: string, replyContent: string): Promise<void> {
        const token = localStorage.getItem('token')
        await httpRequest<any>({
            method: 'post',
            url: `${API_BASE_URL}/suggestions/${id}/reply`,
            data: { replyContent },
            headers: { Authorization: `Bearer ${String(token || '')}` }
        })
    }
}
