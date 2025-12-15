import { ref, computed } from 'vue'
import type { User } from '@/entity/User'
import { userService } from '@/services/userService'

// Global user state
const currentUser = ref<User | null>(null)
const isLoading = ref(false)

export function useUserStore() {
    const strip = (v: any): any => {
        if (v == null) return ''
        if (typeof v !== 'string') return v
        const trimmed = v.replace(/^["']+|["']+$/g, '')
        try {
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) return JSON.parse(trimmed)
        } catch {}
        return trimmed
    }
    // Load user info from cache or API
    const loadUserInfo = async () => {
        const token = localStorage.getItem('token')

        // Only load user info if token exists
        if (!token) {
            console.log('[UserStore] No token found, clearing user data')
            currentUser.value = null
            return
        }

        // Try to get cached user info first (only if token exists)
        const cachedUser = userService.getCachedUserInfo()
        if (cachedUser) {
            console.log('[UserStore] Loaded user from cache:', cachedUser.studentNo)
            currentUser.value = cachedUser
            return
        }

        // If no cached info, fetch from API
        isLoading.value = true
        try {
            console.log('[UserStore] Fetching user info from API')
            currentUser.value = await userService.getUserInfo()
            console.log('[UserStore] User info loaded from API:', currentUser.value?.studentNo)
        } catch (error) {
            console.error('[UserStore] Failed to load user info:', error)
            // Clear invalid token and user data
            localStorage.removeItem('token')
            localStorage.removeItem('userInfo')
            currentUser.value = null
        } finally {
            isLoading.value = false
        }
    }

    // Set user info (called after login)
    const setUser = (user: User) => {
        currentUser.value = user
    }

    // Clear user info (called on logout)
    const clearUser = () => {
        userService.logout() // Clear localStorage
        currentUser.value = null
    }

    // Computed properties
    const isLoggedIn = computed(() => !!currentUser.value)
    const studentNo = computed(() => strip(currentUser.value?.studentNo || ''))
    const username = computed(() => strip(currentUser.value?.username || ''))
    const role = computed(() => strip(currentUser.value?.role || 'user') as User['role'])

    return {
        // State
        currentUser,
        isLoading,

        // Computed
        isLoggedIn,
        studentNo,
        username,
        role,

        // Actions
        loadUserInfo,
        setUser,
        clearUser
    }
}
