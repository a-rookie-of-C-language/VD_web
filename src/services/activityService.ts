import axios from 'axios'
import type { Activity } from '@/entity/Activity'
import type { ActivityStatus } from '@/entity/ActivityStatus'
import type { ActivityType } from '@/entity/ActivityType'

const API_BASE_URL = 'http://localhost:8080/api'

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
        const response = await axios.get<{
            code: number;
            message: string;
            data: ActivityListResponse
        }>(`${API_BASE_URL}/activities`, {
            params,
            headers: { Authorization: `Bearer ${String(token || '')}` }
        })
        return response.data.data
    },


    async getActivityById(id: string): Promise<Activity | undefined> {
        const token = localStorage.getItem('token')

        // First try: Call backend API directly to get single activity
        try {
            const response = await axios.get<{
                code: number;
                message: string;
                data: Activity
            }>(`${API_BASE_URL}/activities/${id}`, {
                headers: { Authorization: `Bearer ${String(token || '')}` }
            })
            if (response.data.code === 200 && response.data.data) {
                return response.data.data
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
        const response = await axios.post<{ code: number; message: string; data: Activity }>(
            `${API_BASE_URL}/activities`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${String(token || '')}` } }
        )
        return response.data.data
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
        const response = await axios.post<{
            code: number;
            message: string;
            data: Activity
        }>(`${API_BASE_URL}/activities/import`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: `Bearer ${String(token || '')}`
            }
        })
        return response.data.data
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
        const response = await axios.get<{
            code: number;
            message: string;
            data: { items: Activity[], total: number }
        }>(`${API_BASE_URL}/pending-activities`, {
            params,
            headers: { Authorization: `Bearer ${String(token || '')}` }
        })
        return response.data.data
    },

    async getPendingActivityById(id: string): Promise<Activity> {
        const token = localStorage.getItem('token')
        const response = await axios.get<{
            code: number;
            message: string;
            data: Activity
        }>(`${API_BASE_URL}/pending-activities/${id}`, {
            headers: { Authorization: `Bearer ${String(token || '')}` }
        })
        return response.data.data
    },

    async approvePendingActivity(id: string): Promise<{ activityId: string }> {
        const token = localStorage.getItem('token')
        const response = await axios.post<{
            code: number;
            message: string;
            data: { activityId: string }
        }>(`${API_BASE_URL}/pending-activities/${id}/approve`, null, {
            headers: { Authorization: `Bearer ${String(token || '')}` }
        })
        return response.data.data
    },

    async rejectPendingActivity(id: string, reason?: string): Promise<void> {
        const token = localStorage.getItem('token')
        await axios.post<{
            code: number;
            message: string
        }>(`${API_BASE_URL}/pending-activities/${id}/reject`, null, {
            params: { reason },
            headers: { Authorization: `Bearer ${String(token || '')}` }
        })
    },

    async deletePendingActivity(id: string): Promise<void> {
        const token = localStorage.getItem('token')
        await axios.delete<{
            code: number;
            message: string
        }>(`${API_BASE_URL}/pending-activities/${id}`, {
            headers: { Authorization: `Bearer ${String(token || '')}` }
        })
    },

    async updateActivity(id: string, activity: Partial<Activity>, coverFile?: File): Promise<Activity> {
        const formData = new FormData()
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
        if (activity.reviewReason) formData.append('reviewReason', String(activity.reviewReason))
        if (activity.participants && Array.isArray(activity.participants)) {
            activity.participants.forEach((p: string) => formData.append('participants[]', p))
        }
        if (activity.qualifiedParticipants && Array.isArray(activity.qualifiedParticipants)) {
            activity.qualifiedParticipants.forEach((p: string) => formData.append('qualifiedParticipants[]', p))
        }
        if (activity.attachment && Array.isArray(activity.attachment)) {
            activity.attachment.forEach((a: string) => formData.append('attachment[]', a))
        }
        if (activity.coverFile) {
            formData.append('coverFile', activity.coverFile)
        }
        const token = localStorage.getItem('token')
        const response = await axios.put<{ code: number; message: string; data: Activity }>(
            `${API_BASE_URL}/activities/${id}`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${String(token || '')}` } }
        )
        return response.data.data
    },

    async deleteActivity(id: string): Promise<{ code: number; message: string }> {
        const token = localStorage.getItem('token')
        const response = await axios.delete<{ code: number; message: string }>(
            `${API_BASE_URL}/activities/${id}`,
            { headers: { Authorization: `Bearer ${String(token || '')}` } }
        )
        return response.data
    },

    async enrollActivity(id: string): Promise<EnrollmentResponse> {
        const token = localStorage.getItem('token')
        const response = await axios.post<EnrollmentResponse>(
            `${API_BASE_URL}/activities/${id}/enroll`,
            null,
            {
                headers: { Authorization: `Bearer ${String(token || '')}` }
            }
        )
        return response.data
    },

    async unenrollActivity(id: string): Promise<EnrollmentResponse> {
        const token = localStorage.getItem('token')
        const response = await axios.post<EnrollmentResponse>(
            `${API_BASE_URL}/activities/${id}/unenroll`,
            null,
            {
                headers: { Authorization: `Bearer ${String(token || '')}` }
            }
        )
        return response.data
    },

    async fetchMyActivities(page: number = 1, pageSize: number = 10): Promise<ActivityListResponse> {
        const token = localStorage.getItem('token')
        const response = await axios.get<{ code: number; message: string; data: ActivityListResponse }>(
            `${API_BASE_URL}/activities/MyActivities`,
            {
                params: { page, pageSize },
                headers: { Authorization: `Bearer ${String(token || '')}` }
            }
        )
        return response.data.data
    },

    async reviewActivity(id: string, approve: boolean, reason?: string): Promise<Activity> {
        const token = localStorage.getItem('token')
        const params: any = { approve }
        if (reason) params.reason = reason
        const response = await axios.post<{ code: number; message: string; data: Activity }>(
            `${API_BASE_URL}/activities/${id}/review`,
            null,
            {
                params,
                headers: { Authorization: `Bearer ${String(token || '')}` }
            }
        )
        return response.data.data
    },

    async fetchMyStatus(): Promise<{ totalDuration: number; totalActivities: number; activities: Activity[] }> {
        const token = localStorage.getItem('token')
        const response = await axios.get<{
            code: number
            message: string
            data: { totalDuration: number; totalActivities: number; activities: Activity[] }
        }>(`${API_BASE_URL}/activities/MyStatus`, {
            headers: { Authorization: `Bearer ${String(token || '')}` }
        })
        return response.data.data
    }
}
