import { createRouter, createWebHashHistory } from "vue-router";
import Cookies from 'js-cookie'
import i18n from "./i18n";
import { loginWithToken } from "./api/auth";

import IndexPage from "./pages/IndexPage.vue";
import ClipPage from "./pages/ClipPage.vue";
import FilePage from "./pages/FilePage.vue";
import LoginPage from "./pages/LoginPage.vue";
import FileManagePage from "./pages/FileManagePage.vue";

const $t = i18n.global.t;

const routes = [
    {
        path: "/",
        name: "index",
        meta: {
            title: $t("page_title.index"),
        },
        component: IndexPage,
    },
    {
        path: "/clip",
        name: "clip",
        meta: {
            title: $t("page_title.clip"),
        },
        component: ClipPage,
    },
    {
        path: "/file",
        name: "file",
        meta: {
            title: $t("page_title.file"),
        },
        component: FilePage,
    },
    {
        path: "/filemanage",
        name: "filemanage",
        meta: {
            title: $t("page_title.filemanage"),
        },
        component: FileManagePage,
    },
    {
        path: "/login",
        name: "login",
        meta: {
            title: $t("page_title.login"),
        },
        component: LoginPage,
    },
];

const router = createRouter({
    history: createWebHashHistory(),
    routes,
});

router.beforeEach(async (to, from, next) => {
    if (to.meta.title) {
        document.title = to.meta.title as string;
    }
    // Password-free login: ?token=..&expire=.. in the URL.
    // Redeem it once, then strip it from the address bar.
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const expire = params.get('expire');
    if (token && expire && !Cookies.get('PASSWORD')) {
        try {
            await loginWithToken(token, expire);
        } catch (e) {
            console.error(e);
        }
    }
    if (params.has('token') || params.has('expire')) {
        params.delete('token');
        params.delete('expire');
        const q = params.toString();
        window.history.replaceState(null, '', window.location.pathname + (q ? `?${q}` : '') + window.location.hash);
    }
    const PASSWORD = Cookies.get('PASSWORD');
    if (!PASSWORD && to.path !== '/login') {
        next({
            path: '/login',
        })
    } else {
        next()
    }
})

export default router;
export { routes };