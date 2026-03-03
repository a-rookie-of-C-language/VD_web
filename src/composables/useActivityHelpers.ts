import { ActivityStatus } from '@/entity/ActivityStatus'

/**
 * Shared activity status → Element Plus tag type mapping.
 * Used by AllActivities, detail, MyStats, MyProjects, AdminReview, RequestHours.
 */
export const getStatusTagType = (status: ActivityStatus): 'success' | 'warning' | 'info' | 'danger' | 'primary' | '' => {
  switch (status) {
    case ActivityStatus.EnrollmentStarted:
      return 'success'
    case ActivityStatus.EnrollmentNotStart:
      return 'info'
    case ActivityStatus.EnrollmentEnded:
    case ActivityStatus.ActivityStarted:
      return 'warning'
    case ActivityStatus.ActivityEnded:
      return 'info'
    case ActivityStatus.UnderReview:
      return 'warning'
    case ActivityStatus.FailReview:
      return 'danger'
    default:
      return 'info'
  }
}

/**
 * Format a date string to zh-CN locale display.
 */
export const formatDateZh = (dateString: string | undefined): string => {
  if (!dateString) return '暂无'
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Format a time range "start ~ end" for display.
 */
export const formatTimeRange = (start: string, end: string): string => {
  const fmt = (d: Date) =>
    d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(/\//g, '-')

  return `${fmt(new Date(start))} ~ ${fmt(new Date(end))}`
}

/**
 * Format a date-time string for API submission (ISO 8601 with +08:00 offset).
 */
export const formatDateTimeForApi = (dateStr: string): string => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}+08:00`
}
