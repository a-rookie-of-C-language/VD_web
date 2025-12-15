<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { activityService } from '../services/activityService'
import { userService } from '../services/userService'
import { ActivityType } from '../entity/ActivityType'
import { getActivityTypeOptions } from '@/util/util'
import { ElMessage } from 'element-plus'
import { Plus, UploadFilled } from '@element-plus/icons-vue'
import type { UploadProps, UploadFile, UploadUserFile } from 'element-plus'
import { useUserStore } from '@/stores/useUserStore'
import type { User } from '@/entity/User'

const router = useRouter()
const userStore = useUserStore()
const role = userStore.role
const studentNo = userStore.studentNo

// Form State
const formRef = ref()
const labelPosition = ref('right')
const form = reactive({
  name: '',
  type: '' as ActivityType | '',
  description: '',
  coverImage: null as File | null,
  duration: 0,
  participants: [] as string[] // Selected student IDs
})

// User Selection State
const allUsers = ref<User[]>([])
const loadingUsers = ref(false)

// Excel Import State
const excelFile = ref<UploadUserFile[]>([])

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
  loadUsers()
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
        // ElMessage.error('加载用户列表失败') // Suppress error for now as backend might not be ready
    } finally {
        loadingUsers.value = false
    }
}

// Image Upload Handlers
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

// Excel Upload Handlers
const handleExcelChange: UploadProps['onChange'] = (file) => {
  excelFile.value = [file]
}

const handleExcelRemove: UploadProps['onRemove'] = () => {
  excelFile.value = []
}

// Form Submit
const handleFormSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) return

    // Validation: Must have either participants selected OR excel file uploaded
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
        endTime: new Date().toISOString(), // Submission time
        duration: form.duration,
        participants: form.participants,
        coverFile: form.coverImage,
        file: excelFile.value.length > 0 ? excelFile.value[0].raw : undefined
      }

      await activityService.importActivity(activityData)
      ElMessage.success('活动导入成功!')
      router.push('/app/activities')
    } catch (err: any) {
      console.error('Failed to import activity:', err)
      ElMessage.error(err.message || '导入活动失败')
    } finally {
      loading.value = false
    }
  })
}

const handleCancel = () => {
  router.back()
}
</script>

<template>
  <div class="import-activity-page">
    <el-card class="page-header">
      <h1 class="page-title">后台导入活动</h1>
      <p class="subtitle">仅限负责人或管理员使用，可导入已有活动数据</p>
    </el-card>

    <div class="content-container">
      <el-card>
          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-width="120px"
            :label-position="labelPosition"
          >
            <!-- Basic Info Section -->
            <el-divider content-position="left">
              <span class="section-title">基本信息</span>
            </el-divider>
            
            <el-form-item label="活动名称" prop="name">
              <el-input 
                v-model="form.name" 
                placeholder="请输入活动名称"
                clearable
              />
            </el-form-item>

            <el-form-item label="活动类型" prop="type">
              <el-select 
                v-model="form.type" 
                placeholder="请选择活动类型"
                clearable
                style="width: 100%"
              >
                <el-option
                  v-for="type in activityTypes"
                  :key="type.value"
                  :label="type.label"
                  :value="type.value"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="负责人(学号)">
              <el-input :model-value="studentNo" disabled />
            </el-form-item>

            <el-form-item label="活动描述" prop="description">
              <el-input 
                v-model="form.description" 
                type="textarea"
                :rows="4"
                placeholder="请输入活动详细描述"
              />
            </el-form-item>
            
            <el-form-item label="封面图片">
              <el-upload
                class="cover-uploader"
                :auto-upload="false"
                :show-file-list="false"
                :on-change="handleImageChange"
                :before-upload="beforeImageUpload"
                accept="image/*"
              >
                <img v-if="imageUrl" :src="imageUrl" class="cover-image"  alt=""/>
                <el-icon v-else class="cover-uploader-icon"><Plus /></el-icon>
              </el-upload>
              <div class="upload-tip">支持 jpg、png 格式,大小不超过 20MB</div>
            </el-form-item>

            <el-form-item label="志愿时长" prop="duration">
              <el-input-number
                  v-model="form.duration"
                  :min="0.5"
                  :step="0.5"
                  style="width: 100%; max-width: 200px"
              />
            </el-form-item>

            <!-- Participants Section -->
            <el-divider content-position="left">
              <span class="section-title">参与人员</span>
            </el-divider>

            <div class="participants-section">
                <el-alert
                    title="请选择参与人员或上传Excel名单（两者可同时使用）"
                    type="info"
                    :closable="false"
                    show-icon
                    class="mb-4"
                />

                <el-form-item label="手动选择">
                    <el-select
                        v-model="form.participants"
                        multiple
                        filterable
                        placeholder="请搜索并选择参与人员"
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

                <el-form-item label="Excel导入">
                    <el-upload
                        class="excel-uploader"
                        action="#"
                        :auto-upload="false"
                        :limit="1"
                        accept=".xlsx, .xls"
                        :file-list="excelFile"
                        :on-change="handleExcelChange"
                        :on-remove="handleExcelRemove"
                    >
                        <el-button type="primary" :icon="UploadFilled">上传名单文件</el-button>
                        <template #tip>
                            <div class="el-upload__tip">
                                仅需包含一列：<b>学号</b>。支持 .xlsx, .xls 格式。
                            </div>
                        </template>
                    </el-upload>
                </el-form-item>
            </div>

            <el-form-item class="form-actions">
              <el-button type="primary" :loading="loading" @click="handleFormSubmit" class="action-btn">
                {{ loading ? '导入中...' : '确认导入' }}
              </el-button>
              <el-button @click="handleCancel" class="action-btn">取消</el-button>
            </el-form-item>
          </el-form>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.import-activity-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  color: var(--el-text-color-primary);
}

.subtitle {
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
  margin-top: 5px;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.cover-uploader {
  display: inline-block;
}

.cover-uploader :deep(.el-upload) {
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: var(--el-transition-duration-fast);
  width: 178px;
  height: 178px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-uploader :deep(.el-upload:hover) {
  border-color: var(--el-color-primary);
}

.cover-uploader-icon {
  font-size: 28px;
  color: var(--el-text-color-placeholder);
}

.cover-image {
  width: 178px;
  height: 178px;
  object-fit: cover;
  display: block;
}

.upload-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 8px;
}

.participants-section {
    padding: 10px 0;
}

.mb-4 {
    margin-bottom: 16px;
}

@media (max-width: 768px) {
  .import-activity-page {
    padding: 10px;
  }
  
  .form-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .action-btn {
    width: 100%;
    margin-left: 0 !important;
  }
  
  /* Make uploaders responsive */
  .cover-uploader :deep(.el-upload), .cover-image {
    width: 100%;
    max-width: 178px;
  }
}
</style>
