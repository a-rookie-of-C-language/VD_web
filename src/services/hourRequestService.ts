import {httpRequest} from './http'
import type {Activity} from '@/entity/Activity'
import { API_BASE_URL } from '@/config'

export interface HourRequestData {
    name: string
    functionary: string
    type: string
    description?: string
    startTime: string
    endTime: string
    duration: number
    files?: Blob[]
}

export const hourRequestService = {
    async requestHours(data: HourRequestData): Promise<void> {
        const formData = new FormData()
        if (data.name) formData.append('name', data.name)
        if (data.functionary) formData.append('functionary', data.functionary)
        if (data.type) formData.append('type', data.type)
        if (data.description) formData.append('description', data.description)
        if (data.startTime) formData.append('startTime', data.startTime)
        if (data.endTime) formData.append('endTime', data.endTime)
        if (data.duration) formData.append('duration', String(data.duration))
        if (data.files && Array.isArray(data.files)) {
            data.files.forEach((f: Blob) => {
                if (f) formData.append('files', f)
            })
        }

        await httpRequest<{ code: number; message: string }>({
            method: 'post',
            url: `${API_BASE_URL}/activities/request_hours`,
            data: formData
        })
    },

    async getPendingRequests(): Promise<Activity[]> {
        const res = await httpRequest<{ data: { items: Activity[] } }>({
            method: 'get',
            url: `${API_BASE_URL}/activities/pending_requests`
        })
        return res.data.items || []
    },

    async reviewRequest(id: string, approved: boolean, reason?: string): Promise<void> {
        await httpRequest<{ code: number; message: string }>({
            method: 'post',
            url: `${API_BASE_URL}/activities/review_request/${id}`,
            params: {approved, reason}
        })
    },

    async getMyRequests(): Promise<Activity[]> {
        const res = await httpRequest<{ data: { items: Activity[] } }>({
            method: 'get',
            url: `${API_BASE_URL}/activities/my_requests`
        })
        return res.data.items || []
    }
}
