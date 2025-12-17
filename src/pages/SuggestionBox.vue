<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, ChatDotRound, RefreshLeft } from '@element-plus/icons-vue'
import { suggestionService, type Suggestion } from '@/services/suggestionService'
import { useUserStore } from '@/stores/useUserStore'

const userStore = useUserStore()
const isAdmin = computed(() => ['admin', 'superAdmin'].includes(userStore.role.value || ''))

const suggestions = ref<Suggestion[]>([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const activeTab = ref('list') // 'list' or 'create'

// Admin filter
const statusFilter = ref('')

// Create Form
const createForm = ref({
  title: '',
  content: ''
})
const submitting = ref(false)

// Reply Dialog
const replyDialogVisible = ref(false)
const currentSuggestion = ref<Suggestion | null>(null)
const replyContent = ref('')
const replying = ref(false)

const fetchData = async () => {
  loading.value = true
  try {
    const res = isAdmin.value 
      ? await suggestionService.getAllSuggestions(currentPage.value, pageSize.value, statusFilter.value)
      : await suggestionService.getMySuggestions(currentPage.value, pageSize.value)
    
    suggestions.value = res?.items || []
    total.value = res?.total || 0
  } catch (e) {
    console.error(e)
    ElMessage.error('加载意见列表失败')
  } finally {
    loading.value = false
  }
}

const handleCreate = async () => {
  if (!createForm.value.title || !createForm.value.content) {
    ElMessage.warning('请填写完整信息')
    return
  }
  submitting.value = true
  try {
    await suggestionService.createSuggestion(createForm.value)
    ElMessage.success('提交成功')
    createForm.value = { title: '', content: '' }
    activeTab.value = 'list'
    fetchData()
  } catch (e) {
    console.error(e)
    ElMessage.error('提交失败')
  } finally {
    submitting.value = false
  }
}

const openReply = (item: Suggestion) => {
  currentSuggestion.value = item
  replyContent.value = ''
  replyDialogVisible.value = true
}

const handleReply = async () => {
  if (!replyContent.value || !currentSuggestion.value) return
  replying.value = true
  try {
    await suggestionService.replySuggestion(currentSuggestion.value.id, replyContent.value)
    ElMessage.success('回复成功')
    replyDialogVisible.value = false
    fetchData()
  } catch (e) {
    console.error(e)
    ElMessage.error('回复失败')
  } finally {
    replying.value = false
  }
}

const formatTime = (time: string) => {
  if (!time) return ''
  return new Date(time).toLocaleString()
}

const getStatusType = (status: string) => {
  return status === 'REPLIED' ? 'success' : 'warning'
}

const getStatusText = (status: string) => {
  return status === 'REPLIED' ? '已回复' : '待回复'
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchData()
}

watch(isAdmin, () => {
  fetchData()
})

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="suggestion-box-page">
    <div class="page-header">
      <div class="header-content">
        <h1 class="title">意见反馈箱</h1>
        <p class="subtitle">您的建议是我们进步的动力</p>
      </div>
      <div class="header-decoration">
        <div class="circle circle-1"></div>
        <div class="circle circle-2"></div>
      </div>
    </div>

    <div class="content-container">
      <el-card shadow="hover" class="main-card">
        <template #header>
          <div class="card-header">
            <div class="left">
              <el-radio-group v-model="activeTab" v-if="!isAdmin">
                <el-radio-button label="list">我的反馈</el-radio-button>
                <el-radio-button label="create">提交新意见</el-radio-button>
              </el-radio-group>
              <span v-else class="admin-title">反馈管理</span>
            </div>
            <div class="right">
              <el-select v-if="isAdmin" v-model="statusFilter" placeholder="状态筛选" clearable @change="fetchData" style="width: 120px; margin-right: 10px;">
                <el-option label="待回复" value="PENDING" />
                <el-option label="已回复" value="REPLIED" />
              </el-select>
              <el-button :icon="RefreshLeft" circle @click="fetchData" />
            </div>
          </div>
        </template>

        <!-- List View -->
        <div v-if="activeTab === 'list'">
          <el-empty v-if="!loading && suggestions.length === 0" description="暂无反馈记录" />
          
          <div v-else class="suggestion-list" v-loading="loading">
            <div v-for="item in suggestions" :key="item.id" class="suggestion-item">
              <div class="item-header">
                <span class="item-title">{{ item.title }}</span>
                <el-tag :type="getStatusType(item.status)" size="small" effect="dark">{{ getStatusText(item.status) }}</el-tag>
              </div>
              
              <div class="item-meta">
                <span v-if="isAdmin && item.username" class="author">提交人: {{ item.username }} ({{ item.studentNo }})</span>
                <span class="time">{{ formatTime(item.createTime) }}</span>
              </div>
              
              <div class="item-content">
                {{ item.content }}
              </div>

              <div v-if="item.status === 'REPLIED'" class="reply-section">
                <div class="reply-header">
                  <el-icon><ChatDotRound /></el-icon> 管理员回复:
                  <span class="reply-time">{{ formatTime(item.replyTime!) }}</span>
                </div>
                <div class="reply-content">{{ item.replyContent }}</div>
              </div>

              <div v-if="isAdmin && item.status === 'PENDING'" class="admin-actions">
                <el-button type="primary" size="small" @click="openReply(item)">回复</el-button>
              </div>
            </div>
          </div>

          <div class="pagination-container" v-if="total > 0">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :total="total"
              layout="prev, pager, next"
              @current-change="handlePageChange"
            />
          </div>
        </div>

        <!-- Create View -->
        <div v-else class="create-form">
          <el-form :model="createForm" label-position="top">
            <el-form-item label="标题">
              <el-input v-model="createForm.title" placeholder="请输入简短的标题" />
            </el-form-item>
            <el-form-item label="内容">
              <el-input 
                v-model="createForm.content" 
                type="textarea" 
                :rows="6" 
                placeholder="请详细描述您的建议或遇到的问题..." 
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleCreate" :loading="submitting" style="width: 100%">提交反馈</el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-card>
    </div>

    <!-- Reply Dialog -->
    <el-dialog v-model="replyDialogVisible" title="回复反馈" width="500px">
      <div v-if="currentSuggestion" class="reply-dialog-content">
        <div class="original-content">
          <h4>{{ currentSuggestion.title }}</h4>
          <p>{{ currentSuggestion.content }}</p>
        </div>
        <el-input
          v-model="replyContent"
          type="textarea"
          :rows="4"
          placeholder="请输入回复内容"
        />
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="replyDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleReply" :loading="replying">发送回复</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.suggestion-box-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  min-height: 80vh;
}

/* Header */
.page-header {
  background: linear-gradient(135deg, #67c23a 0%, #42b983 100%);
  border-radius: 16px;
  padding: 40px;
  margin-bottom: 30px;
  color: white;
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 20px rgba(103, 194, 58, 0.2);
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

.main-card {
  border-radius: 12px;
  border: none;
  min-height: 500px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.admin-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.suggestion-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.suggestion-item {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.3s;
}

.suggestion-item:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.item-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.item-meta {
  font-size: 12px;
  color: #909399;
  margin-bottom: 12px;
  display: flex;
  gap: 10px;
}

.item-content {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  white-space: pre-wrap;
  margin-bottom: 12px;
}

.reply-section {
  background-color: #f0f9eb;
  padding: 12px;
  border-radius: 6px;
  margin-top: 10px;
}

.reply-header {
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #67c23a;
  margin-bottom: 6px;
}

.reply-time {
  font-weight: normal;
  color: #909399;
  margin-left: auto;
  font-size: 12px;
}

.reply-content {
  font-size: 14px;
  color: #5e6d82;
  line-height: 1.5;
}

.admin-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
  border-top: 1px solid #f0f2f5;
  padding-top: 10px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.create-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px 0;
}

.original-content {
  background: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
}

.original-content h4 {
  margin: 0 0 5px 0;
  font-size: 14px;
}

.original-content p {
  margin: 0;
  font-size: 13px;
  color: #606266;
}

@media (max-width: 768px) {
  .suggestion-box-page {
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
}
</style>
