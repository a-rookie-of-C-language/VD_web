import { httpRequest } from './http'
import type { Activity } from '@/entity/Activity'
import type { ActivityStatus } from '@/entity/ActivityStatus'
import type { ActivityType } from '@/entity/ActivityType'

const API_BASE_URL = 'https://unscreenable-cathrine-unprejudicially.ngrok-free.dev/api'

export interface ActivityListParams {
    page?: number
    pageSize?: number
    type?: ActivityType
    status?: ActivityStatus
    functionary?: string
    name?: string
    startFrom?: string
    startTo?: string
    isFull?: boolean
}

export interface ActivityListResponse {
    items: Activity[]
    total: number
    page: number
    pageSize: number
}

export interface EnrollmentResponse {
    code: number
    message: string
}

export const activityService = {

    async getActivities(params: ActivityListParams = {}): Promise<ActivityListResponse> {
        const token = localStorage.getItem('token')
        const res = await httpRequest<{
            code: number;
            message: string;
            data: ActivityListResponse
        }>({
            method: 'get',
            url: `${API_BASE_URL}/activities`,
            params,
            headers: { Authorization: `Bearer ${String(token || '')}` }
        })
        return res.data
    },


    async getActivityById(id: string): Promise<Activity | undefined> {
        const token = localStorage.getItem('token')

        // First try: Call backend API directly to get single activity
        try {
            const res = await httpRequest<{
                code: number;
                message: string;
                data: Activity
            }>({
                method: 'get',
                url: `${API_BASE_URL}/activities/${id}`,
                headers: { Authorization: `Bearer ${String(token || '')}` }
            })
            if (res.code === 200 && res.data) {
                return res.data
            }
        } catch (error) {
            console.warn(`Backend doesn't support GET /activities/${id}, falling back to list query`)
        }

        // Fallback: Fetch from list if direct API call fails
        // Try fetching with larger page sizes
        for (let pageSize of [500, 1000]) {
            try {
                const response = await this.getActivities({ pageSize })
                const found = response.items.find(a => a.id === id)
                if (found) return found
            } catch (error) {
                console.error(`Error fetching with pageSize ${pageSize}:`, error)
            }
        }
        return undefined
    },

    async createActivity(activity: any): Promise<Activity> {
        const formData = new FormData()
        if (activity.functionary) formData.append('functionary', String(activity.functionary))
        if (activity.name) formData.append('name', String(activity.name))
        if (activity.type) formData.append('type', String(activity.type))
        if (activity.description) formData.append('description', String(activity.description))
        if (activity.enrollmentStartTime) formData.append('enrollmentStartTime', String(activity.enrollmentStartTime))
        if (activity.enrollmentEndTime) formData.append('enrollmentEndTime', String(activity.enrollmentEndTime))
        if (activity.startTime) formData.append('startTime', String(activity.startTime))
        if (activity.expectedEndTime) formData.append('expectedEndTime', String(activity.expectedEndTime))
        if (activity.endTime) formData.append('endTime', String(activity.endTime))
        if (activity.maxParticipants !== undefined) formData.append('maxParticipants', String(activity.maxParticipants))
        if (activity.status) formData.append('status', String(activity.status))
        if (activity.duration !== undefined) formData.append('duration', String(activity.duration))
        if (activity.participants && Array.isArray(activity.participants)) {
            activity.participants.forEach((p: string) => formData.append('participants[]', p))
        }
        if (activity.attachment && Array.isArray(activity.attachment)) {
            activity.attachment.forEach((a: string) => formData.append('attachment[]', a))
        }
        if (activity.coverFile) {
            formData.append('coverFile', activity.coverFile)
        }
        const token = localStorage.getItem('token')
        const res = await httpRequest<{ code: number; message: string; data: Activity }>({
            method: 'post',
            url: `${API_BASE_URL}/activities`,
            data: formData,
            headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${String(token || '')}` }
        })
        return res.data
    },

    async importActivity(activity: any): Promise<Activity> {
        const formData = new FormData()
        if (activity.functionary) formData.append('functionary', String(activity.functionary))
        if (activity.name) formData.append('name', String(activity.name))
        if (activity.type) formData.append('type', String(activity.type))
        if (activity.description) formData.append('description', String(activity.description))
        if (activity.endTime) formData.append('endTime', String(activity.endTime))
        if (activity.duration !== undefined) formData.append('duration', String(activity.duration))
        if (activity.participants && Array.isArray(activity.participants)) {
            activity.participants.forEach((p: string) => formData.append('participants[]', p))
        }
        if (activity.coverFile) formData.append('coverFile', activity.coverFile)
        if (activity.file) formData.append('file', activity.file)
        if (activity.attachment && Array.isArray(activity.attachment)) {
            activity.attachment.forEach((a: string) => formData.append('attachment[]', a))
        }

        const token = localStorage.getItem('token')
        const res = await httpRequest<{
            code: number;
            message: string;
            data: Activity
        }>({
            method: 'post',
            url: `${API_BASE_URL}/activities/import`,
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: `Bearer ${String(token || '')}`
            }
        })
        return res.data
    },

    async getPendingActivities(params: {
        page?: number
        pageSize?: number
        type?: ActivityType
        functionary?: string
        name?: string
        submittedBy?: string
    } = {}): Promise<{ items: Activity[], total: number }> {
        const token = localStorage.getItem('token')
        const res = await httpRequest<{
            code: number;
            message: string;
            data: { items: Activity[], total: number }
        }>({
            method: 'get',
            url: `${API_BASE_URL}/pending-activities`,
            params,
            headers: { Authorization: `Bearer ${String(token || '')}` }
        })
        return res.data
    },

    async getPendingActivityById(id: string): Promise<Activity> {
        const token = localStorage.getItem('token')
        const res = await httpRequest<{
            code: number;
            message: string;
            data: Activity
        }>({
            method: 'get',
            url: `${API_BASE_URL}/pending-activities/${id}`,
            headers: { Authorization: `Bearer ${String(token || '')}` }
        })
        return res.data
    },

    async approvePendingActivity(id: string): Promise<{ activityId: string }> {
        const token = localStorage.getItem('token')
        const res = await httpRequest<{
            code: number;
            message: string;
            data: { activityId: string }
        }>({
            method: 'post',
            url: `${API_BASE_URL}/pending-activities/${id}/approve`,
            headers: { Authorization: `Bearer ${String(token || '')}` }
        })
        return res.data
    },

    async rejectPendingActivity(id: string, reason?: string): Promise<void> {
        const token = localStorage.getItem('token')
        await httpRequest<{
            code: number;
            message: string
        }>({
            method: 'post',
            url: `${API_BASE_URL}/pending-activities/${id}/reject`,
            params: { reason },
            headers: { Authorization: `Bearer ${String(token || '')}` }
        })
    },

    async deletePendingActivity(id: string): Promise<void> {
        const token = localStorage.getItem('token')
        await httpRequest<{
            code: number;
            message: string
        }>({
            method: 'delete',
            url: `${API_BASE_URL}/pending-activities/${id}`,
            headers: { Authorization: `Bearer ${String(token || '')}` }
        })
    },

    async updateActivity(id: string, activity: Partial<Activity>, coverFile?: File): Promise<Activity> {
        const formData = new FormData()
        if (activity.name) formData.append('name', String(activity.name))
        if (activity.type) formData.append('type', String(activity.type))
        if (activity.description) formData.append('description', String(activity.description))
        if (activity.EnrollmentStartTime) formData.append('enrollmentStartTime', String(activity.EnrollmentStartTime))
        if (activity.EnrollmentEndTime) formData.append('enrollmentEndTime', String(activity.EnrollmentEndTime))
        if (activity.startTime) formData.append('startTime', String(activity.startTime))
        if (activity.expectedEndTime) formData.append('expectedEndTime', String(activity.expectedEndTime))
        if (activity.endTime) formData.append('endTime', String(activity.endTime))
        if (activity.maxParticipants !== undefined) formData.append('maxParticipants', String(activity.maxParticipants))
        if (activity.status) formData.append('status', String(activity.status))
        if (activity.duration !== undefined) formData.append('duration', String(activity.duration))
        if (activity.reviewReason) formData.append('reviewReason', String(activity.reviewReason))
        if (activity.participants && Array.isArray(activity.participants)) {
            activity.participants.forEach((p: string) => formData.append('participants[]', p))
        }
        if (activity.Attachment && Array.isArray(activity.Attachment)) {
            activity.Attachment.forEach((a: string) => formData.append('attachment[]', a))
        }
        if (coverFile) {
            formData.append('coverFile', coverFile)
        }
        const token = localStorage.getItem('token')
        const res = await httpRequest<{ code: number; message: string; data: Activity }>({
            method: 'put',
            url: `${API_BASE_URL}/activities/${id}`,
            data: formData,
            headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${String(token || '')}` }
        })
        return res.data
    },

    async deleteActivity(id: string): Promise<{ code: number; message: string }> {
        const token = localStorage.getItem('token')
        const res = await httpRequest<{ code: number; message: string }>({
            method: 'delete',
            url: `${API_BASE_URL}/activities/${id}`,
            headers: { Authorization: `Bearer ${String(token || '')}` }
        })
        return res
    },

    async enrollActivity(id: string): Promise<EnrollmentResponse> {
        const token = localStorage.getItem('token')
        const res = await httpRequest<EnrollmentResponse>({
            method: 'post',
            url: `${API_BASE_URL}/activities/${id}/enroll`,
            headers: { Authorization: `Bearer ${String(token || '')}` }
        })
        return res
    },

    async unenrollActivity(id: string): Promise<EnrollmentResponse> {
        const token = localStorage.getItem('token')
        const res = await httpRequest<EnrollmentResponse>({
            method: 'post',
            url: `${API_BASE_URL}/activities/${id}/unenroll`,
            headers: { Authorization: `Bearer ${String(token || '')}` }
        })
        return res
    },

    async fetchMyActivities(page: number = 1, pageSize: number = 10): Promise<ActivityListResponse> {
        const token = localStorage.getItem('token')
        const res = await httpRequest<{ code: number; message: string; data: ActivityListResponse }>({
            method: 'get',
            url: `${API_BASE_URL}/activities/MyActivities`,
            params: { page, pageSize },
            headers: { Authorization: `Bearer ${String(token || '')}` }
        })
        return res.data
    },

    async reviewActivity(id: string, approve: boolean, reason?: string): Promise<Activity> {
        const token = localStorage.getItem('token')
        const params: any = { approve }
        if (reason) params.reason = reason
        const res = await httpRequest<{ code: number; message: string; data: Activity }>({
            method: 'post',
            url: `${API_BASE_URL}/activities/${id}/review`,
            params,
            headers: { Authorization: `Bearer ${String(token || '')}` }
        })
        return res.data
    },

    async fetchMyStatus(): Promise<{ totalDuration: number; totalActivities: number; activities: Activity[] }> {
        const token = localStorage.getItem('token')
        const res = await httpRequest<{
            code: number
            message: string
            data: { totalDuration: number; totalActivities: number; activities: Activity[] }
        }>({
            method: 'get',
            url: `${API_BASE_URL}/activities/MyStatus`,
            headers: { Authorization: `Bearer ${String(token || '')}` }
        })
        return res.data
    },

    // --- Personal Hour Requests ---

    async requestHours(data: any): Promise<void> {
        const formData = new FormData()
        if (data.name) formData.append('name', data.name)
        if (data.functionary) formData.append('functionary', data.functionary)
        if (data.type) formData.append('type', data.type)
        if (data.description) formData.append('description', data.description)
        if (data.startTime) formData.append('startTime', data.startTime)
        if (data.endTime) formData.append('endTime', data.endTime)
        if (data.duration) formData.append('duration', String(data.duration))
        if (data.files && Array.isArray(data.files)) {
            data.files.forEach((f: File) => formData.append('files[]', f))
        }

        const token = localStorage.getItem('token')
        await httpRequest<any>({
            method: 'post',
            url: `${API_BASE_URL}/activities/request_hours`,
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: `Bearer ${String(token || '')}`
            }
        })
    },

    async getPendingRequests(): Promise<Activity[]> {
        const token = localStorage.getItem('token')
        const res = await httpRequest<{ data: { items: Activity[] } }>({
            method: 'get',
            url: `${API_BASE_URL}/activities/pending_requests`,
            headers: { Authorization: `Bearer ${String(token || '')}` }
        })
        return res.data.items || []
    },

    async reviewRequest(id: string, approved: boolean, reason?: string): Promise<void> {
        const token = localStorage.getItem('token')
        await httpRequest<any>({
            method: 'post',
            url: `${API_BASE_URL}/activities/review_request/${id}`,
            data: { approved, reason },
            headers: { Authorization: `Bearer ${String(token || '')}` }
        })
    },

    async getMyRequests(): Promise<Activity[]> {
        const token = localStorage.getItem('token')
        const res = await httpRequest<{ data: { items: Activity[] } }>({
            method: 'get',
            url: `${API_BASE_URL}/activities/my_requests`,
            headers: { Authorization: `Bearer ${String(token || '')}` }
        })
        return res.data.items || []
    }
}
