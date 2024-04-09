import { createRouter, createWebHistory } from 'vue-router';
import store from '@/store';
import WebLogin from "@/components/auth/WebLogin.vue";
import HomePage from "@/components/HomePage.vue";
import DashBoard from "@/components/dash/DashBoard.vue";

const routes = [
    { path: '/', component: HomePage, meta: { requiresAuth: true } },
    { path: '/login', component: WebLogin, meta: { requiresAuth: false } },
    //{ path: '/signup', component: Signup, meta: { requiresAuth: false } },
    { path: '/dashboard', component: DashBoard, meta: { requiresAuth: true } },
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

router.beforeEach(async (to, from, next) => {
    await store.dispatch('checkAuthorization');

    const isAuthenticated = store.state.auth.isAuthenticated;

    if (to.meta.requiresAuth && !isAuthenticated) {
        next('/login');
    } else if ((to.path === '/login' || to.path === '/signup') && isAuthenticated) {
        next('/dashboard');
    } else {
        next();
    }
});

export default router;