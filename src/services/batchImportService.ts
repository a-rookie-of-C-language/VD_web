import {httpRequest} from './http'
import { API_BASE_URL } from '@/config'

export interface BatchImportItem {
    id: string
    batchId: string
    fileName: string
    status: string
    totalCount?: number
    successCount?: number
    failCount?: number
    createdAt?: string
    submittedBy?: string
    [key: string]: unknown
}

export const batchImportService = {
    async batchImportActivities(file: File): Promise<void> {
        const formData = new FormData()
        formData.append('file', file)

        await httpRequest<void>({
            method: 'post',
            url: `${API_BASE_URL}/pending-activities/batch-import`,
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        })
    },

    async getBatchImports(): Promise<BatchImportItem[]> {
        try {
            const res = await httpRequest<{
                code: number;
                message: string;
                data: {
                    total: number;
                    pageSize: number;
                    page: number;
                    list: BatchImportItem[];
                } | BatchImportItem[]
            }>({
                method: 'get',
                url: `${API_BASE_URL}/pending-activities/batch-import`
            })

            if (Array.isArray(res.data)) {
                return res.data
            } else if (res.data && Array.isArray(res.data.list)) {
                return res.data.list
            }
            return []
        } catch {
            return []
        }
    },

    async approveBatchImport(batchId: string): Promise<void> {
        await httpRequest<void>({
            method: 'post',
            url: `${API_BASE_URL}/pending-activities/batch-import/${batchId}/approve`
        })
    },

    async rejectBatchImport(batchId: string, reason?: string): Promise<void> {
        await httpRequest<void>({
            method: 'post',
            url: `${API_BASE_URL}/pending-activities/batch-import/${batchId}/reject`,
            params: {reason}
        })
    }
}
