<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { DataLine, User, Timer, Trophy } from '@element-plus/icons-vue'
import { monitorService, type BusinessOperationLogItem, type MonitorOverview, type TopUser, type UserStatItem } from '@/services/monitorService'
import { userService } from '@/services/userService'
import type { User as UserEntity } from '@/entity/User'
import PageHeader from '@/components/PageHeader.vue'
import { notifyRequestError } from '@/services/uiErrorService'

const filterClazz = ref('')
const filterGrade = ref('')
const filterCollege = ref('')
const clazzOptions = ref<string[]>([])
const gradeOptions = ref<string[]>([])
const collegeOptions = ref<string[]>([])

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

const topUsers = ref<TopUser[]>([])
const allUsersMap = ref<Map<string, UserEntity>>(new Map())

const userStatsList = ref<UserStatItem[]>([])
const businessLogs = ref<BusinessOperationLogItem[]>([])
const bizLogKeyword = ref('')
const bizLogLoading = ref(false)

const loading = ref(false)

const averageActivities = computed(() => {
  if (!overview.value.totalUsers) return 0
  return (overview.value.totalActivities / overview.value.totalUsers).toFixed(1)
})

const enrichedUsers = computed(() => {
  if (userStatsList.value.length > 0) {
    return userStatsList.value.map(user => {
      const userDetail = allUsersMap.value.get(user.studentNo)
      return {
        ...user,
        college: user.college || userDetail?.college || '-',
        grade: user.grade || userDetail?.grade || '-',
        clazz: user.clazz || userDetail?.clazz || '-'
      }
    })
  }
  
  return topUsers.value.map(user => {
    const userDetail = allUsersMap.value.get(user.studentNo)
    return {
      ...user,
      clazz: userDetail?.clazz || '-',
      grade: userDetail?.grade || '-',
      college: userDetail?.college || '-',
      activityCount: 0,
      totalDuration: user.hours
    }
  })
})

const fetchMonitorData = async () => {
  loading.value = true
  try {
    const data = await monitorService.getDashboardData('yearly', {
      clazz: filterClazz.value,
      grade: filterGrade.value,
      college: filterCollege.value
    })
    overview.value = data.overview
    topUsers.value = data.topUsers
    
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
    notifyRequestError(e, '加载监控数据失败')
  } finally {
    loading.value = false
  }
}

const fetchBusinessLogs = async () => {
  bizLogLoading.value = true
  try {
    businessLogs.value = await monitorService.getBusinessLogs(80, bizLogKeyword.value)
  } catch (e) {
    notifyRequestError(e, '加载业务操作日志失败')
  } finally {
    bizLogLoading.value = false
  }
}

const formatLogTime = (value: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const resolveOperatorName = (studentNo: string) => {
  if (!studentNo) return ''
  return allUsersMap.value.get(studentNo)?.username || ''
}

const resolveOperatorTooltip = (studentNo: string) => {
  const name = resolveOperatorName(studentNo)
  if (name) {
    return `学生姓名: ${name}`
  }
  return '学生姓名: 未知'
}

const resolveActionLabel = (item: BusinessOperationLogItem) => {
  if (!item.targetId) return item.action || '-'
  return `${item.action} #${item.targetId}`
}

const resolveTargetTooltip = (item: BusinessOperationLogItem) => {
  return item.targetName || ''
}

const applyUserDirectory = (users: UserEntity[]) => {
  const userMap = new Map<string, UserEntity>()
  const clazzSet = new Set<string>()
  const gradeSet = new Set<string>()
  const collegeSet = new Set<string>()

  users.forEach(u => {
    if (u.studentNo) {
      userMap.set(u.studentNo, u)
    }
    if (u.clazz) clazzSet.add(u.clazz)
    if (u.grade) gradeSet.add(u.grade)
    if (u.college) collegeSet.add(u.college)
  })

  allUsersMap.value = userMap
  return {
    clazzes: Array.from(clazzSet).sort(),
    grades: Array.from(gradeSet).sort(),
    colleges: Array.from(collegeSet).sort()
  }
}

const fetchUserDirectory = async () => {
  const users = await userService.getAllUsers()
  return applyUserDirectory(users)
}

const fetchFilterOptions = async () => {
  try {
    const filters = await monitorService.getFilterOptions()
    const directory = await fetchUserDirectory()

    if (filters && (filters.clazzes.length || filters.grades.length || filters.colleges.length)) {
        clazzOptions.value = filters.clazzes
        gradeOptions.value = filters.grades
        collegeOptions.value = filters.colleges
        return
    }

    clazzOptions.value = directory.clazzes
    gradeOptions.value = directory.grades
    collegeOptions.value = directory.colleges
  } catch (e) {
    notifyRequestError(e, '加载筛选项失败')
    try {
      const directory = await fetchUserDirectory()
      clazzOptions.value = directory.clazzes
      gradeOptions.value = directory.grades
      collegeOptions.value = directory.colleges
    } catch (innerError) {
      notifyRequestError(innerError, '加载用户目录失败')
    }
  }
}

const handlePageChange = (page: number) => {
    currentPage.value = page
    fetchMonitorData()
}

onMounted(() => {
  fetchFilterOptions()
  fetchMonitorData()
  fetchBusinessLogs()
})
</script>

<template>
  <div class="monitor-page">
    <PageHeader title="系统监控（业务版）" subtitle="业务数据与关键操作行为追踪">
      <template #controls>
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
          <el-input
            v-model="bizLogKeyword"
            placeholder="操作日志关键字"
            clearable
            class="filter-input"
            @keyup.enter="fetchBusinessLogs"
          />
          <el-button type="primary" :loading="bizLogLoading" @click="fetchBusinessLogs">刷新日志</el-button>
        </div>
      </template>
    </PageHeader>

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

    <el-card shadow="hover" class="list-card mb-4">
      <template #header>
        <div class="card-header-text">
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

    <el-card shadow="hover" class="list-card">
      <template #header>
        <div class="card-header-text">
          <span>业务操作日志（ES）</span>
        </div>
      </template>
      <el-table :data="businessLogs" stripe style="width: 100%" v-loading="bizLogLoading" class="hidden-xs-only">
        <el-table-column label="时间" width="190">
          <template #default="{ row }">{{ formatLogTime(row.timestamp) }}</template>
        </el-table-column>
        <el-table-column label="操作人" width="150">
          <template #default="{ row }">
            <el-tooltip :content="resolveOperatorTooltip(row.operatorStudentNo)" placement="top">
              <span class="hover-ref">{{ row.operatorStudentNo || '-' }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="operatorRole" label="角色" width="120" />
        <el-table-column label="动作" min-width="220">
          <template #default="{ row }">
            <el-tooltip
              :content="resolveTargetTooltip(row)"
              placement="top"
              :disabled="!row.targetName"
            >
              <span class="hover-ref">{{ resolveActionLabel(row) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="targetName" label="目标" min-width="220" show-overflow-tooltip />
        <el-table-column prop="detail" label="详情" min-width="260" show-overflow-tooltip />
        <el-table-column prop="status" label="结果" width="100" />
      </el-table>

      <div class="visible-xs-only mobile-user-list" v-loading="bizLogLoading">
        <div v-for="(item, index) in businessLogs" :key="`${item.timestamp}-${index}`" class="mobile-user-card">
          <div class="user-card-header">
            <span class="user-name">{{ item.action }}</span>
            <span class="user-no">{{ formatLogTime(item.timestamp) }}</span>
          </div>
          <div class="user-card-body">
            <div class="info-row"><span class="label">操作人:</span> {{ item.operatorStudentNo }} ({{ resolveOperatorName(item.operatorStudentNo) || '未知姓名' }})</div>
            <div class="info-row"><span class="label">动作:</span> {{ resolveActionLabel(item) }}</div>
            <div class="info-row"><span class="label">目标:</span> {{ item.targetName || '-' }}</div>
            <div class="info-row"><span class="label">详情:</span> {{ item.detail || '-' }}</div>
            <div class="info-row"><span class="label">结果:</span> {{ item.status || '-' }}</div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.monitor-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 28px;
  min-height: 80vh;
  background: var(--page-bg);
}
.header-controls {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.filter-select { width: 150px; }
.filter-input { width: 220px; }
.list-card {
  border-radius: var(--radius-card);
  border: 1px solid var(--card-border) !important;
  box-shadow: var(--card-shadow);
}
.data-card {
  height: 100%;
  border-radius: var(--radius-card);
  border: 1px solid var(--card-border) !important;
  box-shadow: var(--card-shadow);
  transition: var(--transition-base);
  margin-bottom: 20px;
}
.data-card:hover { transform: translateY(-4px); box-shadow: var(--card-shadow-hover); }
.card-content { display: flex; align-items: center; gap: 16px; }
.icon-wrapper {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
  flex-shrink: 0;
}
.blue { background: linear-gradient(135deg, var(--brand-500), var(--brand-600)); }
.green { background: linear-gradient(135deg, var(--accent-500), #059669); }
.orange { background: linear-gradient(135deg, var(--warn-500), #d97706); }
.purple { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
.info { flex: 1; }
.label { font-size: 13px; color: #64748b; margin-bottom: 4px; }
.value { font-size: 24px; font-weight: 700; color: #0f172a; }
.sub-value { font-size: 12px; color: #94a3b8; margin-top: 4px; }
.card-header-text { font-size: 16px; font-weight: 600; color: #0f172a; }
.rank-badge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: var(--brand-50);
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  font-weight: 600;
  font-size: 12px;
}
.rank-1 { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; }
.rank-2 { background: linear-gradient(135deg, var(--warn-500), #d97706); color: white; }
.rank-3 { background: linear-gradient(135deg, var(--brand-400, #818cf8), var(--brand-500)); color: white; }
.pagination-container { margin-top: 20px; display: flex; justify-content: flex-end; }
.mb-4 { margin-bottom: 20px; }
.hover-ref {
  color: var(--brand-600);
  cursor: pointer;
  text-decoration: underline;
  text-decoration-style: dotted;
}
@media (max-width: 768px) {
  .monitor-page { padding: 16px; }
  .header-controls { flex-direction: column; width: 100%; align-items: stretch; }
  .filter-select { width: 100% !important; }
  .data-card { margin-bottom: 12px; }
  .mobile-user-list { display: flex; flex-direction: column; gap: 16px; }
  .mobile-user-card {
    border: 1px solid var(--card-border);
    border-radius: 10px;
    padding: 16px;
    background: var(--card-bg);
    box-shadow: var(--card-shadow);
  }
  .user-card-header {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    border-bottom: 1px solid var(--card-border);
    padding-bottom: 8px;
    gap: 10px;
  }
  .user-name { font-weight: 600; font-size: 16px; color: #0f172a; }
  .user-no { font-size: 14px; color: #94a3b8; margin-left: auto; }
  .user-card-body { font-size: 14px; color: #64748b; }
  .info-row { margin-bottom: 6px; }
  .info-row .label { color: #94a3b8; margin-right: 8px; display: inline-block; width: 40px; }
  .stats-row {
    display: flex;
    justify-content: space-around;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed var(--card-border);
  }
  .stat-item { display: flex; flex-direction: column; align-items: center; }
  .stat-val { font-size: 18px; font-weight: 600; color: #0f172a; }
  .stat-val.highlight { color: var(--brand-500); }
  .stat-lbl { font-size: 12px; color: #94a3b8; margin-top: 4px; }
  .pagination-container { justify-content: center; }
}
</style>
