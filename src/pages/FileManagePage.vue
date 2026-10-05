<script setup lang="ts">
import { onBeforeMount, ref, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatBytes, formatDate } from '@/utils/utils';
import { toast } from '@/utils/toast';
import { DeleteFile, ListFiles, GetFileVisibility, PatchFile, requestLoginToken, buildLoginLink } from '@/api';
import type { _Object } from '@aws-sdk/client-s3';

const { t: $t } = useI18n();

let uploadedFiles: Ref<_Object[]> = ref([]);
let loading = ref(true);
let toggling = ref(false);
let visMap: Ref<Record<string, string>> = ref({});

const visOf = (key?: string): string => (key ? (visMap.value[key] ?? '') : '');

// Password-free login link modal
let showTokenModal = ref(false);
let tokenLink = ref('');
let generatingToken = ref(false);

const openTokenModal = async () => {
    showTokenModal.value = true;
    if (tokenLink.value || generatingToken.value) {
        return;
    }
    generatingToken.value = true;
    try {
        const { token, expire } = await requestLoginToken();
        tokenLink.value = buildLoginLink(token, expire);
    } catch (error) {
        console.error(error);
        toast($t("login.generate_failed"), 'error');
        showTokenModal.value = false;
    } finally {
        generatingToken.value = false;
    }
};

const copyTokenLink = async () => {
    const text = tokenLink.value;
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        // Fallback for older browsers / non-secure contexts
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }
    toast($t("login.copied"), 'success');
};

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
        await loadVisibilities();
    } catch (error) {
        console.error(error);
        toast($t("toast.list_failed"), 'error');
    } finally {
        loading.value = false;
    }
};

// Visibility isn't part of the list output — fetch it per file in parallel.
const loadVisibilities = async () => {
    const entries = await Promise.all(
        uploadedFiles.value.map(async (f) => {
            const key = f.Key ?? '';
            if (!key) return null;
            try {
                return [key, await GetFileVisibility(key)] as const;
            } catch (e) {
                console.error(e);
                return [key, ''] as const;
            }
        })
    );
    const map: Record<string, string> = {};
    for (const e of entries) {
        if (e) map[e[0]] = e[1];
    }
    visMap.value = map;
};

const toggleVisibility = async (key?: string) => {
    if (!key || toggling.value) return;
    const nextVis = visOf(key) === 'private' ? 'public' : 'private';
    toggling.value = true;
    try {
        await PatchFile(key, nextVis);
        visMap.value[key] = nextVis;
        toast($t("toast.visibility_updated", { v: nextVis === 'private' ? $t('common.private') : $t('common.public') }), 'success');
    } catch (error: any) {
        console.error(error);
        const status = error?.response?.status ? `HTTP ${error.response.status}` : 'network';
        const body = typeof error?.response?.data === 'string' ? error.response.data.slice(0, 160) : '';
        toast($t("toast.visibility_failed", { code: body ? `${status} ${body}` : status }), 'error');
    } finally {
        toggling.value = false;
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
            <div class="head-actions">
                <button class="btn btn-ghost" @click="openTokenModal">
                    <span class="i-mdi-link-variant"></span>{{ $t("login.token_link") }}
                </button>
                <button class="btn btn-ghost" @click="refreshFiles">
                    <span class="i-mdi-refresh" :class="{ 'spinning': loading }"></span>{{ $t("common.refresh") }}
                </button>
            </div>
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
                <button class="vis-pill" :class="visOf(file.Key) === 'private' ? 'vis-private' : 'vis-public'"
                    @click="toggleVisibility(file.Key)" :disabled="toggling"
                    :title="$t('filemanage.toggle_visibility_hint')">
                    <span v-if="!visOf(file.Key)" class="spinner spinner-sm"></span>
                    <template v-else>
                        <span :class="visOf(file.Key) === 'private' ? 'i-mdi-lock-outline' : 'i-mdi-earth'"></span>
                        {{ visOf(file.Key) === 'private' ? $t('common.private') : $t('common.public') }}
                    </template>
                </button>
                <a class="icon-btn" :href="'/' + encodeName(file.Key ?? '')" target="_blank" title="open">
                    <span class="i-mdi-open-in-new"></span>
                </a>
                <button class="icon-btn danger" @click="onDeleteFileClick(file.Key)">
                    <span class="i-mdi-trash-can-outline"></span>
                </button>
            </div>
        </div>

        <div v-if="showTokenModal" class="modal-overlay" @click.self="showTokenModal = false">
            <div class="card modal">
                <div class="modal-title">{{ $t("login.token_title") }}</div>
                <div class="modal-desc">{{ $t("login.token_desc") }}</div>
                <div v-if="generatingToken" class="modal-loading"><span class="spinner"></span></div>
                <div v-else class="token-row">
                    <input class="text-input monospace token-input" readonly :value="tokenLink"
                        @focus="($event.target as HTMLInputElement).select()" />
                    <button class="btn btn-primary" @click="copyTokenLink">
                        <span class="i-mdi-content-copy"></span>{{ $t("login.copy") }}
                    </button>
                </div>
                <button class="btn btn-ghost modal-close" @click="showTokenModal = false">{{ $t("common.close") }}</button>
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

.vis-pill {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    font-weight: 700;
    border-radius: 999px;
    padding: 8px 14px;
    border: 1px solid transparent;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s ease, color 0.15s ease, opacity 0.15s ease;
}

.vis-pill:disabled {
    opacity: 0.6;
    cursor: wait;
}

.vis-public {
    background: var(--success-soft);
    color: var(--success-dark);
}

.vis-public:hover {
    background: #d8f0e1;
}

.vis-private {
    background: #eef0f5;
    color: var(--ink-soft);
}

.vis-private:hover {
    background: #e2e5ee;
}

.spinner-sm {
    width: 12px;
    height: 12px;
    border-width: 2px;
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

.head-actions {
    display: flex;
    gap: 8px;
    flex: none;
}

.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(17, 24, 39, 0.45);
    backdrop-filter: blur(3px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 100;
}

.modal {
    width: 100%;
    max-width: 520px;
    padding: 26px 24px 22px;
}

.modal-title {
    font-size: 18px;
    font-weight: 800;
    margin-bottom: 10px;
}

.modal-desc {
    font-size: 13.5px;
    color: var(--ink-soft);
    line-height: 1.7;
    margin-bottom: 16px;
}

.modal-loading {
    display: flex;
    justify-content: center;
    padding: 18px 0;
}

.modal-loading .spinner {
    width: 26px;
    height: 26px;
    border-width: 3px;
}

.token-row {
    display: flex;
    gap: 10px;
}

.token-input {
    flex: 1;
    min-width: 0;
    font-size: 12px;
}

.modal-close {
    margin-top: 14px;
    width: 100%;
}
</style>
