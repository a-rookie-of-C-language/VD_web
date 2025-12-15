<script setup lang="ts">
import {onMounted} from 'vue'
import {useRouter} from 'vue-router'
import {userService} from './services/userService'
import {useUserStore} from './stores/useUserStore'
import {ElMessage} from "element-plus";

const router = useRouter()
const userStore = useUserStore()

onMounted(async () => {
  const token = localStorage.getItem('token')

  console.log('[App] Mounted, token exists:', !!token)

  if (token) {
    // Verify token validity
    const verifyResult = await userService.verifyToken()
    console.log('[App] Token verification result:', verifyResult)

    if (verifyResult === "Pass") {
      // Token is valid, load user info if not already loaded
      if (!userStore.currentUser) {
         try {
           await userStore.loadUserInfo()
           console.log('[App] User info loaded:', userStore.currentUser)
         } catch (e) {
           console.error("[App] Failed to load user info", e)
         }
      }
    } else {
      // Token is invalid or expired
      console.warn('[App] Token invalid, clearing auth data')
      ElMessage.error('登录已过期，请重新登录')
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
      userStore.clearUser()

      // Only redirect if not already on login page
      if (router.currentRoute.value.path !== '/login') {
        await router.push('/login')
      }
    }
  }
  // If no token, let the router guard handle the redirect
})
</script>

<template>
  <router-view/>
</template>

<style scoped>

</style>
