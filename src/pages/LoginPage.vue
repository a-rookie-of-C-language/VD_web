<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import router from "@/router"
import { userService } from '@/services/userService'
import logoImage from '@/image/logo.png'

const studentId = ref('')
const password = ref('')
const rememberPassword = ref(false)
const loading = ref(false)

async function handleLogin() {
  loading.value = true
  try {
    await userService.login(studentId.value, password.value)
    ElMessage.success('登录成功!')
    await router.push('/app/activities')
  } catch (e: any) {
    console.error(e)
    ElMessage.error(e.message || '登录失败,请检查您的凭据')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-left">
      <div class="brand-block">
        <div class="brand-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity="0.9"/>
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <span class="brand-name">志愿活动管理系统</span>
      </div>
      <div class="hero-copy">
        <h2 class="hero-title">管理志愿活动<br/>记录每一份奉献</h2>
        <p class="hero-desc">活动发布 · 报名管理 · 时长统计 · 数据可视化</p>
      </div>
      <div class="left-decoration">
        <div class="deco-circle deco-1" />
        <div class="deco-circle deco-2" />
        <div class="deco-circle deco-3" />
      </div>
    </div>

    <div class="login-right">
      <div class="login-card">
        <div class="card-logo-row">
          <img :src="logoImage" alt="Logo" class="card-logo" />
        </div>

        <div class="card-header">
          <h1 class="card-title">欢迎登录</h1>
          <p class="card-hint">请输入您的学号和密码</p>
        </div>

        <el-form class="login-form" @submit.prevent="handleLogin">
          <el-form-item>
            <el-input
              v-model="studentId"
              placeholder="学号"
              prefix-icon="User"
              size="large"
              class="form-input"
            />
          </el-form-item>

          <el-form-item>
            <el-input
              v-model="password"
              type="password"
              placeholder="密码"
              prefix-icon="Lock"
              show-password
              size="large"
              class="form-input"
              @keyup.enter="handleLogin"
            />
          </el-form-item>

          <div class="options-row">
            <el-checkbox v-model="rememberPassword">记住密码</el-checkbox>
          </div>

          <el-button
            type="primary"
            :loading="loading"
            class="submit-btn"
            @click="handleLogin"
            size="large"
          >
            {{ loading ? '登录中...' : '登 录' }}
          </el-button>
        </el-form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  width: 100%;
  display: flex;
  overflow: hidden;
}

.login-left {
  flex: 1;
  background: linear-gradient(145deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 40px 48px;
  position: relative;
  overflow: hidden;
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 2;
  position: relative;
}

.brand-icon {
  width: 46px;
  height: 46px;
  background: linear-gradient(135deg, #6366f1, #4338ca);
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 8px 24px rgba(99,102,241,0.45);
}

.brand-name {
  font-size: 16px;
  font-weight: 700;
  color: #e2e8f0;
  letter-spacing: 0.02em;
}

.hero-copy {
  z-index: 2;
  position: relative;
}

.hero-title {
  font-size: 38px;
  font-weight: 800;
  color: #f8fafc;
  line-height: 1.25;
  margin: 0 0 16px 0;
  letter-spacing: -0.02em;
}

.hero-desc {
  font-size: 15px;
  color: #94a3b8;
  margin: 0;
  letter-spacing: 0.05em;
}

.left-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.deco-circle {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(99,102,241,0.15);
}

.deco-1 {
  width: 380px;
  height: 380px;
  top: -80px;
  right: -100px;
  background: radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%);
}

.deco-2 {
  width: 240px;
  height: 240px;
  bottom: 60px;
  right: 40px;
  background: radial-gradient(circle, rgba(79,70,229,0.06) 0%, transparent 70%);
}

.deco-3 {
  width: 120px;
  height: 120px;
  top: 40%;
  left: -20px;
  background: radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%);
}

.login-right {
  width: 420px;
  flex-shrink: 0;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 32px;
}

.login-card {
  width: 100%;
  max-width: 360px;
  background: white;
  border-radius: 20px;
  padding: 36px 32px;
  box-shadow: 0 4px 32px rgba(15,23,42,0.1), 0 1px 4px rgba(15,23,42,0.06);
  border: 1px solid rgba(226,232,240,0.8);
}

.card-logo-row {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.card-logo {
  width: 60px;
  height: auto;
  object-fit: contain;
}

.card-header {
  text-align: center;
  margin-bottom: 28px;
}

.card-title {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 6px 0;
  letter-spacing: -0.02em;
}

.card-hint {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-input :deep(.el-input__wrapper) {
  border-radius: 10px;
  box-shadow: 0 0 0 1px #e2e8f0 inset;
}

.form-input :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #a5b4fc inset;
}

.form-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgba(99,102,241,0.25) inset, 0 0 0 1px #6366f1 inset;
}

.options-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 4px 0 16px;
}

.submit-btn {
  width: 100%;
  height: 46px;
  border-radius: 11px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.08em;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  border: none;
  box-shadow: 0 4px 14px rgba(99,102,241,0.4);
  transition: all 0.2s ease;
}

.submit-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(99,102,241,0.5);
}

.submit-btn:active {
  transform: translateY(0);
}

@media (max-width: 768px) {
  .login-page {
    flex-direction: column;
  }

  .login-left {
    padding: 28px 24px 32px;
    flex: none;
    min-height: 220px;
  }

  .hero-title {
    font-size: 26px;
  }

  .login-right {
    width: 100%;
    flex: 1;
    padding: 28px 20px;
  }
}
</style>
