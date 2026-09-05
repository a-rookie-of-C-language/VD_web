<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { monitorService, type ElkLogItem } from '@/services/monitorService'
import { notifyRequestError } from '@/services/uiErrorService'

const logs = ref<ElkLogItem[]>([])
const loading = ref(false)
const keyword = ref('')

const fetchLogs = async () => {
  loading.value = true
  try {
    logs.value = await monitorService.getLogs(100, keyword.value)
  } catch (error) {
    notifyRequestError(error, '日志加载失败')
  } finally {
    loading.value = false
  }
}

const formatLogTime = (value: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

onMounted(() => {
  fetchLogs()
})
</script>

<template>
  <div class="log-page">
    <PageHeader title="日志中心" subtitle="查看 Elasticsearch 中的后端运行日志">
      <template #controls>
        <div class="header-controls">
          <el-input
            v-model="keyword"
            clearable
            placeholder="关键字过滤（message/logger/level）"
            class="filter-input"
            @keyup.enter="fetchLogs"
          />
          <el-button type="primary" :loading="loading" @click="fetchLogs">刷新</el-button>
        </div>
      </template>
    </PageHeader>

    <el-card shadow="hover" class="list-card">
      <el-table :data="logs" stripe style="width: 100%" v-loading="loading" class="hidden-xs-only">
        <el-table-column prop="timestamp" label="时间" width="190">
          <template #default="{ row }">{{ formatLogTime(row.timestamp) }}</template>
        </el-table-column>
        <el-table-column prop="level" label="级别" width="90" />
        <el-table-column prop="logger" label="Logger" min-width="250" show-overflow-tooltip />
        <el-table-column prop="thread" label="线程" min-width="120" show-overflow-tooltip />
        <el-table-column prop="message" label="消息" min-width="380" show-overflow-tooltip />
      </el-table>

      <div class="visible-xs-only mobile-log-list" v-loading="loading">
        <div v-for="(item, index) in logs" :key="`${item.timestamp}-${index}`" class="mobile-log-card">
          <div class="mobile-log-head">
            <span class="level">{{ item.level }}</span>
            <span class="time">{{ formatLogTime(item.timestamp) }}</span>
          </div>
          <div class="line"><span>Logger:</span> {{ item.logger || '-' }}</div>
          <div class="line"><span>线程:</span> {{ item.thread || '-' }}</div>
          <div class="line"><span>消息:</span> {{ item.message || '-' }}</div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.log-page {
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

.filter-input {
  width: 280px;
}

.list-card {
  border-radius: var(--radius-card);
  border: 1px solid var(--card-border) !important;
  box-shadow: var(--card-shadow);
}

.mobile-log-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mobile-log-card {
  border: 1px solid var(--card-border);
  border-radius: 10px;
  padding: 12px;
  background: var(--card-bg);
}

.mobile-log-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-weight: 600;
}

.line {
  font-size: 13px;
  color: #475569;
  margin-bottom: 6px;
}

.line span {
  color: #64748b;
  margin-right: 6px;
}

@media (max-width: 768px) {
  .log-page {
    padding: 16px;
  }

  .filter-input {
    width: 100%;
  }
}
</style>
