<script setup lang="ts">
import {computed, onMounted, ref} from 'vue'
import type {UploadFile, UploadProps} from 'element-plus'
import {ElMessage, ElMessageBox} from 'element-plus'
import {Document, Edit, RefreshLeft, Search, UploadFilled, User, View,} from '@element-plus/icons-vue'
import {activityService} from '@/services/activityService'
import type {Activity} from '@/entity/Activity'
import {ActivityStatus} from '@/entity/ActivityStatus'
import {ActivityType} from '@/entity/ActivityType'
import {useUserStore} from '@/stores/useUserStore'
import {userService} from '@/services/userService'
import dayjs from 'dayjs'

const userStore = useUserStore()
const activities = ref<Activity[]>([])
const loading = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

const filtered = computed(() => {
  if (!searchQuery.value) return activities.value
  const query = searchQuery.value.toLowerCase()
  return activities.value.filter(a => 
    a.name.toLowerCase().includes(query) || 
    a.description?.toLowerCase().includes(query)
  )
})

const statusText = (s: ActivityStatus) => {
  switch (s) {
    case ActivityStatus.UnderReview: return '审核中'
    case ActivityStatus.FailReview: return '审核失败'
    case ActivityStatus.EnrollmentNotStart: return '报名未开始'
    case ActivityStatus.EnrollmentStarted: return '报名进行中'
    case ActivityStatus.EnrollmentEnded: return '报名已结束'
    case ActivityStatus.ActivityStarted: return '活动进行中'
    case ActivityStatus.ActivityEnded: return '活动已结束'
    default: return String(s)
  }
}

const statusType = (s: ActivityStatus): 'info'|'success'|'danger'|'warning'|'primary' => {
  switch (s) {
    case ActivityStatus.UnderReview: return 'warning'
    case ActivityStatus.FailReview: return 'danger'
    case ActivityStatus.EnrollmentStarted: return 'success'
    case ActivityStatus.ActivityStarted: return 'primary'
    case ActivityStatus.ActivityEnded: return 'info'
    default: return 'info'
  }
}

const getTypeText = (type: ActivityType): string => {
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

const formatTime = (time: string | undefined) => {
  if (!time) return '暂无'
  return dayjs(time).format('YYYY-MM-DD HH:mm')
}

const fetchMine = async () => {
  loading.value = true
  try {
    const res = await activityService.fetchMyActivities(currentPage.value, pageSize.value)
    activities.value = res.items || []
    total.value = res.total || 0
  } catch (e) {
    console.error(e)
    ElMessage.error('加载我的项目失败')
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchMine()
}

// --- Edit Logic ---
const editDialogVisible = ref(false)
const editing = ref<Activity | null>(null)
const editForm = ref<Activity | null>(null)

const openEdit = (a: Activity) => {
  const canEdit = a.status === ActivityStatus.UnderReview || a.status === ActivityStatus.FailReview
  if (!canEdit) {
    ElMessage.warning('该活动已审核通过或已发布，不能修改')
    return
  }
  editing.value = a
  editForm.value = { ...a }
  editDialogVisible.value = true
}

const submitEdit = async () => {
  if (!editForm.value || !editing.value) return
  const next: any = { ...editForm.value }
  if (editing.value.status !== ActivityStatus.UnderReview
      && editing.value.status !== ActivityStatus.FailReview) {
    next.status = ActivityStatus.UnderReview
    next.reviewReason = ''
  }
  try {
    await activityService.updateActivity(editing.value.id, next)
    ElMessage.success('保存成功')
    editDialogVisible.value = false
    await fetchMine()
  } catch (e) {
    console.error(e)
    ElMessage.error('保存失败')
  }
}

const coverPreview = ref('')
const beforeImageUpload: UploadProps['beforeUpload'] = (rawFile) => {
  if (!rawFile.type.startsWith('image/')) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (rawFile.size / 1024 / 1024 > 20) {
    ElMessage.error('图片大小不能超过 20MB!')
    return false
  }
  return true
}
const handleEditCoverChange: UploadProps['onChange'] = (uploadFile: UploadFile) => {
  if (uploadFile.raw) {
    const reader = new FileReader()
    reader.onload = (e) => {
      coverPreview.value = String(e.target?.result || '')
    }
    reader.readAsDataURL(uploadFile.raw)
    if (editForm.value) {
      ;(editForm.value as any).coverFile = uploadFile.raw
    }
  }
}

const revoke = async (a: Activity) => {
  try {
    await ElMessageBox.confirm('确认撤销该项目的审核吗？','撤销确认',{ type: 'warning' })
    await activityService.deleteActivity(a.id)
    ElMessage.success('已撤销审核')
    await fetchMine()
  } catch (e:any) {
    if (e !== 'cancel') {
      console.error(e)
      ElMessage.error('撤销失败')
    }
  }
}

const resubmit = async (a: Activity) => {
  try {
    const next = { ...a, status: ActivityStatus.UnderReview, reviewReason: '' }
    await activityService.updateActivity(a.id, next)
    ElMessage.success('已重新提交审核')
    await fetchMine()
  } catch (e) {
    console.error(e)
    ElMessage.error('提交失败')
  }
}

// --- Settlement Logic ---
const settlementDialogVisible = ref(false)
const settlementActivity = ref<Activity | null>(null)
const settlementParticipants = ref<{id: string, username: string}[]>([])
const selectedParticipants = ref<string[]>([])

const openSettlement = async (a: Activity) => {
  settlementActivity.value = a
  // Prepare participants list with names
  const ids = a.participants || []
  settlementParticipants.value = await Promise.all(ids.map(async (id) => {
    let username = nameMap.value[id]
    if (!username) {
      const user = await userService.getUserByStudentNo(id)
      username = user?.username || id
      nameMap.value[id] = username
    }
    return {id, username}
  }))
  // Default select all
  selectedParticipants.value = ids
  settlementDialogVisible.value = true
}

const submitSettlement = async () => {
  if (!settlementActivity.value) return
  try {
    await ElMessageBox.confirm('确认结束活动并进行结算吗？未选中的参与者将不会获得志愿时长。', '结算确认', { type: 'warning' })
    const next: any = { 
      ...settlementActivity.value, 
      status: ActivityStatus.ActivityEnded,
      qualifiedParticipants: selectedParticipants.value
    }
    await activityService.updateActivity(settlementActivity.value.id, next)
    ElMessage.success('活动已结束，时长已发放给符合条件的参与者')
    settlementDialogVisible.value = false
    await fetchMine()
  } catch (e: any) {
    if (e !== 'cancel') {
      console.error(e)
      ElMessage.error('操作失败')
    }
  }
}

// --- View Details Logic ---
const viewDialogVisible = ref(false)
const viewActivity = ref<Activity | null>(null)
const nameMap = ref<Record<string, string>>({})

const openView = (a: Activity) => {
  viewActivity.value = a
  viewDialogVisible.value = true
  const ids = a.participants || []
  Promise.all(ids.map(async (id) => {
    if (!nameMap.value[id]) {
      const user = await userService.getUserByStudentNo(id)
      nameMap.value[id] = user?.username || id
    }
  })).catch(() => {})
}

onMounted(fetchMine)
</script>

<template>
  <div class="my-projects-page">
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="title">我的项目</h1>
        <p class="subtitle">管理您发布的所有志愿活动项目</p>
      </div>
      <div class="header-decoration">
        <div class="circle circle-1"></div>
        <div class="circle circle-2"></div>
      </div>
    </div>

    <!-- Actions Bar -->
    <div class="actions-bar">
      <div class="left">
        <el-input
          v-model="searchQuery"
          placeholder="搜索项目名称..."
          class="search-input"
          :prefix-icon="Search"
          clearable
        />
      </div>
      <div class="right">
        <el-button type="primary" @click="fetchMine" :icon="RefreshLeft" plain>刷新列表</el-button>
      </div>
    </div>

    <!-- Content Section -->
    <el-card class="list-card" shadow="hover">
      <el-table 
        :data="filtered" 
        v-loading="loading" 
        style="width: 100%" 
        :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
        stripe
      >
        <el-table-column prop="name" label="项目名称" min-width="180">
          <template #default="{ row }">
            <div class="project-name-cell">
              <el-avatar :size="40" :src="row.coverImage" shape="square" class="project-cover">
                <el-icon><Document /></el-icon>
              </el-avatar>
              <span class="name-text">{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <el-tag effect="plain" round>{{ getTypeText(row.type) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" effect="dark" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="报名情况" width="150">
          <template #default="{ row }">
            <div class="participants-info">
              <el-icon><User /></el-icon>
              <span>{{ row.participants?.length || 0 }} / {{ row.maxParticipants }}</span>
            </div>
            <el-progress 
              :percentage="Math.min(((row.participants?.length || 0) / row.maxParticipants) * 100, 100)" 
              :show-text="false" 
              :status="row.isFull ? 'success' : ''"
              class="participants-progress"
            />
          </template>
        </el-table-column>

        <el-table-column label="活动时间" width="200">
          <template #default="{ row }">
            <div class="time-cell">
              <div class="time-row"><span class="label">开始:</span> {{ formatTime(row.startTime) }}</div>
              <div class="time-row"><span class="label">结束:</span> {{ row.endTime ? formatTime(row.endTime) : (row.expectedEndTime ? formatTime(row.expectedEndTime) + ' (预计)' : '活动未结束') }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button size="small" @click="openView(row)" :icon="View" link type="primary">详情</el-button>
              <el-button 
                v-if="row.status === ActivityStatus.UnderReview || row.status === ActivityStatus.FailReview" 
                size="small" 
                type="primary" 
                @click="openEdit(row)" 
                :icon="Edit" 
                link
              >修改</el-button>
              <el-button 
                v-if="row.status === ActivityStatus.UnderReview" 
                size="small" 
                type="warning" 
                @click="revoke(row)"
                link
              >撤销</el-button>
              <el-button 
                v-if="row.status === ActivityStatus.FailReview" 
                size="small" 
                type="success" 
                @click="resubmit(row)"
                link
              >重提</el-button>
              <el-button 
                v-if="row.status === ActivityStatus.ActivityStarted" 
                size="small" 
                type="success" 
                @click="openSettlement(row)"
                link
              >确认结束</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="fetchMine"
        />
      </div>
    </el-card>

    <!-- Edit Dialog -->
    <el-dialog v-model="editDialogVisible" title="修改项目" width="700px" destroy-on-close class="custom-dialog">
      <div v-if="editForm" class="dialog-content">
        <el-form :model="editForm" label-width="100px" label-position="top">
          <el-row :gutter="20">
            <el-col :span="16">
              <el-form-item label="项目名称">
                <el-input v-model="editForm.name" placeholder="请输入项目名称" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="项目类型">
                <el-select v-model="editForm.type" style="width:100%">
                  <el-option :value="ActivityType.COMMUNITY_SERVICE" label="社区服务" />
                  <el-option :value="ActivityType.CULTURE_SERVICE" label="文化服务" />
                  <el-option :value="ActivityType.EMERGENCY_RESCUE" label="应急救援" />
                  <el-option :value="ActivityType.ANIMAL_PROTECTION" label="动物保护" />
                  <el-option :value="ActivityType.POVERTY_ASSISTANCE" label="扶贫助困" />
                  <el-option :value="ActivityType.ELDERLY_DISABLED_ASSISTANCE" label="扶老助残" />
                  <el-option :value="ActivityType.MEDICAL_ASSISTANCE" label="慰病助医" />
                  <el-option :value="ActivityType.ORPHAN_EDUCATION_ASSISTANCE" label="救孤助学" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="项目描述">
            <el-input type="textarea" v-model="editForm.description" :rows="4" placeholder="请输入详细的项目描述" />
          </el-form-item>

          <el-form-item label="封面图片">
            <el-upload 
              class="cover-uploader"
              :auto-upload="false" 
              :show-file-list="false" 
              :on-change="handleEditCoverChange" 
              :before-upload="beforeImageUpload" 
              accept="image/*"
              drag
            >
              <img v-if="coverPreview || editForm.CoverImage" :src="coverPreview || editForm.CoverImage" class="cover-image" />
              <div v-else class="upload-placeholder">
                <el-icon class="el-icon--upload"><upload-filled /></el-icon>
                <div class="el-upload__text">拖拽图片到此处或 <em>点击上传</em></div>
              </div>
            </el-upload>
          </el-form-item>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="报名时间">
                <el-date-picker
                  v-model="editForm.EnrollmentStartTime"
                  type="datetime"
                  placeholder="开始时间"
                  style="width: 100%; margin-bottom: 10px;"
                />
                <el-date-picker
                  v-model="editForm.EnrollmentEndTime"
                  type="datetime"
                  placeholder="结束时间"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="活动时间">
                <el-date-picker
                  v-model="editForm.startTime"
                  type="datetime"
                  placeholder="开始时间"
                  style="width: 100%; margin-bottom: 10px;"
                />
                <el-date-picker
                  v-model="editForm.expectedEndTime"
                  type="datetime"
                  placeholder="预计结束时间"
                  style="width: 100%; margin-bottom: 10px;"
                />
                <el-date-picker
                  v-model="editForm.endTime"
                  type="datetime"
                  placeholder="实际结束时间"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="最大人数">
                <el-input-number v-model="editForm.maxParticipants" :min="1" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="志愿时长 (小时)">
                <el-input-number v-model="editForm.duration" :min="0.5" :step="0.5" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editDialogVisible=false">取消</el-button>
          <el-button type="primary" @click="submitEdit">保存修改</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- View Details Dialog -->
    <el-dialog v-model="viewDialogVisible" title="项目详情" width="800px" class="custom-dialog">
      <div v-if="viewActivity" class="view-content">
        <div class="view-header">
          <img :src="viewActivity.CoverImage" class="view-cover" v-if="viewActivity.CoverImage"/>
          <div class="view-title-section">
            <h2>{{ viewActivity.name }}</h2>
            <div class="tags">
              <el-tag>{{ getTypeText(viewActivity.type) }}</el-tag>
              <el-tag :type="statusType(viewActivity.status)" effect="dark">{{ statusText(viewActivity.status) }}</el-tag>
            </div>
          </div>
        </div>

        <el-descriptions :column="2" border class="mt-4">
          <el-descriptions-item label="负责人">{{ userStore.username.value }}</el-descriptions-item>
          <el-descriptions-item label="志愿时长">{{ viewActivity.duration }} 小时</el-descriptions-item>
          <el-descriptions-item label="报名时间">
            {{ formatTime(viewActivity.EnrollmentStartTime) }} <br/>至<br/> {{ formatTime(viewActivity.EnrollmentEndTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="活动时间">
            开始: {{ formatTime(viewActivity.startTime) }} <br/>
            预计结束: {{ formatTime(viewActivity.expectedEndTime) }} <br/>
            实际结束: {{ viewActivity.endTime ? formatTime(viewActivity.endTime) : '活动未结束' }}
          </el-descriptions-item>
          <el-descriptions-item label="项目描述" :span="2">
            {{ viewActivity.description }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="participants-section mt-4">
          <div class="section-header">
            <h3>报名人员列表</h3>
            <span class="count">({{ viewActivity.participants?.length || 0 }} / {{ viewActivity.maxParticipants }})</span>
          </div>
          
          <el-table :data="viewActivity.participants?.map(id => ({ id, username: nameMap[id] || id })) || []" height="250" stripe style="width: 100%">
            <el-table-column type="index" width="60" label="序号" />
            <el-table-column prop="id" label="学号">
              <template #default="{ row }">
                <div class="student-cell">
                  <el-icon><User /></el-icon>
                  <span class="ml-2">{{ row.id }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="username" label="姓名">
              <template #default="{ row }">
                <div class="student-cell">
                  <span class="ml-2">{{ row.username }}</span>
                  <el-tag v-if="row.id === viewActivity?.functionary" size="small" type="warning" effect="plain" style="margin-left: 8px">负责人</el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="状态" align="right">
              <template #default>
                <el-tag type="success" size="small">已报名</el-tag>
              </template>
            </el-table-column>
          </el-table>
          <div v-if="!viewActivity.participants || viewActivity.participants.length === 0" class="empty-text">
            暂无人员报名
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- Settlement Dialog -->
    <el-dialog v-model="settlementDialogVisible" title="活动结算" width="600px" class="custom-dialog">
      <div v-if="settlementActivity">
        <el-alert
          title="请勾选符合条件的参与者，系统将为他们发放志愿时长。"
          type="info"
          show-icon
          :closable="false"
          style="margin-bottom: 20px;"
        />
        <div class="settlement-list">
          <el-table 
            :data="settlementParticipants" 
            style="width: 100%" 
            height="300"
            @selection-change="(val: any[]) => selectedParticipants = val.map(v => v.id)"
            ref="settlementTable"
          >
            <el-table-column type="selection" width="55" />
            <el-table-column prop="id" label="学号" width="120" />
            <el-table-column prop="username" label="姓名" />
            <el-table-column label="状态" width="100">
              <template #default>
                <el-tag type="success" size="small">已参与</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="settlementDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitSettlement">确认结算</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.my-projects-page {
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

/* Actions Bar */
.actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.search-input {
  width: 300px;
}

/* List Card */
.list-card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.project-name-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.project-cover {
  background-color: #f0f2f5;
  color: #909399;
}

.name-text {
  font-weight: 500;
  color: #303133;
}

.participants-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #606266;
  margin-bottom: 4px;
}

.participants-progress {
  width: 90%;
}

.time-cell {
  font-size: 12px;
  color: #606266;
}

.time-row {
  margin-bottom: 2px;
}

.time-row .label {
  color: #909399;
  margin-right: 4px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* Dialog Styles */
.cover-uploader {
  width: 100%;
}

.cover-uploader :deep(.el-upload-dragger) {
  width: 100%;
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.cover-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 6px;
}

.view-header {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.view-cover {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.view-title-section h2 {
  margin: 0 0 12px 0;
  font-size: 20px;
}

.view-title-section .tags {
  display: flex;
  gap: 8px;
}

.mt-4 {
  margin-top: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 8px;
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.section-header .count {
  font-size: 14px;
  color: #909399;
}

.student-cell {
  display: flex;
  align-items: center;
}

.ml-2 {
  margin-left: 8px;
}

.empty-text {
  text-align: center;
  color: #909399;
  padding: 20px;
  background-color: #f9fafc;
  border-radius: 4px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  padding: 20px 0;
  margin-top: 20px;
}
</style>
