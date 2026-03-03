import {httpRequest} from './http'
import type {Activity} from '@/entity/Activity'
import type {ActivityType} from '@/entity/ActivityType'
import { API_BASE_URL } from '@/config'

export interface PendingActivityQueryParams {
    page?: number
    pageSize?: number
    type?: ActivityType
    functionary?: string
    name?: string
    submittedBy?: string
}

export const pendingActivityService = {
    async getPendingActivities(params: PendingActivityQueryParams = {}): Promise<{ items: Activity[], total: number }> {
        const res = await httpRequest<{
            code: number;
            message: string;
            data: { items: Activity[], total: number }
        }>({
            method: 'post',
            url: `${API_BASE_URL}/pending-activities/query`,
            data: params
        })
        return res.data
    },

    async getPendingActivityById(id: string): Promise<Activity> {
        const res = await httpRequest<{
            code: number;
            message: string;
            data: Activity
        }>({
            method: 'get',
            url: `${API_BASE_URL}/pending-activities/${id}`
        })
        return res.data
    },

    async approvePendingActivity(id: string): Promise<{ activityId: string }> {
        const res = await httpRequest<{
            code: number;
            message: string;
            data: { activityId: string }
        }>({
            method: 'post',
            url: `${API_BASE_URL}/pending-activities/${id}/approve`
        })
        return res.data
    },

    async rejectPendingActivity(id: string, reason?: string): Promise<void> {
        await httpRequest<{
            code: number;
            message: string
        }>({
            method: 'post',
            url: `${API_BASE_URL}/pending-activities/${id}/reject`,
            params: {reason}
        })
    },

    async deletePendingActivity(id: string): Promise<void> {
        await httpRequest<{
            code: number;
            message: string
        }>({
            method: 'delete',
            url: `${API_BASE_URL}/pending-activities/${id}`
        })
    }
}
