<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { activityService } from '../services/activityService'
import { batchImportService } from '../services/batchImportService'
import { userService } from '../services/userService'
import { ActivityType } from '../entity/ActivityType'
import { getActivityTypeOptions } from '@/util/util'
import { ElMessage } from 'element-plus'
import { Plus, UploadFilled, Download, Document } from '@element-plus/icons-vue'
import type { UploadProps, UploadFile, UploadUserFile } from 'element-plus'
import { useUserStore } from '@/stores/useUserStore'
import type { User } from '@/entity/User'
import PageHeader from '@/components/PageHeader.vue'

const router = useRouter()
const userStore = useUserStore()
const role = userStore.role
const studentNo = userStore.studentNo

const formRef = ref()
const labelPosition = ref('right')
const form = reactive({
  name: '',
  type: '' as ActivityType | '',
  description: '',
  coverImage: null as File | null,
  attachment: [] as UploadUserFile[],
  duration: 0,
  participants: [] as string[]
})

const allUsers = ref<User[]>([])
const loadingUsers = ref(false)

const excelFile = ref<UploadUserFile[]>([])

const importMode = ref('single')
const batchExcelFile = ref<UploadUserFile[]>([])

const loading = ref(false)
const imageUrl = ref('')

const activityTypes = getActivityTypeOptions()

const rules = {
  name: [{ required: true, message: '请输入活动名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择活动类型', trigger: 'change' }],
  description: [{ required: true, message: '请输入活动描述', trigger: 'blur' }],
  duration: [{ required: true, message: '请输入志愿时长', trigger: 'change' }]
}

const checkScreenSize = () => {
  labelPosition.value = window.innerWidth <= 768 ? 'top' : 'right'
}

onMounted(async () => {
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
  
  if (!userStore.currentUser) {
    await userStore.loadUserInfo()
  }
  if (role.value !== 'functionary' && role.value !== 'admin' && role.value !== 'superAdmin') {
    ElMessage.warning('仅负责人或管理员可以导入活动')
    await router.push('/app/activities')
  }
  await loadUsers()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize)
})

const loadUsers = async () => {
    loadingUsers.value = true
    try {
        allUsers.value = await userService.getAllUsers()
    } catch (e) {
        console.error(e)
    } finally {
        loadingUsers.value = false
    }
}

const handleImageChange: UploadProps['onChange'] = (uploadFile: UploadFile) => {
  if (uploadFile.raw) {
    const reader = new FileReader()
    reader.onload = (e) => {
      imageUrl.value = String(e.target?.result || '')
    }
    reader.readAsDataURL(uploadFile.raw)
    form.coverImage = uploadFile.raw
  }
}

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

const handleExcelChange: UploadProps['onChange'] = (file) => {
  excelFile.value = [file]
}

const handleExcelRemove: UploadProps['onRemove'] = () => {
  excelFile.value = []
}

const handleBatchExcelChange: UploadProps['onChange'] = (file) => {
  batchExcelFile.value = [file]
}

const handleBatchExcelRemove: UploadProps['onRemove'] = () => {
  batchExcelFile.value = []
}

const formatDateTime = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+08:00`
}

const downloadTemplate = () => {
  const link = document.createElement('a')
  link.href = '/standard/standard.xlsx'
  link.download = 'standard.xlsx'
  link.click()
  ElMessage.success('模板下载中...')
}

const handleFormSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) return

    if (form.participants.length === 0 && excelFile.value.length === 0) {
        ElMessage.warning('请选择参与人员或上传Excel名单')
        return
    }

    loading.value = true

    try {
      const activityData = {
        functionary: studentNo.value,
        name: form.name,
        type: form.type as ActivityType,
        description: form.description,
        endTime: formatDateTime(new Date()),
        duration: form.duration,
        participants: form.participants,
        coverFile: form.coverImage,
        file: excelFile.value.length > 0 ? excelFile.value[0].raw : undefined
      }

      await activityService.importActivity(activityData)
      ElMessage.success('活动导入成功!')
      router.push('/app/my-projects')
    } catch (err: any) {
      console.error('Failed to import activity:', err)
      ElMessage.error(err.message || '导入活动失败')
    } finally {
      loading.value = false
    }
  })
}

const handleBatchImport = async () => {
  if (batchExcelFile.value.length === 0) {
    ElMessage.warning('请选择要导入的Excel文件')
    return
  }

  loading.value = true
  try {
    const file = batchExcelFile.value[0].raw
    if (!file) {
      ElMessage.error('文件无效')
      return
    }

    await batchImportService.batchImportActivities(file)
    ElMessage.success('批量导入成功!')
    router.push('/app/my-projects')
  } catch (err: any) {
    console.error('Failed to batch import:', err)
    ElMessage.error(err.message || '批量导入失败')
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  router.back()
}
</script>

<template>
  <div class="import-activity-page">
    <PageHeader title="活动导入中心" subtitle="支持单个录入与批量导入，请确保数据准确性" />

    <el-card class="main-card" shadow="never">
      <el-tabs v-model="importMode" class="import-tabs">
        <el-tab-pane label="单个活动录入" name="single">
          <div class="tab-content">
            <el-form
              ref="formRef"
              :model="form"
              :rules="rules"
              label-width="100px"
              :label-position="labelPosition"
              class="single-form"
            >
              <div class="form-section">
                <h3 class="section-header">基本信息</h3>
                <div class="form-grid">
                  <el-form-item label="活动名称" prop="name" class="full-width">
                    <el-input v-model="form.name" placeholder="请输入活动名称" clearable />
                  </el-form-item>

                  <el-form-item label="活动类型" prop="type">
                    <el-select v-model="form.type" placeholder="请选择类型" style="width: 100%">
                      <el-option
                        v-for="type in activityTypes"
                        :key="type.value"
                        :label="type.label"
                        :value="type.value"
                      />
                    </el-select>
                  </el-form-item>

                  <el-form-item label="志愿时长" prop="duration">
                    <el-input-number v-model="form.duration" :min="0.5" :step="0.5" style="width: 100%" />
                  </el-form-item>

                  <el-form-item label="负责人">
                    <el-input :model-value="studentNo" disabled />
                  </el-form-item>

                  <el-form-item label="活动描述" prop="description" class="full-width">
                    <el-input
                      v-model="form.description"
                      type="textarea"
                      :rows="3"
                      placeholder="请输入活动详细描述"
                    />
                  </el-form-item>
                </div>
              </div>

              <div class="form-section">
                <h3 class="section-header">附件与图片</h3>
                <div class="form-grid">
                  <el-form-item label="封面图片">
                    <el-upload
                      class="cover-uploader"
                      :auto-upload="false"
                      :show-file-list="false"
                      :on-change="handleImageChange"
                      :before-upload="beforeImageUpload"
                      accept="image/*"
                    >
                      <img v-if="imageUrl" :src="imageUrl" class="cover-image" alt="" />
                      <el-icon v-else class="cover-uploader-icon"><Plus /></el-icon>
                    </el-upload>
                    <div class="upload-tip">建议尺寸 1:1，大小 &lt; 20MB</div>
                  </el-form-item>

                  <el-form-item label="附件材料" class="full-width">
                    <el-upload
                      v-model:file-list="form.attachment"
                      action="#"
                      :auto-upload="false"
                      multiple
                      class="attachment-uploader"
                    >
                      <el-button :icon="Plus">添加附件</el-button>
                    </el-upload>
                  </el-form-item>
                </div>
              </div>

              <div class="form-section">
                <h3 class="section-header">参与人员</h3>
                <el-alert
                  title="支持混合模式：可同时手动选择人员和上传Excel名单"
                  type="info"
                  show-icon
                  :closable="false"
                  class="mb-4"
                />

                <el-form-item label="手动选择" class="full-width">
                  <el-select
                    v-model="form.participants"
                    multiple
                    filterable
                    placeholder="搜索并选择学生"
                    style="width: 100%"
                    :loading="loadingUsers"
                  >
                    <el-option
                      v-for="user in allUsers"
                      :key="user.studentNo"
                      :label="`${user.username} (${user.studentNo})`"
                      :value="user.studentNo"
                    />
                  </el-select>
                </el-form-item>

                <el-form-item label="名单导入" class="full-width">
                  <el-upload
                    class="excel-uploader-simple"
                    action="#"
                    :auto-upload="false"
                    :limit="1"
                    accept=".xlsx, .xls"
                    :file-list="excelFile"
                    :on-change="handleExcelChange"
                    :on-remove="handleExcelRemove"
                  >
                    <el-button :icon="UploadFilled">上传名单Excel</el-button>
                    <template #tip>
                      <div class="el-upload__tip">仅需包含一列：学号。若包含时长列，则优先使用Excel中的时长。</div>
                    </template>
                  </el-upload>
                </el-form-item>
              </div>

              <div class="form-actions">
                <el-button type="primary" size="large" :loading="loading" @click="handleFormSubmit">
                  确认导入
                </el-button>
                <el-button size="large" @click="handleCancel">取消</el-button>
              </div>
            </el-form>
          </div>
        </el-tab-pane>

        <el-tab-pane label="批量导入活动" name="batch">
          <div class="tab-content batch-content">
            <div class="batch-steps">
              <div class="step-card">
                <div class="step-icon-wrapper bg-blue">
                  <el-icon><Document /></el-icon>
                </div>
                <div class="step-content">
                  <h4>1. 下载模板</h4>
                  <p>获取标准Excel模板，包含所有必要字段说明。</p>
                  <el-button type="primary" link @click="downloadTemplate">
                    点击下载模板 <el-icon class="el-icon--right"><Download /></el-icon>
                  </el-button>
                </div>
              </div>

              <div class="step-card">
                <div class="step-icon-wrapper bg-green">
                  <el-icon><UploadFilled /></el-icon>
                </div>
                <div class="step-content">
                  <h4>2. 填写并上传</h4>
                  <p>按模板格式填写活动信息后上传文件。</p>
                </div>
              </div>
            </div>

            <div class="upload-area">
              <el-upload
                class="batch-uploader"
                drag
                action="#"
                :auto-upload="false"
                :limit="1"
                accept=".xlsx, .xls"
                :file-list="batchExcelFile"
                :on-change="handleBatchExcelChange"
                :on-remove="handleBatchExcelRemove"
              >
                <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
                <div class="el-upload__text">
                  将Excel文件拖到此处，或 <em>点击上传</em>
                </div>
                <template #tip>
                  <div class="el-upload__tip text-center">
                    支持 .xlsx, .xls 格式，请务必使用标准模板
                  </div>
                </template>
              </el-upload>
            </div>

            <div class="form-actions centered">
              <el-button type="primary" size="large" :loading="loading" @click="handleBatchImport" class="wide-btn">
                开始批量导入
              </el-button>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<style scoped>
.import-activity-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 30px 5%;
  min-height: 80vh;
  background: transparent;
  animation: fadeUp 0.5s ease;
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.main-card {
  border-radius: 20px;
  border: none !important;
  box-shadow: 0 10px 30px -5px rgba(0,0,0,0.08);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 10px;
}
.import-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 2px;
  background-color: #f1f5f9;
}
.import-tabs :deep(.el-tabs__active-bar) {
  height: 3px;
  border-radius: 3px;
}
.import-tabs :deep(.el-tabs__item) { 
  font-size: 16px; 
  font-weight: 600; 
  height: 56px; 
  line-height: 56px; 
  color: #64748b; 
}
.import-tabs :deep(.el-tabs__item.is-active) { color: var(--brand-600); }
.tab-content { padding: 30px 10px 10px; }
.section-header {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 24px;
  padding-left: 14px;
  border-left: 4px solid var(--brand-500);
  display: flex;
  align-items: center;
}
.form-section { 
  margin-bottom: 40px; 
  background: #f8fafc;
  padding: 24px;
  border-radius: 16px;
}
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 30px; }
.full-width { grid-column: 1 / -1; }
.cover-uploader :deep(.el-upload) {
  border: 2px dashed #cbd5e1;
  border-radius: 16px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  width: 140px;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
}
.cover-uploader :deep(.el-upload:hover) { 
  border-color: var(--brand-500); 
  background-color: #f0f9ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--brand-500-rgb, 59, 130, 246), 0.1);
}
.cover-uploader-icon { font-size: 28px; color: #94a3b8; }
.cover-image { width: 140px; height: 140px; object-fit: cover; }
.upload-tip { font-size: 13px; color: #64748b; margin-top: 10px; }
.batch-steps { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 40px; }
.step-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: flex-start;
  gap: 20px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
  transition: all 0.3s ease;
}
.step-card:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
.step-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  font-size: 24px;
}
.bg-blue { background: linear-gradient(135deg, var(--brand-400), var(--brand-600)); box-shadow: 0 4px 10px rgba(var(--brand-500-rgb, 59, 130, 246), 0.3); }
.bg-green { background: linear-gradient(135deg, var(--accent-400), var(--accent-600)); box-shadow: 0 4px 10px rgba(var(--accent-500-rgb, 16, 185, 129), 0.3); }
.step-content h4 { margin: 0 0 10px 0; font-size: 16px; font-weight: 700; color: #1e293b; }
.step-content p { margin: 0 0 12px 0; font-size: 14px; color: #64748b; line-height: 1.5; }
.upload-area { margin-bottom: 40px; }
.batch-uploader :deep(.el-upload-dragger) { 
  padding: 50px 40px; 
  border-radius: 20px; 
  border: 2px dashed #cbd5e1;
  background: #f8fafc;
  transition: all 0.3s ease;
}
.batch-uploader :deep(.el-upload-dragger:hover) {
  border-color: var(--brand-500);
  background: #f0f9ff;
}
.el-icon--upload { font-size: 64px; color: var(--brand-400); margin-bottom: 16px; }
.form-actions { display: flex; gap: 16px; margin-top: 30px; }
.form-actions.centered { justify-content: center; }
.wide-btn { 
  min-width: 220px; 
  height: 50px; 
  font-size: 16px; 
  font-weight: 600; 
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(var(--brand-500-rgb, 59, 130, 246), 0.3);
}
@media (max-width: 768px) {
  .form-grid { grid-template-columns: 1fr; }
  .batch-steps { grid-template-columns: 1fr; }
  .import-activity-page { padding: 16px; }
  .form-section { padding: 16px; }
}
</style>
