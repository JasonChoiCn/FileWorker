<script setup lang="ts">
import { onBeforeMount, ref, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatBytes, formatDate } from '@/utils/utils';
import { toast } from '@/utils/toast';
import { DeleteFile, ListFiles } from '@/api';
import type { _Object } from '@aws-sdk/client-s3';

const { t: $t } = useI18n();

let uploadedFiles: Ref<_Object[]> = ref([]);
let loading = ref(true);

const encodeName = encodeURIComponent;

// S3 list results come back as JSON, so LastModified is an ISO string at
// runtime (not a Date) — parse defensively.
const toTime = (v?: Date | string): number => {
    if (!v) return 0;
    const t = new Date(v).getTime();
    return Number.isNaN(t) ? 0 : t;
};

const refreshFiles = async () => {
    loading.value = true;
    try {
        const res = await ListFiles();
        if (res.Contents) {
            // Newest uploads first (S3 lists keys alphabetically, not by time).
            uploadedFiles.value = [...res.Contents].sort(
                (a, b) => toTime(b.LastModified) - toTime(a.LastModified)
            );
        } else {
            uploadedFiles.value = [];
        }
    } catch (error) {
        console.error(error);
        toast($t("toast.list_failed"), 'error');
    } finally {
        loading.value = false;
    }
};

onBeforeMount(async () => {
    await refreshFiles();
});

const onDeleteFileClick = async (key?: string) => {
    if (!key) {
        return;
    }
    try {
        await DeleteFile(key);
    } catch (error) {
        console.error(error);
        toast($t("toast.delete_failed"), 'error');
        return;
    }
    await refreshFiles();
};
</script>

<template>
    <div>
        <div class="page-head">
            <div>
                <div class="page-title">{{ $t("page_title.filemanage") }}</div>
                <div class="page-sub">{{ $t("filemanage.count", { count: uploadedFiles.length }) }}</div>
            </div>
            <button class="btn btn-ghost" @click="refreshFiles">
                <span class="i-mdi-refresh" :class="{ 'spinning': loading }"></span>{{ $t("common.refresh") }}
            </button>
        </div>

        <div v-if="!loading && uploadedFiles.length === 0" class="card empty-state">
            <span class="empty-icon"><span class="i-mdi-folder-open-outline"></span></span>
            <div class="empty-text">{{ $t("filemanage.empty") }}</div>
        </div>

        <div class="file-list">
            <div v-for="file in uploadedFiles" :key="file.Key" class="card file-row">
                <div class="file-ic"><span class="i-mdi-file-document-outline"></span></div>
                <div class="file-meta">
                    <a class="file-name" :href="'/' + encodeName(file.Key ?? '')" target="_blank">{{ file.Key }}</a>
                    <div class="file-sub">{{ formatBytes(file.Size ?? 0) }} · {{ formatDate(file.LastModified) }}</div>
                </div>
                <a class="icon-btn" :href="'/' + encodeName(file.Key ?? '')" target="_blank" title="open">
                    <span class="i-mdi-open-in-new"></span>
                </a>
                <button class="icon-btn danger" @click="onDeleteFileClick(file.Key)">
                    <span class="i-mdi-trash-can-outline"></span>
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.spinning {
    animation: fw-spin 1s linear infinite;
}

.file-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.file-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    transition: transform 0.12s ease, box-shadow 0.15s ease;
}

.file-row:hover {
    transform: translateY(-1px);
}

.file-meta {
    flex: 1;
    min-width: 0;
}

.file-name {
    display: block;
    font-weight: 700;
    font-size: 14.5px;
    color: var(--ink);
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.file-name:hover {
    color: var(--brand-dark);
    text-decoration: underline;
}

.file-sub {
    margin-top: 4px;
    font-size: 12.5px;
    color: var(--ink-soft);
}

.icon-btn {
    flex: none;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    border: none;
    background: #f1f2f7;
    color: var(--ink-soft);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 19px;
    cursor: pointer;
    text-decoration: none;
    transition: background 0.15s ease, color 0.15s ease;
}

.icon-btn:hover {
    background: var(--brand-soft);
    color: var(--brand-dark);
}

.icon-btn.danger:hover {
    background: var(--danger-soft);
    color: var(--danger-dark);
}

.empty-state {
    padding: 56px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    text-align: center;
}

.empty-icon {
    width: 72px;
    height: 72px;
    border-radius: 22px;
    background: #f1f2f7;
    color: var(--ink-faint);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 38px;
}

.empty-text {
    color: var(--ink-soft);
    font-size: 14.5px;
}
</style>
