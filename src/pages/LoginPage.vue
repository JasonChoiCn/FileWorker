<script setup lang="ts">
import { ref } from 'vue';
import Cookies from 'js-cookie'
import { toast } from '@/utils/toast';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

const router = useRouter();
const { t: $t } = useI18n();

const password = ref('');
const onSubmitBtnClick = () => {
    Cookies.set('PASSWORD', password.value);
    toast($t("login.setting_success"), 'success');
    setTimeout(() => {
        if (window.history.state.back) {
            router.back();
        } else {
            router.replace({ path: '/' })
        }
    }, 1000);
}

const onEnter = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
        onSubmitBtnClick();
    }
}
</script>

<template>
    <div class="login-wrap">
        <div class="card login-card">
            <span class="login-icon"><span class="i-mdi-lock-outline"></span></span>
            <h1 class="login-title">{{ $t("login.login_title") }}</h1>
            <input class="text-input login-input" type="password" v-model="password" @keydown="onEnter"
                :placeholder="$t('login.password_placeholder')" autofocus />
            <button class="btn btn-primary login-btn" @click="onSubmitBtnClick">{{ $t("login.login_button") }}</button>
        </div>
    </div>
</template>

<style scoped>
.login-wrap {
    display: flex;
    justify-content: center;
    padding-top: 8vh;
}

.login-card {
    width: 100%;
    max-width: 380px;
    padding: 40px 32px 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
}

.login-icon {
    width: 64px;
    height: 64px;
    border-radius: 20px;
    background: linear-gradient(135deg, var(--brand), #8b5cf6);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    box-shadow: 0 10px 24px -8px rgba(99, 102, 241, 0.7);
    margin-bottom: 4px;
}

.login-title {
    font-size: 19px;
    font-weight: 800;
    margin: 0 0 6px;
}

.login-input {
    width: 100%;
    box-sizing: border-box;
    padding: 12px 16px;
    font-size: 15px;
}

.login-btn {
    width: 100%;
    padding: 12px;
    font-size: 15px;
}
</style>
