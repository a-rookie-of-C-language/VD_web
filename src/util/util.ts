import { ActivityType } from '@/entity/ActivityType'
import { ActivityStatus } from '@/entity/ActivityStatus'

export const getActivityTypeLabel = (type: ActivityType): string => {
  const typeMap: Record<ActivityType, string> = {
    [ActivityType.COMMUNITY_SERVICE]: '社区服务',
    [ActivityType.CULTURE_SERVICE]: '文化服务',
    [ActivityType.EMERGENCY_RESCUE]: '应急救援',
    [ActivityType.ANIMAL_PROTECTION]: '动物保护',
    [ActivityType.POVERTY_ASSISTANCE]: '扶贫助困',
    [ActivityType.ELDERLY_DISABLED_ASSISTANCE]: '扶老助残',
    [ActivityType.MEDICAL_ASSISTANCE]: '慰病助医',
    [ActivityType.ORPHAN_EDUCATION_ASSISTANCE]: '救孤助学'
  }
  return typeMap[type] || type
}

export const getActivityTypeOptions = (): { value: ActivityType; label: string }[] => {
  return Object.values(ActivityType).map(type => ({
    value: type,
    label: getActivityTypeLabel(type)
  }))
}

export const getActivityStatusLabel = (status: ActivityStatus): string => {
  const statusMap: Record<ActivityStatus, string> = {
    [ActivityStatus.EnrollmentNotStart]: '未开始报名',
    [ActivityStatus.EnrollmentStarted]: '报名中',
    [ActivityStatus.EnrollmentEnded]: '报名结束',
    [ActivityStatus.ActivityStarted]: '活动进行中',
    [ActivityStatus.ActivityEnded]: '活动已结束',
    [ActivityStatus.UnderReview]: '审核中',
    [ActivityStatus.FailReview]: '审核失败'
  }
  return statusMap[status] || String(status)
}
