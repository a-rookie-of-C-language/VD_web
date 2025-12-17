import { ActivityStatus } from './ActivityStatus'
import { ActivityType } from './ActivityType'

export interface Activity {
    id: string
    functionary: string
    name: string
    type: ActivityType
    description: string
    EnrollmentStartTime: string
    EnrollmentEndTime: string
    startTime: string
    expectedEndTime: string
    endTime: string
    CoverImage: string
    maxParticipants: number
    Attachment?: string[]
    attachment?: string[]
    attachments?: string[]
    participants: string[]
    status: ActivityStatus
    isFull: boolean
    reviewReason?: string
    duration: number
    rejectedReason?: string
    imported?: boolean
}
