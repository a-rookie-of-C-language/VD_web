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
        // Since backend doesn't support GET /activities/:id, we fetch list and find it
        // Fetching a large page size to increase chance of finding it
        const response = await this.getActivities({ pageSize: 100 })
        return response.items.find(a => a.id === id)
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

    async updateActivity(id: string, activity: any): Promise<Activity> {
        const formData = new FormData()
        if (activity.name) formData.append('name', String(activity.name))
        if (activity.type) formData.append('type', String(activity.type))
        if (activity.description) formData.append('description', String(activity.description))
        if (activity.enrollmentStartTime) formData.append('enrollmentStartTime', String(activity.enrollmentStartTime))
        if (activity.enrollmentEndTime) formData.append('enrollmentEndTime', String(activity.enrollmentEndTime))
        if (activity.startTime) formData.append('startTime', String(activity.startTime))
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

    async enrollActivity(id: string, studentNo: string): Promise<EnrollmentResponse> {
        const token = localStorage.getItem('token')
        const response = await axios.post<EnrollmentResponse>(
            `${API_BASE_URL}/activities/${id}/enroll`,
            null,
            {
                params: { studentNo },
                headers: { Authorization: `Bearer ${String(token || '')}` }
            }
        )
        return response.data
    },

    async fetchMyActivities(): Promise<ActivityListResponse> {
        const token = localStorage.getItem('token')
        const response = await axios.get<{ code: number; message: string; data: ActivityListResponse }>(
            `${API_BASE_URL}/activities/MyActivities`,
            {
                headers: { Authorization: `Bearer ${String(token || '')}` }
            }
        )
        return response.data.data
    },

    async reviewActivity(id: string, approve: boolean): Promise<Activity> {
        const token = localStorage.getItem('token')
        const response = await axios.post<{ code: number; message: string; data: Activity }>(
            `${API_BASE_URL}/activities/${id}/review`,
            null,
            {
                params: { approve },
                headers: { Authorization: `Bearer ${String(token || '')}` }
            }
        )
        return response.data.data
    }
}
