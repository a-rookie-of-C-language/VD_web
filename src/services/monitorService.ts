import { httpRequest } from './http'

const API_BASE_URL = 'https://unscreenable-cathrine-unprejudicially.ngrok-free.dev/api'

export interface MonitorOverview {
    totalUsers: number
    totalActivities: number
    totalDuration: number
    totalParticipants: number
    completedActivities: number
    averageDuration: number
    newActivities: number
    activeUsers: number
}

export interface ClassificationStat {
    name: string
    userCount: number
    activityCount: number
    totalHours: number
    averageHours: number
}

export interface ClassificationStats {
    byGrade: ClassificationStat[]
    byCollege: ClassificationStat[]
    byClazz: ClassificationStat[]
}

export interface ActivityTypeDist {
    name: string
    value: number
}

export interface TopUser {
    rank: number
    studentNo: string
    name: string
    hours: number
}

export interface MonitorDashboardData {
    overview: MonitorOverview
    classificationStats: ClassificationStats
    activityTypes: ActivityTypeDist[]
    topUsers: TopUser[]
    growthRanking: TopUser[]
}

export interface UserStatsParams {
    page?: number
    pageSize?: number
    college?: string
    grade?: string
    clazz?: string
    sortField?: string
    sortOrder?: 'asc' | 'desc'
}

export interface UserStatItem {
    studentNo: string
    name: string
    college: string
    grade: string
    clazz: string
    totalDuration: number
    activityCount: number
    rank: number
}

export const monitorService = {
    async getFilterOptions(): Promise<{ colleges: string[], grades: string[], clazzes: string[] }> {
        const token = localStorage.getItem('token')
        try {
            const res = await httpRequest<{
                code: number
                data: { colleges: string[], grades: string[], clazzes: string[] }
            }>({
                method: 'get',
                url: `${API_BASE_URL}/monitoring/filters`,
                headers: { Authorization: `Bearer ${String(token || '')}` }
            })
            return res.data
        } catch (e) {
            console.warn('Failed to fetch filters from backend, returning empty.', e)
            return { colleges: [], grades: [], clazzes: [] }
        }
    },

    async getUserStats(params: UserStatsParams): Promise<{ total: number, records: UserStatItem[] }> {
        const token = localStorage.getItem('token')
        const res = await httpRequest<{
            code: number
            data: { total: number, records: UserStatItem[] }
        }>({
            method: 'post',
            url: `${API_BASE_URL}/monitoring/user-stats`,
            data: params,
            headers: { Authorization: `Bearer ${String(token || '')}` }
        })
        return res.data
    },

    async getDashboardData(
        timeRange: string = 'monthly',
        filters: { clazz?: string; grade?: string; college?: string } = {}
    ): Promise<MonitorDashboardData> {
        const token = localStorage.getItem('token')
        const params: any = { timeRange, ...filters }
        
        // Remove undefined or empty filters
        Object.keys(params).forEach(key => {
            if (params[key] === undefined || params[key] === '') {
                delete params[key]
            }
        })

        const res = await httpRequest<{
            code: number
            message: string
            data: MonitorDashboardData
        }>({
            method: 'get',
            url: `${API_BASE_URL}/monitoring/dashboard`,
            params,
            headers: { Authorization: `Bearer ${String(token || '')}` }
        })
        return res.data
    }
}
