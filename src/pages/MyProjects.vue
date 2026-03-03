<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref} from 'vue'
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
import { getActivityTypeLabel, getActivityStatusLabel, getAttachmentUrl, getCoverImageUrl } from '@/util/util'
import PageHeader from '@/components/PageHeader.vue'

const userStore = useUserStore()
const activities = ref<Activity[]>([])
const loading = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const descriptionsDirection = ref<'horizontal' | 'vertical'>('horizontal')

const filtered = computed(() => {
  if (!searchQuery.value) return activities.value
  const query = searchQuery.value.toLowerCase()
  return activities.value.filter(a => 
    a.name.toLowerCase().includes(query) || 
    a.description?.toLowerCase().includes(query)
  )
})

const statusText = getActivityStatusLabel

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

const getTypeText = getActivityTypeLabel

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

const settlementDialogVisible = ref(false)
const settlementActivity = ref<Activity | null>(null)
const settlementParticipants = ref<{id: string, username: string}[]>([])
const selectedParticipants = ref<string[]>([])

const openSettlement = async (a: Activity) => {
  settlementActivity.value = a
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

const viewDialogVisible = ref(false)
const viewActivity = ref<Activity | null>(null)
const nameMap = ref<Record<string, string>>({})

const viewAttachments = computed(() => {
  const act = viewActivity.value as any
  if (!act) return []
  return act.Attachment || act.attachment || act.attachments || []
})

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

const checkScreenSize = () => {
  descriptionsDirection.value = window.innerWidth <= 768 ? 'vertical' : 'horizontal'
}

onMounted(() => {
  fetchMine()
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize)
})
</script>

<template>
  <div class="my-projects-page">
    <PageHeader title="我的项目" subtitle="管理您发布的所有志愿活动项目" />

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

    <el-card class="list-card" shadow="hover">
      <div class="hidden-xs-only">
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
              <el-tag effect="plain" round>{{ getTypeText(row.activityType) }}</el-tag>
            </template>
          </el-table-column>

          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-tooltip
                v-if="row.status === ActivityStatus.FailReview && (row.rejectedReason || row.reviewReason)"
                class="box-item"
                effect="dark"
                :content="'拒绝原因: ' + (row.rejectedReason || row.reviewReason)"
                placement="top"
              >
                <el-tag :type="statusType(row.status)" effect="dark" size="small" style="cursor: help">{{ statusText(row.status) }}</el-tag>
              </el-tooltip>
              <el-tag v-else :type="statusType(row.status)" effect="dark" size="small">{{ statusText(row.status) }}</el-tag>
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
      </div>

      <div class="visible-xs-only mobile-list">
        <div v-for="row in filtered" :key="row.id" class="mobile-project-card">
          <div class="card-header">
             <span class="card-title">{{ row.name }}</span>
             <el-tag :type="statusType(row.status)" size="small" effect="dark">{{ statusText(row.status) }}</el-tag>
          </div>
          <div class="card-body">
             <div class="card-row"><span class="label">类型: </span>{{ getTypeText(row.type) }}</div>
             <div class="card-row">
                 <span class="label">报名: </span>
                 <span>{{ row.participants?.length || 0 }} / {{ row.maxParticipants }}</span>
                 <el-tag size="small" :type="row.isFull ? 'danger' : 'success'" class="ml-2">
                  {{ row.isFull ? '已满员' : '未满员' }}
                </el-tag>
             </div>
             <div class="card-row timer-row"><span class="label">时间: </span>{{ formatTime(row.startTime) }}</div>
          </div>
          <div class="card-actions">
              <el-button size="small" @click="openView(row)" link type="primary">详情</el-button>
              <el-button 
                v-if="row.status === ActivityStatus.UnderReview || row.status === ActivityStatus.FailReview" 
                size="small" 
                type="primary" 
                @click="openEdit(row)" 
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
                >结束</el-button>
          </div>
        </div>
      </div>
      
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

    <el-dialog v-model="editDialogVisible" title="修改项目" width="90%" destroy-on-close class="custom-dialog">
      <div v-if="editForm" class="dialog-content">
        <el-form :model="editForm" label-width="100px" label-position="top">
          <el-row :gutter="20">
            <el-col :span="16" :xs="24">
              <el-form-item label="项目名称">
                <el-input v-model="editForm.name" placeholder="请输入项目名称" />
              </el-form-item>
            </el-col>
            <el-col :span="8" :xs="24">
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
            <el-col :span="12" :xs="24">
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
            <el-col :span="12" :xs="24">
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
                  disabled
                  type="datetime"
                  placeholder="实际结束时间"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12" :xs="24">
              <el-form-item label="最大人数">
                <el-input-number v-model="editForm.maxParticipants" :min="1" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12" :xs="24">
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

    <el-dialog v-model="viewDialogVisible" title="项目详情" width="90%" class="custom-dialog">
        <div v-if="viewActivity" class="view-content">
          <div class="view-header">
  <el-image
    v-if="viewActivity.CoverImage"
    :src="getCoverImageUrl(viewActivity.CoverImage)"
    class="view-cover"
    fit="cover"
    lazy
  >
    <template #placeholder>
      <div class="view-cover" />
    </template>
  </el-image>
          <div class="view-title-section">
            <h2>{{ viewActivity.name }}</h2>
            <div class="tags">
              <el-tag>{{ getTypeText(viewActivity.type) }}</el-tag>
              <el-tag :type="statusType(viewActivity.status)" effect="dark">{{ statusText(viewActivity.status) }}</el-tag>
            </div>
          </div>
        </div>

        <el-descriptions :column="2" border class="mt-4" :direction="descriptionsDirection">
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
          <el-descriptions-item label="拒绝原因" :span="2" v-if="viewActivity.status === ActivityStatus.FailReview && (viewActivity.rejectedReason || viewActivity.reviewReason)">
            <el-alert type="error" :closable="false" show-icon>
              {{ viewActivity.rejectedReason || viewActivity.reviewReason }}
            </el-alert>
          </el-descriptions-item>
          <el-descriptions-item label="附件" :span="2" v-if="viewAttachments && viewAttachments.length > 0">
            <div v-for="(file, index) in viewAttachments" :key="index" class="attachment-link">
               <el-link :href="getAttachmentUrl(file)" target="_blank" type="primary" :underline="false">
                 <el-icon><Document /></el-icon> {{ file.split('/').pop() || '下载附件' }}
               </el-link>
            </div>
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

    <el-dialog v-model="settlementDialogVisible" title="活动结算" width="90%" class="custom-dialog">
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
.text-danger { color: var(--danger-500); font-weight: bold; }
.reject-reason { margin-top: 8px; padding-top: 8px; border-top: 1px dashed #e2e8f0; }
.attachment-link { margin-bottom: 6px; display: block; }
.my-projects-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 30px 5%;
  min-height: 80vh;
  animation: fadeUp 0.5s ease;
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: rgba(255, 255, 255, 0.95);
  padding: 16px 20px;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
}
.search-input { width: 320px; }
.search-input :deep(.el-input__wrapper) { border-radius: 20px; }
.list-card {
  border-radius: 20px;
  border: none !important;
  box-shadow: 0 10px 30px -5px rgba(0,0,0,0.08);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
}
.project-name-cell { display: flex; align-items: center; gap: 14px; }
.project-cover { 
  background: linear-gradient(135deg, var(--brand-50), var(--brand-100)); 
  color: var(--brand-400); 
  border-radius: 10px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}
.name-text { font-weight: 600; color: #1e293b; font-size: 15px; }
.participants-info { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #475569; margin-bottom: 6px; font-weight: 500; }
.participants-progress { width: 95%; }
.participants-progress :deep(.el-progress-bar__outer) { background-color: #e2e8f0; }
.time-cell { font-size: 13px; color: #475569; line-height: 1.6; }
.time-row { margin-bottom: 2px; }
.time-row .label { color: #94a3b8; margin-right: 6px; font-weight: 500; }
.action-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
.action-buttons .el-button { padding: 4px 10px; border-radius: 6px; }
.cover-uploader { width: 100%; }
.cover-uploader :deep(.el-upload-dragger) {
  width: 100%;
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  border: 2px dashed #cbd5e1;
  background: #f8fafc;
  transition: all 0.3s ease;
}
.cover-uploader :deep(.el-upload-dragger:hover) {
  border-color: var(--brand-500);
  background: #f0f9ff;
}
.cover-image { width: 100%; height: 200px; object-fit: cover; border-radius: 12px; }
.upload-placeholder .el-icon--upload { font-size: 48px; color: var(--brand-400); margin-bottom: 16px; }
.upload-placeholder .el-upload__text { color: #64748b; }
.view-header { display: flex; gap: 24px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #f1f5f9; }
.view-cover {
  width: 140px;
  height: 140px;
  object-fit: cover;
  border-radius: 16px;
  background: #f8fafc;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.view-title-section { display: flex; flex-direction: column; justify-content: center; }
.view-title-section h2 { margin: 0 0 16px 0; font-size: 24px; color: #1e293b; font-weight: 800; }
.view-title-section .tags { display: flex; gap: 10px; }
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  border-bottom: 2px solid #f1f5f9;
  padding-bottom: 12px;
}
.section-header h3 { margin: 0; font-size: 18px; color: #1e293b; font-weight: 700; }
.section-header .count { font-size: 14px; color: #64748b; font-weight: 500; background: #f1f5f9; padding: 2px 10px; border-radius: 12px; }
.student-cell { display: flex; align-items: center; font-weight: 500; }
.custom-dialog :deep(.el-dialog) { border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
.custom-dialog :deep(.el-dialog__header) { padding: 20px 24px; margin: 0; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
.custom-dialog :deep(.el-dialog__title) { font-weight: 700; color: #1e293b; font-size: 18px; }
.custom-dialog :deep(.el-dialog__body) { padding: 24px; }
.custom-dialog :deep(.el-dialog__footer) { padding: 16px 24px; border-top: 1px solid #e2e8f0; background: #f8fafc; }
.empty-text { text-align: center; color: #64748b; padding: 40px; background-color: #f8fafc; border-radius: 12px; font-weight: 500; }
.pagination-container { display: flex; justify-content: center; padding: 30px 0 10px; }
.mt-4 { margin-top: 24px; }
.ml-2 { margin-left: 8px; }
@media (max-width: 768px) {
  .my-projects-page { padding: 16px; }
  .actions-bar { flex-direction: column; align-items: stretch; gap: 12px; padding: 16px; }
  .search-input { width: 100%; }
  .view-header { flex-direction: column; align-items: center; text-align: center; }
  .view-cover { margin-bottom: 12px; width: 120px; height: 120px; }
  .view-title-section .tags { justify-content: center; }
  .mobile-list { display: flex; flex-direction: column; gap: 16px; }
  .mobile-project-card {
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 20px;
    background: #ffffff;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
  }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 12px;
  }
  .card-title { font-weight: 700; font-size: 16px; color: #1e293b; line-height: 1.4; margin-right: 12px; }
  .card-body { font-size: 14px; color: #475569; }
  .card-row { margin-bottom: 10px; display: flex; align-items: center; }
  .card-row.timer-row { font-size: 13px; margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e2e8f0; color: #64748b; }
  .card-row .label { font-weight: 600; margin-right: 8px; min-width: 44px; color: #94a3b8; }
  .card-actions {
    display: flex;
    justify-content: flex-end;
    background: #f8fafc;
    padding: 12px;
    margin: 16px -20px -20px -20px;
    border-radius: 0 0 16px 16px;
    border-top: 1px solid #e2e8f0;
    flex-wrap: wrap;
    gap: 10px;
  }
}
</style>
