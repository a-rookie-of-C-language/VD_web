import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
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
    history: createWebHistory(),
    routes
})

router.beforeEach((to, _, next) => {
    const userInfoStr = localStorage.getItem('userInfo')
    if (to.meta.requiresSuperAdmin) {
        if (!userInfoStr) {
            next('/login')
            return
        }
        try {
            const user = JSON.parse(userInfoStr)
            if (user.role !== 'superAdmin') {
                next('/') // Or some 403 page
                return
            }
        } catch {
            next('/login')
            return
        }
    }
    next()
})

export default router
