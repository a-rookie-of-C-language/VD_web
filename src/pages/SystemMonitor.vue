<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { DataLine, User, Timer, Trophy } from '@element-plus/icons-vue'
import { monitorService, type MonitorOverview, type TopUser, type UserStatItem } from '@/services/monitorService'
import { userService } from '@/services/userService'
import type { User as UserEntity } from '@/entity/User'

// State
// Filters
const filterClazz = ref('')
const filterGrade = ref('')
const filterCollege = ref('')
const clazzOptions = ref<string[]>([])
const gradeOptions = ref<string[]>([])
const collegeOptions = ref<string[]>([])

// Pagination
const currentPage = ref(1)
const pageSize = ref(10)
const totalUsers = ref(0)

const overview = ref<MonitorOverview>({
  totalUsers: 0,
  totalActivities: 0,
  totalDuration: 0,
  totalParticipants: 0,
  completedActivities: 0,
  averageDuration: 0,
  newActivities: 0,
  activeUsers: 0
})

// Old fallback
const topUsers = ref<TopUser[]>([])
const allUsersMap = ref<Map<string, UserEntity>>(new Map())

// New list
const userStatsList = ref<UserStatItem[]>([])

const loading = ref(false)

// Computed
const averageActivities = computed(() => {
  if (!overview.value.totalUsers) return 0
  return (overview.value.totalActivities / overview.value.totalUsers).toFixed(1)
})

const enrichedUsers = computed(() => {
  // If we have data from new API, use it
  if (userStatsList.value.length > 0) {
    return userStatsList.value
  }
  
  // Fallback to old logic if new API returns empty (e.g. not implemented yet)
  return topUsers.value.map(user => {
    const userDetail = allUsersMap.value.get(user.studentNo)
    return {
      ...user,
      clazz: userDetail?.clazz || '-',
      grade: userDetail?.grade || '-',
      college: userDetail?.college || '-',
      activityCount: 0, // Fallback doesn't have this
      totalDuration: user.hours // Map hours to totalDuration
    }
  })
})

const fetchMonitorData = async () => {
  loading.value = true
  try {
    // 1. Fetch Overview
    const data = await monitorService.getDashboardData('yearly', {
      clazz: filterClazz.value,
      grade: filterGrade.value,
      college: filterCollege.value
    })
    overview.value = data.overview
    topUsers.value = data.topUsers
    
    // 2. Fetch User Stats (New API)
    try {
        const statsData = await monitorService.getUserStats({
            page: currentPage.value,
            pageSize: pageSize.value,
            clazz: filterClazz.value,
            grade: filterGrade.value,
            college: filterCollege.value
        })
        if (statsData && statsData.records) {
            userStatsList.value = statsData.records
            totalUsers.value = statsData.total
        }
    } catch (err) {
        console.warn('New user stats API failed, using fallback', err)
    }

  } catch (e) {
    console.error(e)
    ElMessage.error('加载监控数据失败')
  } finally {
    loading.value = false
  }
}

const fetchFilterOptions = async () => {
  try {
    // Try new API first
    const filters = await monitorService.getFilterOptions()
    if (filters && (filters.clazzes.length || filters.grades.length || filters.colleges.length)) {
        clazzOptions.value = filters.clazzes
        gradeOptions.value = filters.grades
        collegeOptions.value = filters.colleges
        return
    }

    // Fallback to old logic
    const users = await userService.getAllUsers()
    const clazzSet = new Set<string>()
    const gradeSet = new Set<string>()
    const collegeSet = new Set<string>()
    
    users.forEach(u => {
      if (u.studentNo) allUsersMap.value.set(u.studentNo, u)
      if (u.clazz) clazzSet.add(u.clazz)
      if (u.grade) gradeSet.add(u.grade)
      if (u.college) collegeSet.add(u.college)
    })
    
    clazzOptions.value = Array.from(clazzSet).sort()
    gradeOptions.value = Array.from(gradeSet).sort()
    collegeOptions.value = Array.from(collegeSet).sort()
  } catch (e) {
    console.error('Failed to fetch filter options', e)
  }
}

const handlePageChange = (page: number) => {
    currentPage.value = page
    fetchMonitorData()
}

onMounted(() => {
  fetchFilterOptions()
  fetchMonitorData()
})
</script>

<template>
  <div class="monitor-page">
    <div class="page-header">
      <div class="header-content">
        <h1 class="title">系统监控大屏</h1>
        <p class="subtitle">实时监控系统运行状态，掌握志愿活动数据</p>
      </div>
      <div class="header-decoration">
        <div class="circle circle-1"></div>
        <div class="circle circle-2"></div>
      </div>
      
      <div class="header-controls">
        <el-select v-model="filterClazz" placeholder="班级筛选" clearable size="default" @change="fetchMonitorData" class="filter-select">
          <el-option v-for="c in clazzOptions" :key="c" :label="c" :value="c" />
        </el-select>
        <el-select v-model="filterGrade" placeholder="年级筛选" clearable size="default" @change="fetchMonitorData" class="filter-select">
          <el-option v-for="g in gradeOptions" :key="g" :label="g" :value="g" />
        </el-select>
        <el-select v-model="filterCollege" placeholder="学院筛选" clearable size="default" @change="fetchMonitorData" class="filter-select">
          <el-option v-for="c in collegeOptions" :key="c" :label="c" :value="c" />
        </el-select>
      </div>
    </div>

    <!-- Data Cards -->
    <el-row :gutter="20" class="mb-4">
      <el-col :span="6" :xs="12">
        <el-card shadow="hover" class="data-card">
          <div class="card-content">
            <div class="icon-wrapper blue">
              <el-icon><User /></el-icon>
            </div>
            <div class="info">
              <div class="label">人数</div>
              <div class="value">{{ overview.totalUsers }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6" :xs="12">
        <el-card shadow="hover" class="data-card">
          <div class="card-content">
            <div class="icon-wrapper orange">
              <el-icon><Timer /></el-icon>
            </div>
            <div class="info">
              <div class="label">总志愿时长</div>
              <div class="value">{{ overview.totalDuration }}h</div>
              <div class="sub-value">平均: {{ (overview.totalDuration / (overview.totalUsers || 1)).toFixed(1) }}h/人</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6" :xs="12">
        <el-card shadow="hover" class="data-card">
          <div class="card-content">
            <div class="icon-wrapper green">
              <el-icon><DataLine /></el-icon>
            </div>
            <div class="info">
              <div class="label">总参加活动数</div>
              <div class="value">{{ overview.totalActivities }}</div>
              <div class="sub-value">平均: {{ averageActivities }}次/人</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6" :xs="12">
        <el-card shadow="hover" class="data-card">
          <div class="card-content">
            <div class="icon-wrapper purple">
              <el-icon><Trophy /></el-icon>
            </div>
            <div class="info">
              <div class="label">参与人次</div>
              <div class="value">{{ overview.totalParticipants }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- User Details Table -->
    <el-card shadow="hover" class="list-card mb-4">
      <template #header>
        <div class="card-header">
          <span>用户详细数据</span>
        </div>
      </template>
      <el-table :data="enrichedUsers" stripe style="width: 100%" v-loading="loading" class="hidden-xs-only">
        <el-table-column prop="rank" label="排名" width="80" align="center">
          <template #default="{ row, $index }">
            <div class="rank-badge" :class="'rank-' + (row.rank || ($index + 1))">{{ row.rank || ($index + 1) }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="姓名" />
        <el-table-column prop="studentNo" label="学号" />
        <el-table-column prop="college" label="学院" />
        <el-table-column prop="grade" label="年级" />
        <el-table-column prop="clazz" label="班级" />
        <el-table-column prop="activityCount" label="参加活动数" align="center" />
        <el-table-column prop="totalDuration" label="志愿时长 (小时)" align="right" sortable>
            <template #default="{ row }">
                {{ row.totalDuration }}
            </template>
        </el-table-column>
      </el-table>

      <!-- Mobile User List -->
      <div class="visible-xs-only mobile-user-list" v-loading="loading">
        <div v-for="(user, index) in enrichedUsers" :key="user.studentNo" class="mobile-user-card">
          <div class="user-card-header">
             <div class="rank-badge" :class="'rank-' + (user.rank || (index + 1))">{{ user.rank || (index + 1) }}</div>
             <span class="user-name">{{ user.name }}</span>
             <span class="user-no">{{ user.studentNo }}</span>
          </div>
          <div class="user-card-body">
             <div class="info-row"><span class="label">学院:</span> {{ user.college }}</div>
             <div class="info-row"><span class="label">年级:</span> {{ user.grade }}</div>
             <div class="info-row"><span class="label">班级:</span> {{ user.clazz }}</div>
             <div class="info-row stats-row">
               <div class="stat-item">
                 <span class="stat-val">{{ user.activityCount }}</span>
                 <span class="stat-lbl">活动数</span>
               </div>
               <div class="stat-item">
                 <span class="stat-val highlight">{{ user.totalDuration }}</span>
                 <span class="stat-lbl">志愿时长</span>
              </div>
             </div>
          </div>
        </div>
      </div>
      <div class="pagination-container" v-if="totalUsers > 0">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="totalUsers"
          layout="total, prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.monitor-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: 80vh;
}

/* Header */
.page-header {
  background: linear-gradient(135deg, #409eff 0%, #3a8ee6 100%);
  border-radius: 16px;
  padding: 40px;
  margin-bottom: 30px;
  color: white;
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 20px rgba(64, 158, 255, 0.2);
}

.header-content {
  position: relative;
  z-index: 2;
  margin-bottom: 20px;
}

.title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 10px 0;
  letter-spacing: 1px;
}

.subtitle {
  font-size: 16px;
  opacity: 0.9;
  margin: 0;
}

.header-decoration .circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.circle-1 {
  width: 200px;
  height: 200px;
  top: -50px;
  right: -50px;
}

.circle-2 {
  width: 100px;
  height: 100px;
  bottom: -20px;
  right: 100px;
}

.header-controls {
  position: relative;
  z-index: 2;
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  background: rgba(255, 255, 255, 0.1);
  padding: 15px;
  border-radius: 12px;
  backdrop-filter: blur(5px);
}

.filter-select {
  width: 150px;
}

.mb-4 {
  margin-bottom: 20px;
}

.list-card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.data-card {
  height: 100%;
  border-radius: 12px;
  border: none;
  transition: all 0.3s;
}

.data-card:hover {
  transform: translateY(-5px);
}

.card-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.icon-wrapper {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.blue { background: linear-gradient(135deg, #409eff, #3a8ee6); }
.green { background: linear-gradient(135deg, #67c23a, #529b2e); }
.orange { background: linear-gradient(135deg, #e6a23c, #b88230); }
.purple { background: linear-gradient(135deg, #a0cfff, #8c9eff); }

.info {
  flex: 1;
}

.label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
}

.sub-value {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.rank-badge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #f0f2f5;
  color: #909399;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  font-weight: 600;
}

.rank-1 { background-color: #f56c6c; color: white; }
.rank-2 { background-color: #e6a23c; color: white; }
.rank-3 { background-color: #409eff; color: white; }

@media (max-width: 768px) {
  .monitor-page {
    padding: 10px;
  }

  .page-header {
    padding: 24px;
    border-radius: 8px;
  }
  
  .header-decoration {
    display: none;
  }
  
  .title {
    font-size: 24px;
  }
  
  .subtitle {
    font-size: 14px;
  }
  
  .header-controls {
    flex-direction: column;
    width: 100%;
    align-items: stretch;
    padding: 10px;
  }
  
  .filter-select {
    width: 100% !important;
  }
  
  .data-card {
    margin-bottom: 12px;
  }
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

@media (min-width: 769px) {
    .visible-xs-only {
        display: none !important;
    }
}

@media (max-width: 768px) {
    .hidden-xs-only {
        display: none !important;
    }

    .mobile-user-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .mobile-user-card {
        border: 1px solid #ebeef5;
        border-radius: 8px;
        padding: 16px;
        background: #fff;
    }

    .user-card-header {
        display: flex;
        align-items: center;
        margin-bottom: 12px;
        border-bottom: 1px solid #f0f2f5;
        padding-bottom: 8px;
        gap: 10px;
    }

    .user-name {
        font-weight: 600;
        font-size: 16px;
        color: #303133;
    }

    .user-no {
        font-size: 14px;
        color: #909399;
        margin-left: auto;
    }

    .user-card-body {
        font-size: 14px;
        color: #606266;
    }

    .info-row {
        margin-bottom: 6px;
    }
    
    .info-row .label {
        color: #909399;
        margin-right: 8px;
        display: inline-block;
        width: 40px;
    }
    
    .stats-row {
        display: flex;
        justify-content: space-around;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px dashed #ebeef5;
    }
    
    .stat-item {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    
    .stat-val {
        font-size: 18px;
        font-weight: 600;
        color: #303133;
    }
    
    .stat-val.highlight {
        color: #409eff;
    }
    
    .stat-lbl {
        font-size: 12px;
        color: #909399;
        margin-top: 4px;
    }
    
    .pagination-container {
        justify-content: center;
    }
}
</style>