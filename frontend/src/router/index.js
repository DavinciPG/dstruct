import { createRouter, createWebHistory } from 'vue-router';
import store from '@/store';
import WebLogin from "@/components/auth/WebLogin.vue";
import DashBoard from "@/components/dash/DashBoard.vue";
import StudentsView from "@/components/dash/StudentsView.vue";
import ProfileView from "@/components/dash/ProfileView.vue";

const routes = [
    { path: '/students', component: StudentsView, meta: { requiresAuth: true, teacherOnly: true } },
    { path: '/profile', component: ProfileView, meta: { requiresAuth: true } },
    { path: '/login', component: WebLogin, meta: { requiresAuth: false } },
    { path: '/dashboard', component: DashBoard, meta: { requiresAuth: true } },
    { path: '/logout', meta: { requiresAuth: true }, }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

router.beforeEach(async (to, from, next) => {
    await store.dispatch('checkAuthorization');

    const isAuthenticated = store.state.auth.isAuthenticated;
    const user = store.state.auth.user;

    if (to.meta.requiresAuth && !isAuthenticated) {
        next('/login');
    } else if ((to.path === '/login' || to.path === '/signup') && isAuthenticated) {
        next('/dashboard');
    } else if(((to.path === '/dashboard' || to.path === '/students' || to.path === '/profile') && !user?.can_access) || to.path === '/logout' && isAuthenticated) {
        await store.dispatch('unAuthorize');
        next('/login');
    } else if(to.path === '/') { // ghetto fix
        next('/dashboard');
    } else if(to.meta.teacherOnly && user?.rank === 0) {
        next('/dashboard');
    } else {
        next();
    }
});

export default router;