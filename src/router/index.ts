import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import LoginPage from '../pages/LoginPage.vue'
import AllActivities from '../pages/AllActivities.vue'
import MainLayout from '../layouts/MainLayout.vue'

const routes: Array<RouteRecordRaw> = [
    {
        path: '/login',
        name: 'Login',
        component: LoginPage
    },
    {
        path: '/',
        component: MainLayout,
        meta: { requiresAuth: true },
        children: [
            {
                path: '',
                redirect: '/activities'
            },
            {
                path: 'activities',
                name: 'AllActivities',
                component: AllActivities
            },
            {
                path: 'add-activity',
                name: 'AddActivity',
                component: () => import('../pages/AddActivity.vue')
            },
            {
                path: 'import-activity',
                name: 'ImportActivity',
                component: () => import('../pages/ImportActivity.vue')
            },
            {
                path: 'my-projects',
                name: 'MyProjects',
                component: () => import('../pages/MyProjects.vue')
            },
            {
                path: 'my-stats',
                name: 'MyStats',
                component: () => import('../pages/MyStats.vue')
            },
            {
                path: 'request-hours',
                name: 'RequestHours',
                component: () => import('../pages/RequestHours.vue')
            },
            {
                path: 'admin-review',
                name: 'AdminReview',
                component: () => import('../pages/AdminReview.vue')
            },
            {
                path: 'system-monitor',
                name: 'SystemMonitor',
                component: () => import('../pages/SystemMonitor.vue')
            },
            {
                path: 'activity/:id',
                name: 'ActivityDetail',
                component: () => import('../pages/detail.vue')
            }
        ]
    }
]

const router = createRouter({
    history: createWebHashHistory(),
    routes
})

router.beforeEach(async (to, from, next) => {
    const userInfoStr = localStorage.getItem('userInfo')
    const token = localStorage.getItem('token')

    // Basic check: both token and userInfo must exist
    let isAuthenticated = !!(userInfoStr && token)

    // Check if any matched route requires authentication (including parent routes)
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
    const requiresSuperAdmin = to.matched.some(record => record.meta.requiresSuperAdmin)

    console.log('[Router Guard]', {
        to: to.path,
        from: from.path,
        isAuthenticated,
        requiresAuth,
        requiresSuperAdmin,
        token: token ? 'exists' : 'missing',
        userInfo: userInfoStr ? 'exists' : 'missing'
    })

    // If route requires auth and we have token, verify token validity
    if (requiresAuth && token) {
        try {
            const { userService } = await import('@/services/userService')
            const verifyResult = await userService.verifyToken()
            if (verifyResult !== "Pass") {
                console.log('[Router Guard] Token invalid, clearing auth data')
                localStorage.removeItem('token')
                localStorage.removeItem('userInfo')
                isAuthenticated = false
            }
        } catch (error) {
            console.error('[Router Guard] Token verification failed:', error)
            localStorage.removeItem('token')
            localStorage.removeItem('userInfo')
            isAuthenticated = false
        }
    }

    // If going to login page and already authenticated, redirect to activities
    if (to.path === '/login') {
        if (isAuthenticated) {
            console.log('[Router Guard] Already logged in, redirecting to /activities')
            next('/activities')
            return
        }
        console.log('[Router Guard] Going to login page')
        next()
        return
    }

    // Check if route requires authentication
    if (requiresAuth && !isAuthenticated) {
        console.log('[Router Guard] Auth required but not authenticated, redirecting to /login')
        next('/login')
        return
    }

    // Check if route requires super admin
    if (requiresSuperAdmin) {
        if (!isAuthenticated) {
            console.log('[Router Guard] Super admin required but not authenticated, redirecting to /login')
            next('/login')
            return
        }
        try {
            const user = JSON.parse(userInfoStr!)
            if (user.role !== 'superAdmin') {
                console.log('[Router Guard] Super admin required but user is not super admin')
                next('/') // Or some 403 page
                return
            }
        } catch (error) {
            console.error('[Router Guard] Failed to parse user info:', error)
            next('/login')
            return
        }
    }

    console.log('[Router Guard] Allowing navigation to', to.path)
    next()
})

export default router
