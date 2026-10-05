<script setup lang="ts">
import { useI18n } from "vue-i18n";
import useI18nStore from "../store/i18n";
import { useRouter } from "vue-router";

const router = useRouter();

const i18nStore = useI18nStore();
let updateLocale = (locale: string) => {
  i18nStore.setLocale(locale);
};

const { locale } = useI18n();
if (i18nStore.locale !== "") {
  locale.value = i18nStore.locale;
}
</script>

<template>
  <div class="home">
    <div class="home-hero">
      <div class="page-title">FileWorker</div>
      <div class="page-sub">{{ $t("index.tips_content") }}</div>
    </div>
    <div class="home-grid">
      <div class="card home-card" @click="router.push('/file')">
        <div class="home-icon icon-file"><span class="i-mdi-file-upload-outline"></span></div>
        <div class="home-title">{{ $t("index.file_channel_title") }}</div>
        <div class="home-desc">{{ $t("index.file_channel_desc") }}</div>
        <div class="home-go"><span class="i-mdi-arrow-right"></span></div>
      </div>
      <div class="card home-card" @click="router.push('/clip')">
        <div class="home-icon icon-clip"><span class="i-mdi-clipboard-text-outline"></span></div>
        <div class="home-title">{{ $t("index.clip_channel_title") }}</div>
        <div class="home-desc">{{ $t("index.clip_channel_desc") }}</div>
        <div class="home-go"><span class="i-mdi-arrow-right"></span></div>
      </div>
    </div>
    <div class="home-footer">
      <select v-model="$i18n.locale" class="select" @change="updateLocale($i18n.locale)">
        <option v-for="locale in $i18n.availableLocales" :key="`locale-${locale}`" :value="locale">{{ locale }}</option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.home-hero {
  margin: 10px 2px 22px;
}

.home-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

@media (max-width: 560px) {
  .home-grid {
    grid-template-columns: 1fr;
  }
}

.home-card {
  padding: 28px 24px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}

.home-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 2px 4px rgba(16, 24, 40, 0.06), 0 18px 36px -14px rgba(16, 24, 40, 0.28);
}

.home-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  margin-bottom: 16px;
}

.icon-file {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  box-shadow: 0 8px 18px -6px rgba(99, 102, 241, 0.65);
}

.icon-clip {
  background: linear-gradient(135deg, #f472b6, #fb7185);
  color: #fff;
  box-shadow: 0 8px 18px -6px rgba(244, 114, 182, 0.6);
}

.home-title {
  font-size: 19px;
  font-weight: 800;
  margin-bottom: 6px;
}

.home-desc {
  font-size: 13.5px;
  color: var(--ink-soft);
  line-height: 1.6;
  padding-right: 28px;
}

.home-go {
  position: absolute;
  right: 20px;
  bottom: 22px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #f1f2f7;
  color: var(--ink-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: background 0.15s ease, color 0.15s ease;
}

.home-card:hover .home-go {
  background: var(--brand);
  color: #fff;
}

.home-footer {
  margin-top: 26px;
  display: flex;
  justify-content: center;
}
</style>
