import { httpRequest, withRetry } from './http'
import {API_BASE_URL} from "@/config.ts";


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

export interface ElkLogItem {
    timestamp: string
    level: string
    logger: string
    thread: string
    message: string
    service: string
    environment: string
}

export interface MiddlewareStatus {
    status: 'UP' | 'DOWN'
    detail: string
}

export interface DeveloperMetrics {
    timestamp: string
    backendStatus: string
    systemCpuUsage: number
    processCpuUsage: number
    jvmMemoryUsage: number
    systemMemoryUsage: number
    heapUsedMb: number
    heapMaxMb: number
    qps: number
    totalRequests: number
    websocketClients: number
    mysql: MiddlewareStatus
    rabbitmq: MiddlewareStatus
    elasticsearch: MiddlewareStatus
}

export interface BusinessOperationLogItem {
    timestamp: string
    operatorStudentNo: string
    operatorRole: string
    action: string
    targetType: string
    targetId: string
    targetName: string
    detail: string
    status: string
}

export const monitorService = {
    async getFilterOptions(): Promise<{ colleges: string[], grades: string[], clazzes: string[] }> {
        try {
            const res = await withRetry(() => httpRequest<{
                code: number
                data: { colleges: string[], grades: string[], clazzes: string[] }
            }>({
                method: 'get',
                url: `${API_BASE_URL}/monitoring/filters`
            }), { retries: 1 })
            return res.data
        } catch {
            return { colleges: [], grades: [], clazzes: [] }
        }
    },

    async getUserStats(params: UserStatsParams): Promise<{ total: number, records: UserStatItem[] }> {
        const res = await withRetry(() => httpRequest<{
            code: number
            data: { total: number, records: UserStatItem[] }
        }>({
            method: 'post',
            url: `${API_BASE_URL}/monitoring/user-stats`,
            data: params
        }), { retries: 1 })
        return res.data
    },

    async getDashboardData(
        timeRange: string = 'monthly',
        filters: { clazz?: string; grade?: string; college?: string } = {}
    ): Promise<MonitorDashboardData> {
        const params: Record<string, string> = { timeRange }
        if (filters.clazz) params.clazz = filters.clazz
        if (filters.grade) params.grade = filters.grade
        if (filters.college) params.college = filters.college

        const res = await withRetry(() => httpRequest<{
            code: number
            message: string
            data: MonitorDashboardData
        }>({
            method: 'get',
            url: `${API_BASE_URL}/monitoring/dashboard`,
            params
        }), { retries: 2 })
        return res.data
    },

    async getLogs(size = 50, keyword = ''): Promise<ElkLogItem[]> {
        const params: Record<string, string | number> = { size }
        if (keyword.trim()) {
            params.keyword = keyword.trim()
        }

        const res = await withRetry(() => httpRequest<{
            code: number
            message: string
            data: ElkLogItem[]
        }>({
            method: 'get',
            url: `${API_BASE_URL}/monitoring/logs`,
            params
        }), { retries: 2 })

        return Array.isArray(res.data) ? res.data : []
    },

    async getDeveloperMetrics(): Promise<DeveloperMetrics> {
        const res = await withRetry(() => httpRequest<{
            code: number
            message: string
            data: DeveloperMetrics
        }>({
            method: 'get',
            url: `${API_BASE_URL}/monitoring/developer-metrics`
        }), { retries: 2 })
        return res.data
    },

    async getBusinessLogs(size = 50, keyword = ''): Promise<BusinessOperationLogItem[]> {
        const params: Record<string, string | number> = { size }
        if (keyword.trim()) {
            params.keyword = keyword.trim()
        }
        const res = await withRetry(() => httpRequest<{
            code: number
            message: string
            data: BusinessOperationLogItem[]
        }>({
            method: 'get',
            url: `${API_BASE_URL}/monitoring/business-logs`,
            params
        }), { retries: 2 })
        return Array.isArray(res.data) ? res.data : []
    }
}
