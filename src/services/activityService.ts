import {httpRequest} from './http'
import type {Activity} from '@/entity/Activity'
import type {ActivityStatus} from '@/entity/ActivityStatus'
import type {ActivityType} from '@/entity/ActivityType'
import { API_BASE_URL } from '@/config'

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

export interface CreateActivityData {
    functionary?: string
    name?: string
    type?: string
    description?: string
    enrollmentStartTime?: string
    enrollmentEndTime?: string
    startTime?: string
    expectedEndTime?: string
    endTime?: string
    maxParticipants?: number
    status?: string
    duration?: number
    participants?: string[]
    attachment?: (File | undefined)[]
    coverFile?: File | null
}

export interface ImportActivityData {
    functionary?: string
    name?: string
    type?: string
    description?: string
    endTime?: string
    duration?: number
    participants?: string[]
    coverFile?: File | null
    file?: File
    attachment?: string[]
}

export interface ReviewParams {
    approve: boolean
    reason?: string
    [key: string]: unknown
}

class ActivityService {

    async getActivities(params: ActivityListParams = {}): Promise<ActivityListResponse> {
        const res = await httpRequest<{
            code: number;
            message: string;
            data: ActivityListResponse
        }>({
            method: 'post',
            url: `${API_BASE_URL}/activities/query`,
            data: params
        })
        return res.data || { items: [], total: 0, page: 1, pageSize: 10 }
    }


    async getActivityById(id: string): Promise<Activity | undefined> {
        try {
            const res = await httpRequest<{
                code: number;
                message: string;
                data: Activity
            }>({
                method: 'get',
                url: `${API_BASE_URL}/activities/${id}`
            })
            if (res.code === 200 && res.data) {
                return res.data
            }
        } catch {

        }
        return undefined
    }

    async createActivity(activity: CreateActivityData): Promise<Activity> {
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
            activity.attachment.forEach((a) => { if (a) formData.append('attachment', a) })
        }
        if (activity.coverFile) {
            formData.append('coverFile', activity.coverFile)
        }
        const res = await httpRequest<{ code: number; message: string; data: Activity }>({
            method: 'post',
            url: `${API_BASE_URL}/activities`,
            data: formData
        })
        return res.data
    }

    async importActivity(activity: ImportActivityData): Promise<Activity> {
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
            activity.attachment.forEach((a: string) => formData.append('attachmentFiles', a))
        }

        const res = await httpRequest<{
            code: number;
            message: string;
            data: Activity
        }>({
            method: 'post',
            url: `${API_BASE_URL}/activities/import`,
            data: formData
        })
        return res.data
    }

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
            activity.Attachment.forEach((a: unknown) => formData.append('attachment', a as Blob))
        }
        if (coverFile) {
            formData.append('coverFile', coverFile)
        }
        const res = await httpRequest<{ code: number; message: string; data: Activity }>({
            method: 'put',
            url: `${API_BASE_URL}/activities/${id}`,
            data: formData
        })
        return res.data
    }

    async deleteActivity(id: string): Promise<{ code: number; message: string }> {
        return await httpRequest<{ code: number; message: string }>({
            method: 'delete',
            url: `${API_BASE_URL}/activities/${id}`
        })
    }

    async enrollActivity(id: string): Promise<EnrollmentResponse> {
        return await httpRequest<EnrollmentResponse>({
            method: 'post',
            url: `${API_BASE_URL}/activities/${id}/enroll`
        })
    }

    async unenrollActivity(id: string): Promise<EnrollmentResponse> {
        return await httpRequest<EnrollmentResponse>({
            method: 'post',
            url: `${API_BASE_URL}/activities/${id}/unenroll`
        })
    }

    async fetchMyActivities(page: number = 1, pageSize: number = 10): Promise<ActivityListResponse> {
        const res = await httpRequest<{ code: number; message: string; data: ActivityListResponse }>({
            method: 'get',
            url: `${API_BASE_URL}/activities/MyActivities`,
            params: {page, pageSize}
        })
        return res.data
    }

    async reviewActivity(id: string, approve: boolean, reason?: string): Promise<Activity> {
        const params: ReviewParams = {approve}
        if (reason) params.reason = reason
        const res = await httpRequest<{ code: number; message: string; data: Activity }>({
            method: 'post',
            url: `${API_BASE_URL}/activities/${id}/review`,
            params
        })
        return res.data
    }

    async fetchMyStatus(): Promise<{ totalDuration: number; totalActivities: number; activities: Activity[] }> {
        const res = await httpRequest<{
            code: number
            message: string
            data: { totalDuration: number; totalActivities: number; activities: Activity[] }
        }>({
            method: 'get',
            url: `${API_BASE_URL}/activities/MyStatus`
        })
        return res.data
    }
}

export const activityService = new ActivityService()
