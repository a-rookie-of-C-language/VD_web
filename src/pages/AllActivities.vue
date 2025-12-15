<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { activityService, type ActivityListParams } from '@/services/activityService'
import type { Activity } from '@/entity/Activity'
import { ActivityStatus } from '@/entity/ActivityStatus'
import { ActivityType } from '@/entity/ActivityType'
import {userService} from "@/services/userService.ts";
import { getActivityTypeLabel, getActivityStatusLabel } from '@/util/util'
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
    activities.value = (response.items || []).filter(a => a.status !== ActivityStatus.UnderReview
        && a.status !== ActivityStatus.FailReview)
    total.value = response.total || 0
    currentPage.value = response.page || 1
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
    <div class="banner-section"></div>
    <div class="content-wrapper">
      <div class="filter-section">
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

      <!-- Loading State -->
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>

      <!-- Activities Grid -->
      <div v-else-if="activities.length > 0" class="activities-grid">
        <div
          v-for="activity in activities"
          :key="activity.id"
          class="activity-card"
          @click="$router.push(`/app/activity/${activity.id}`)"
        >
          <div class="card-image-wrapper">
            <img 
              :src="activity.CoverImage || defaultActivityImage"
              :alt="activity.name"
              class="card-image"
              loading="lazy"
              @error="(e) => (e.target as HTMLImageElement).src = defaultActivityImage"
            />
          </div>

          <div class="card-info">
            <h3 class="card-title">{{ activity.name }}</h3>
            <div>
              <span class="info-text">报名时间:</span>
            </div>
            <div class="info-row">
              <span class="info-text">{{ formatDate(activity.EnrollmentStartTime) }}</span>
              <span class="info-text">{{ formatDate(activity.EnrollmentEndTime) }}</span>
            </div>

            <div class="info-row">
              <span class="info-text">负责人: {{ getUsername(activity.functionary) }}</span>
            </div>

            <div class="info-row">
              <span class="info-text">{{ getTypeText(activity.type) }}</span>
            </div>

            <div class="info-row">
              <span class="info-text">
                {{ activity.isFull ? '已满员' : '未满员' }}
                ({{ getParticipantCount(activity) }}人)
              </span>
            </div>

            <div class="info-row">
              <el-tag :type="getStatusType(activity.status)" size="small" class="status-tag-inline">
                {{ getStatusText(activity.status) }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <p>暂无活动数据</p>
      </div>

      <!-- Pagination -->
      <div v-if="total > pageSize" class="pagination-container">
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
  min-height: 100vh;
  background: rgba(255, 255, 255, 1);
  font-family: 'SourceHanSansCN-Regular', 'Microsoft YaHei', sans-serif;
  position: relative;
}

/* Banner Section */
.banner-section {
  position: absolute;
  left: 12px;
  top: 22px;
  width: 1414px;
  height: 197px;
  background-image: url('../image/banner-bg.png');
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  border-radius: 5px;
}

/* Content Wrapper */
.content-wrapper {
  position: absolute;
  left: 12px;
  top: 237px;
  width: 1414px;
}

/* Filter Section */
.filter-section {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  padding: 0 23px;
}

.filter-input {
  flex: 2;
}

.filter-select {
  flex: 1;
}

/* Filter Headers */
.filter-headers {
  display: flex;
  justify-content: space-between;
  width: 100%;
  height: 103px;
  margin-bottom: 15px;
  align-items: center;
  padding: 0 23px;
  background: transparent;
}

.header-item {
  width: 293px;
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(0, 0, 0, 1);
  font-size: 20px;
  font-weight: 400;
  text-align: center;
}

/* Loading State */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: #4e5969;
}

.loading-container p {
  margin-top: 20px;
  font-size: 16px;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #4e5969;
  font-size: 18px;
}

/* Activities Grid */
.activities-grid {
  display: grid;
  grid-template-columns: repeat(3, 370px);
  gap: 44px 115px;
  padding-left: 44px;
}

/* Activity Card */
.activity-card {
  width: 370px;
  height: 200px;
  border-radius: 10px;
  background: rgba(255, 232, 232, 1);
  display: flex;
  padding: 9px;
  gap: 13px;
  transition: transform 0.3s, box-shadow 0.3s;
  cursor: pointer;
}

.activity-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

/* Card Image */
.card-image-wrapper {
  flex-shrink: 0;
  width: 163px;
  height: 163px;
  background-color: #f5f5f5;
  border-radius: 5px;
  overflow: hidden;
}

.card-image {
  width: 163px;
  height: 163px;
  border-radius: 5px;
  object-fit: cover;
  background-color: #f5f5f5;
}

/* Card Info */
.card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-top: 7px;
}

.card-title {
  font-size: 18px;
  font-weight: 400;
  color: rgba(0, 0, 0, 1);
  margin: 0 0 16px 0;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Info Rows */
.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
  height: 21px;
}

.info-icon {
  width: auto;
  height: 16px;
  object-fit: contain;
  flex-shrink: 0;
}

.info-text {
  font-size: 11px;
  color: rgba(0, 0, 0, 1);
  line-height: 21px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.status-tag-inline {
  margin-left: auto;
  flex-shrink: 0;
}

/* Pagination */
.pagination-container {
  display: flex;
  justify-content: center;
  padding: 40px 0;
  margin-top: 20px;
}

/* Responsive adjustments */
@media (max-width: 1440px) {
  .banner-section,
  .content-wrapper {
    left: 50%;
    transform: translateX(-50%);
  }
}

@media (max-width: 1200px) {
  .activities-grid {
    grid-template-columns: repeat(2, 370px);
    justify-content: center;
  }

  .filter-headers {
    width: 100%;
  }
}

@media (max-width: 800px) {
  .activities-grid {
    grid-template-columns: 1fr;
    padding-left: 0;
    gap: 30px;
  }

  .activity-card {
    width: 100%;
    max-width: 400px;
    margin: 0 auto;
    height: auto;
    flex-direction: column;
  }
  
  .card-image {
    width: 100%;
    height: 200px;
  }
  
  .card-info {
    padding: 10px;
  }

  .banner-section {
    position: relative;
    width: 100%;
    height: 120px;
    left: 0;
    top: 0;
    transform: none;
    margin-bottom: 20px;
    border-radius: 0;
  }

  .content-wrapper {
    position: relative;
    width: 100%;
    left: 0;
    top: 0;
    transform: none;
    padding: 0 16px;
  }

  .filter-section {
    flex-direction: column;
    padding: 0;
  }
  
  .filter-input, .filter-select {
    width: 100%;
  }

  .filter-headers {
    display: none; /* Simplify headers on mobile */
  }
}
</style>
