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
  if (token) {
    const s = await userService.verifyToken()
    if (s === "Pass") {
      if (!userStore.currentUser) {
         try {
           await userStore.loadUserInfo()
         } catch (e) {
           console.error("Failed to load user info", e)
         }
      }

      if (router.currentRoute.value.path === '/login') {
        await router.push('/activities')
      }
    } else {
      // Token invalid
      ElMessage.error(s)
      localStorage.removeItem('token')
      userStore.clearUser()
      if (router.currentRoute.value.path !== '/login') {
        await router.push('/login')
      }
    }
  } else {
    if (router.currentRoute.value.meta.requiresAuth && router.currentRoute.value.path !== '/login') {
       await router.push('/login')
    }
  }
})
</script>

<template>
  <router-view/>
</template>

<style scoped>

</style>
