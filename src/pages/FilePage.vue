<script setup lang="ts">
import { onMounted, onUnmounted, ref, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import useFileStore from '@/store/file';
import { formatBytes } from '@/utils/utils';
import { toast } from '@/utils/toast';
import { PutFile } from '@/api';

const router = useRouter();
const { t: $t } = useI18n();
const fileStore = useFileStore();

let fileUploadInput = ref();

let requestUploadFile = () => {
  fileUploadInput.value.click();
}

type UploadStatus = 'uploading' | 'done' | 'error';

interface UploadedFile {
  name: string;
  key: string;
  size: number;
  visibility: string;
  status: UploadStatus;
}

let uploadedFiles: Ref<UploadedFile[]> = ref([]);
let pendingUploads = 0;

const encodeName = encodeURIComponent;

const pillClass = (status: UploadStatus): string => {
  if (status === 'done') return 'pill pill-done';
  if (status === 'error') return 'pill pill-error';
  return 'pill pill-uploading';
};

const statusText = (status: UploadStatus): string => {
  if (status === 'done') return $t('file.status_done');
  if (status === 'error') return $t('file.status_error');
  return $t('file.status_uploading');
};

// Called whenever one upload settles. When the whole batch is done,
// either jump to the file list (all succeeded) or report the failures.
const checkBatchDone = () => {
  if (pendingUploads > 0) {
    return;
  }
  const failed = uploadedFiles.value.filter((f) => f.status === 'error');
  if (failed.length > 0) {
    toast($t('toast.upload_failed', { count: failed.length }), 'error');
  } else if (uploadedFiles.value.length > 0) {
    toast($t('toast.upload_success'), 'success');
    setTimeout(() => {
      router.push('/filemanage');
    }, 1500);
  }
};

const uploadSingle = async (index: number, file: File) => {
  pendingUploads++;
  try {
    const key = await PutFile(file.name, file, fileStore.visibility, "file");
    const row = uploadedFiles.value[index - 1];
    row.key = key;
    row.status = 'done';
  } catch (error) {
    console.error(error);
    uploadedFiles.value[index - 1].status = 'error';
  } finally {
    pendingUploads--;
    checkBatchDone();
  }
};

const queueFiles = (files: FileList | File[]) => {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const index = uploadedFiles.value.push({
      name: file.name,
      key: '',
      size: file.size,
      visibility: fileStore.visibility,
      status: 'uploading'
    });
    uploadSingle(index, file);
  }
};

onMounted(() => {
  fileUploadInput.value.addEventListener('change', async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const { files } = target;
    if (files && files.length > 0) {
      queueFiles(files);
      // Reset so the same file can be picked again (e.g. after a failure).
      target.value = '';
    }
  });
});

let fileUploadArea = ref();

const onDragEvent = async (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  if (event.type === 'dragover' || event.type === 'dragenter') {
    fileUploadArea.value.classList.add('dragging');
  } else {
    fileUploadArea.value.classList.remove('dragging');
  }
  if (event.type === 'drop') {
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      queueFiles(files);
    }
  }
}
onMounted(() => {
  fileUploadArea.value.addEventListener('dragenter', onDragEvent);
  fileUploadArea.value.addEventListener('dragover', onDragEvent);
  fileUploadArea.value.addEventListener('dragleave', onDragEvent);
  fileUploadArea.value.addEventListener('drop', onDragEvent);
});
onUnmounted(() => {
  fileUploadArea.value.removeEventListener('dragenter', onDragEvent);
  fileUploadArea.value.removeEventListener('dragover', onDragEvent);
  fileUploadArea.value.removeEventListener('dragleave', onDragEvent);
  fileUploadArea.value.removeEventListener('drop', onDragEvent);
});

</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <div class="page-title">{{ $t("page_title.file") }}</div>
        <div class="page-sub">{{ $t("file.upload_hint") }}</div>
      </div>
    </div>

    <div class="card drop-card">
      <div ref="fileUploadArea" class="dropzone" @click="requestUploadFile">
        <span class="drop-icon"><span class="i-mdi-cloud-upload-outline"></span></span>
        <div class="drop-text">{{ $t("file.drop_hint") }}</div>
        <div class="drop-sub">{{ $t("file.drop_sub") }}</div>
        <input ref="fileUploadInput" type="file" class="hidden" multiple />
      </div>
      <div class="drop-footer">
        <select class="select" v-model="fileStore.visibility">
          <option value="private">{{ $t('common.private') }}</option>
          <option value="public">{{ $t('common.public') }}</option>
        </select>
        <button class="btn btn-primary" @click="router.push('/filemanage')">
          <span class="i-mdi-folder-open-outline"></span>{{ $t('page_title.filemanage') }}
        </button>
      </div>
    </div>

    <div class="upload-list">
      <div v-for="file in uploadedFiles" :key="file.key || file.name" class="card file-row">
        <div class="file-ic"><span class="i-mdi-file-document-outline"></span></div>
        <div class="file-meta">
          <a v-if="file.status === 'done'" class="file-name" :href="'/' + encodeName(file.key)" target="_blank">{{
            file.key }}</a>
          <span v-else class="file-name">{{ file.name }}</span>
          <div class="file-sub">{{ formatBytes(file.size) }} · {{ file.visibility }}</div>
        </div>
        <span :class="pillClass(file.status)">
          <span v-if="file.status === 'uploading'" class="spinner"></span>
          <span v-else-if="file.status === 'done'" class="i-mdi-check"></span>
          <span v-else class="i-mdi-alert-circle-outline"></span>
          {{ statusText(file.status) }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.drop-card {
  overflow: hidden;
}

.dropzone {
  margin: 18px 18px 0;
  border: 2px dashed #c7cbd8;
  border-radius: 14px;
  background: #fafbfe;
  min-height: 190px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
  padding: 28px 16px;
}

.dropzone:hover {
  border-color: var(--brand);
  background: #f4f5ff;
}

.dropzone.dragging {
  border-color: var(--brand);
  background: var(--brand-soft);
  transform: scale(1.01);
}

.drop-icon {
  width: 60px;
  height: 60px;
  border-radius: 18px;
  background: linear-gradient(135deg, var(--brand), #8b5cf6);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  box-shadow: 0 10px 22px -8px rgba(99, 102, 241, 0.7);
  margin-bottom: 6px;
}

.dropzone.dragging .drop-icon {
  animation: fw-bounce 0.7s ease infinite;
}

@keyframes fw-bounce {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-8px);
  }
}

.drop-text {
  font-size: 16px;
  font-weight: 700;
}

.drop-sub {
  font-size: 13px;
  color: var(--ink-soft);
}

.drop-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 16px 18px;
}

.upload-list {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.file-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
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

a.file-name:hover {
  color: var(--brand-dark);
  text-decoration: underline;
}

.file-sub {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--ink-soft);
}
</style>
