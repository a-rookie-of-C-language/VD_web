<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import router from "@/router"
import { userService } from '@/services/userService'

const studentId = ref('12323020406')
const password = ref('arookieofc')
const rememberPassword = ref(false)
const loading = ref(false)

async function handleLogin() {
  loading.value = true
  try {
    await userService.login(studentId.value, password.value)
    ElMessage.success('登录成功!')
    await router.push('/activities')
  } catch (e: any) {
    console.error(e)
    ElMessage.error(e.message || '登录失败,请检查您的凭据')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <div class="login-content">
      <div class="logo-container">
        <img src="../image/logo.png" alt="Logo" class="logo" />
      </div>
      <div class="login-card">
        <h1 class="title">Welcome Login</h1>

        <el-form class="login-form">
          <el-form-item>
            <el-input
                v-model="studentId"
                placeholder="Student ID"
                prefix-icon="User"
                size="large"
            />
          </el-form-item>

          <el-form-item>
            <el-input
                v-model="password"
                type="password"
                placeholder="Password"
                prefix-icon="Lock"
                show-password
                size="large"
            />
          </el-form-item>

          <div class="options-row">
            <el-checkbox v-model="rememberPassword">Remember Password</el-checkbox>
          </div>

          <el-button
              type="primary"
              :loading="loading"
              class="submit-btn"
              @click="handleLogin"
              size="large"
          >
            Login
          </el-button>
        </el-form>

        <div class="footer-image-container">
          <img src="../image/footer-icon.jpg" class="footer-image" alt="Footer" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  width: 100%;
  background-image: url('../image/login-bg.png');
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Microsoft YaHei', sans-serif;
}

.login-content {
  position: relative;
  width: 100%;
  height: 100vh;
}

.logo-container {
  position: absolute;
  top: 40px;
  left: 40px;
}

.logo {
  width: 107px;
  height: 103px;
  object-fit: contain;
}

.login-card {
  position: absolute;
  top: 50%;
  right: 5%;
  transform: translateY(-50%);
  width: 380px; /* Slightly wider for Element Plus padding */
  padding: 30px;
  background: rgba(255, 255, 255, 0.9); /* Add background to make it readable if needed, or keep transparent if design dictates */
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.title {
  font-size: 28px;
  font-weight: 500;
  color: #1d2129;
  text-align: center;
  margin-bottom: 20px;
  font-family: 'HarmonyOSSansSC-Medium', sans-serif;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.options-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.submit-btn {
  width: 100%;
  font-size: 16px;
}

.footer-image-container {
  margin-top: 20px;
  text-align: center;
}

.footer-image {
  width: 40px;
  height: 41px;
  border-radius: 2px;
}

@media (max-width: 768px) {
  .login-container {
    background-image: url('../image/login-bg.png'); /* Keep or change if needed */
    align-items: flex-start; /* Allow scroll if height exceeds viewport */
    padding: 20px;
  }

  .login-content {
    height: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .logo-container {
    position: static;
    margin-bottom: 30px;
    margin-top: 20px;
    text-align: center;
  }

  .logo {
    width: 80px;
    height: auto;
  }

  .login-card {
    position: static;
    transform: none;
    width: 100%;
    max-width: 380px;
    margin: 0 auto;
  }
}
</style>
