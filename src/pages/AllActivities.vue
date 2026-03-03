<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Calendar, User as UserIcon, Clock } from '@element-plus/icons-vue'
import { activityService, type ActivityListParams } from '@/services/activityService'
import type { Activity } from '@/entity/Activity'
import { ActivityStatus } from '@/entity/ActivityStatus'
import { ActivityType } from '@/entity/ActivityType'
import {userService} from "@/services/userService.ts";
import { getActivityTypeLabel, getActivityStatusLabel, getCoverImageUrl } from '@/util/util'
import PageHeader from '@/components/PageHeader.vue'
import defaultActivityImage from '@/image/activity-card-bg.png'

// State
const activities = ref<Activity[]>([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(6)
const total = ref(0)

// Filters
const searchName = ref('')
const selectedType = ref<ActivityType | ''>('')
const selectedStatus = ref<ActivityStatus | ''>('')
const selectedFunctionary = ref('')
const filterIsFull = ref<boolean | ''>('')
const filterParams = computed<ActivityListParams>(() => {
  const params: ActivityListParams = {
    page: currentPage.value,
    pageSize: pageSize.value
  }
  
  if (searchName.value) params.name = searchName.value
  if (selectedType.value) params.type = selectedType.value
  if (selectedStatus.value) params.status = selectedStatus.value
  if (selectedFunctionary.value) params.functionary = selectedFunctionary.value
  if (filterIsFull.value !== '') params.isFull = filterIsFull.value as boolean
  
  return params
})

// Fetch activities from API
const fetchActivities = async () => {
  loading.value = true
  try {
    const response = await activityService.getActivities(filterParams.value)
    activities.value = (response?.items || []).filter(a => a.status !== ActivityStatus.UnderReview
        && a.status !== ActivityStatus.FailReview)
    total.value = response?.total || 0
    currentPage.value = response?.page || 1
  } catch (error) {
    console.error('Failed to fetch activities:', error)
    ElMessage.error('加载活动列表失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// Handle page change
const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchActivities()
}

// Handle filter change
const handleFilterChange = () => {
  currentPage.value = 1
  fetchActivities()
}

// Format date for display
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Get status display text
const getStatusText = getActivityStatusLabel

// Get activity type display text
const getTypeText = getActivityTypeLabel

// Get participant count safely
const getParticipantCount = (activity: Activity): string => {
  const current = activity.participants?.length ?? 0
  const max = activity.maxParticipants ?? 0
  return `${current}/${max}`
}

const getStatusType = (status: ActivityStatus): 'success' | 'warning' | 'info' | 'danger' => {
  switch (status) {
    case ActivityStatus.EnrollmentStarted: return 'success'
    case ActivityStatus.EnrollmentNotStart: return 'info'
    case ActivityStatus.EnrollmentEnded:
    case ActivityStatus.ActivityStarted: return 'warning'
    case ActivityStatus.ActivityEnded: return 'info'
    case ActivityStatus.UnderReview: return 'info'
    case ActivityStatus.FailReview: return 'danger'
    default: return 'info'
  }
}


const nameMap = ref<Record<string, string>>({})
const getUsername = (studentNo: string): string => {
  const cached = nameMap.value[studentNo]
  if (cached) return cached
  userService.getUserByStudentNo(studentNo)
    .then(user => { nameMap.value[studentNo] = user?.username || studentNo })
    .catch(() => {})
  return studentNo
}

// Initialize
onMounted(() => {
  fetchActivities()
})
</script>

<template>
  <div class="activities-page">
    <PageHeader title="活动列表" subtitle="发现并参与各类志愿公益活动">
      <template #controls>
        <span class="total-badge">共 {{ total }} 项活动</span>
      </template>
    </PageHeader>

    <div class="page-body">
      <div class="filter-bar">
        <el-input
          v-model="searchName"
          placeholder="搜索活动名称..."
          :prefix-icon="Search"
          clearable
          @change="handleFilterChange"
          class="filter-input"
        />
        <el-select
          v-model="selectedType"
          placeholder="活动类型"
          clearable
          @change="handleFilterChange"
          class="filter-select"
        >
          <el-option label="社区服务" :value="ActivityType.COMMUNITY_SERVICE" />
          <el-option label="文化服务" :value="ActivityType.CULTURE_SERVICE" />
          <el-option label="应急救援" :value="ActivityType.EMERGENCY_RESCUE" />
          <el-option label="动物保护" :value="ActivityType.ANIMAL_PROTECTION" />
          <el-option label="扶贫助困" :value="ActivityType.POVERTY_ASSISTANCE" />
          <el-option label="扶老助残" :value="ActivityType.ELDERLY_DISABLED_ASSISTANCE" />
          <el-option label="慰病助医" :value="ActivityType.MEDICAL_ASSISTANCE" />
          <el-option label="救孤助学" :value="ActivityType.ORPHAN_EDUCATION_ASSISTANCE" />
        </el-select>
        <el-select
          v-model="selectedStatus"
          placeholder="活动状态"
          clearable
          @change="handleFilterChange"
          class="filter-select"
        >
          <el-option label="未开始报名" :value="ActivityStatus.EnrollmentNotStart" />
          <el-option label="报名中" :value="ActivityStatus.EnrollmentStarted" />
          <el-option label="报名结束" :value="ActivityStatus.EnrollmentEnded" />
          <el-option label="活动进行中" :value="ActivityStatus.ActivityStarted" />
          <el-option label="活动已结束" :value="ActivityStatus.ActivityEnded" />
        </el-select>
        <el-select
          v-model="filterIsFull"
          placeholder="是否满员"
          clearable
          @change="handleFilterChange"
          class="filter-select"
        >
          <el-option label="未满员" :value="false" />
          <el-option label="已满员" :value="true" />
        </el-select>
      </div>

      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>

      <div v-else-if="activities.length > 0" class="activities-grid">
        <div
          v-for="activity in activities"
          :key="activity.id"
          class="activity-card"
          @click="$router.push(`/app/activity/${activity.id}`)"
        >
          <div class="card-img-wrap">
            <el-image
              :src="activity.CoverImage ? getCoverImageUrl(activity.CoverImage) : defaultActivityImage"
              :alt="activity.name"
              class="card-img"
              fit="cover"
              lazy
            >
              <template #placeholder>
                <div class="card-img-placeholder" />
              </template>
              <template #error>
                <img :src="defaultActivityImage" class="card-img" alt="" />
              </template>
            </el-image>
            <div class="card-badge">
              <el-tag :type="getStatusType(activity.status)" effect="dark" size="small" round>
                {{ getStatusText(activity.status) }}
              </el-tag>
            </div>
          </div>

          <div class="card-body">
            <div class="card-top">
              <h3 class="card-name" :title="activity.name">{{ activity.name }}</h3>
              <el-tag size="small" effect="light" class="type-chip">{{ getTypeText(activity.type) }}</el-tag>
            </div>

            <div class="card-meta">
              <div class="meta-item">
                <el-icon><Calendar /></el-icon>
                <span>{{ formatDate(activity.EnrollmentStartTime) }} — {{ formatDate(activity.EnrollmentEndTime) }}</span>
              </div>
              <div class="meta-item">
                <el-icon><UserIcon /></el-icon>
                <span>{{ getUsername(activity.functionary) }}</span>
              </div>
              <div class="meta-item">
                <el-icon><Clock /></el-icon>
                <span
                  :class="{'text-full': activity.isFull, 'text-available': !activity.isFull && activity.status === ActivityStatus.EnrollmentStarted}"
                >
                  {{ activity.isFull ? '已满员' : (activity.status === ActivityStatus.EnrollmentStarted ? '报名中' : getStatusText(activity.status)) }}
                </span>
                <span class="count-label">({{ getParticipantCount(activity) }})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <p>暂无活动数据</p>
      </div>

      <div v-if="total > pageSize" class="pagination-wrap">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next, total"
          background
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.activities-page {
  background: var(--page-bg);
  min-height: 100vh;
}

.page-body {
  padding: 24px 28px;
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.filter-input {
  flex: 2;
  min-width: 200px;
}

.filter-select {
  flex: 1;
  min-width: 140px;
}

.total-badge {
  font-size: 13px;
  color: #64748b;
  background: var(--brand-50);
  border: 1px solid var(--brand-200);
  border-radius: 20px;
  padding: 4px 14px;
  font-weight: 500;
}

.activities-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 20px;
}

.activity-card {
  height: 175px;
  border-radius: var(--radius-card);
  background: var(--card-bg);
  display: flex;
  border: 1px solid var(--card-border);
  box-shadow: var(--card-shadow);
  cursor: pointer;
  overflow: hidden;
  transition: var(--transition-slow);
}

.activity-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--card-shadow-hover);
  border-color: var(--brand-200);
}

.card-img-wrap {
  position: relative;
  width: 175px;
  height: 175px;
  flex-shrink: 0;
}

.card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-img-placeholder {
  width: 100%;
  height: 100%;
  background: #f1f5f9;
}

.card-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 2;
}

.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  min-width: 0;
  justify-content: space-between;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.card-name {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.type-chip {
  flex-shrink: 0;
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
}

.meta-item :deep(.el-icon) {
  font-size: 13px;
  flex-shrink: 0;
  color: #94a3b8;
}

.meta-item span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.text-full {
  color: #ef4444;
}

.text-available {
  color: #10b981;
}

.count-label {
  color: #94a3b8;
  margin-left: 3px;
  font-size: 11px;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #94a3b8;
  font-size: 16px;
}

.loading-container {
  padding: 60px 20px;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  padding: 32px 0;
}

@media (max-width: 768px) {
  .page-body {
    padding: 16px;
  }

  .activities-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .activity-card {
    height: auto;
    flex-direction: column;
  }

  .card-img-wrap {
    width: 100%;
    height: 200px;
  }
}
</style>
