import { httpRequest } from './http'
import { API_BASE_URL } from '@/config'

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
        await httpRequest<{ code: number; message: string }>({
            method: 'post',
            url: `${API_BASE_URL}/suggestions`,
            data
        })
    },

    async getMySuggestions(page: number = 1, pageSize: number = 10): Promise<SuggestionListResponse> {
        const res = await httpRequest<{ data: SuggestionListResponse }>({
            method: 'get',
            url: `${API_BASE_URL}/suggestions/my`,
            params: { page, pageSize }
        })
        return res.data || { items: [], total: 0 }
    },

    async getAllSuggestions(page: number = 1, pageSize: number = 10, status?: string): Promise<SuggestionListResponse> {
        const res = await httpRequest<{ data: SuggestionListResponse }>({
            method: 'get',
            url: `${API_BASE_URL}/suggestions`,
            params: { page, pageSize, status }
        })
        return res.data || { items: [], total: 0 }
    },

    async replySuggestion(id: string, replyContent: string): Promise<void> {
        await httpRequest<{ code: number; message: string }>({
            method: 'post',
            url: `${API_BASE_URL}/suggestions/${id}/reply`,
            data: { replyContent }
        })
    }
}
