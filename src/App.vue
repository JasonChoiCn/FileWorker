<script setup lang="ts">
</script>

<template>
  <header class="fw-nav">
    <div class="fw-nav-inner">
      <router-link to="/" class="fw-brand">
        <span class="fw-brand-icon"><span class="i-mdi-cloud-upload-outline"></span></span>
        <span>FileWorker</span>
      </router-link>
      <nav class="fw-links">
        <router-link to="/file">{{ $t("page_title.file") }}</router-link>
        <router-link to="/clip">{{ $t("page_title.clip") }}</router-link>
        <router-link to="/filemanage">{{ $t("page_title.filemanage") }}</router-link>
      </nav>
    </div>
  </header>
  <main class="page">
    <router-view v-slot="{ Component }">
      <component :is="Component" />
    </router-view>
  </main>
</template>

<style scoped></style>
