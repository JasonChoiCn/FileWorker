<script setup lang="ts">
import { onBeforeMount, ref, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatBytes } from '@/utils/utils';
import { toast } from '@/utils/toast';
import { DeleteFile, ListFiles } from '@/api';
import type { _Object } from '@aws-sdk/client-s3';

const { t: $t } = useI18n();

let uploadedFiles: Ref<_Object[]> = ref([]);

const encodeName = encodeURIComponent;

// S3 list results come back as JSON, so LastModified is an ISO string at
// runtime (not a Date) — parse defensively.
const toTime = (v?: Date | string): number => {
    if (!v) return 0;
    const t = new Date(v).getTime();
    return Number.isNaN(t) ? 0 : t;
};

const refreshFiles = async () => {
    try {
        const res = await ListFiles();
        if (res.Contents) {
            // Newest uploads first (S3 lists keys alphabetically, not by time).
            uploadedFiles.value = [...res.Contents].sort(
                (a, b) => toTime(b.LastModified) - toTime(a.LastModified)
            );
        }
    } catch (error) {
        console.error(error);
        toast($t("toast.list_failed"), 'error');
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
    <div class="flex flex-col items-center mt-5">
        <h1 class="text-lg">{{ $t("page_title.filemanage") }}</h1>
        <div class="px-4 py-4 max-w-screen-md w-4/5">
            <div v-for="file in uploadedFiles" :key="file.Key"
                class="w-full flex flex-row items-center mt-4 rounded border-1 border-gray-300 px-2 py-1">
                <div class="w-10 h-10 i-mdi-file-document-outline"></div>
                <div class="flex flex-col">
                    <a class="text-lg font-semibold" :href="'/' + encodeName(file.Key ?? '')" target="_blank">{{ file.Key }}</a>
                    <div class="text-sm text-gray">{{ formatBytes(file.Size ?? 0) }}</div>
                </div>
                <div class="ml-auto w-6 h-6 i-mdi-trash-can-outline cursor-pointer"
                    @click="onDeleteFileClick(file.Key)"></div>
            </div>
        </div>
    </div>
</template>

<style>
html,
body,
#app {
    margin: 0;
    padding: 0;
    background-color: #f8f9fa;
}
</style>
