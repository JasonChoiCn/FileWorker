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

const statusClass = (status: UploadStatus): string => {
  if (status === 'done') return 'i-mdi-check done-icon';
  if (status === 'error') return 'i-mdi-alert-circle error-icon';
  return 'uploading';
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
  if (event.type === 'dragover') {
    fileUploadArea.value.style.border = '2px dashed #000';
  } else {
    fileUploadArea.value.style.border = '2px dashed #e5e7eb';
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
  <div class="flex flex-col items-center">
    <div class="file-area flex flex-col mt-4">
      <div class="files" @click="requestUploadFile" ref="fileUploadArea">
        <input ref="fileUploadInput" type="file" class="hidden" multiple />
      </div>
      <div class="footer p-2">
        <select class="public-select" v-model="fileStore.visibility">
          <option value="private">{{ $t('common.private') }}</option>
          <option value="public">{{ $t('common.public') }}</option>
        </select>
      </div>
    </div>
    <div class="px-4 py-4 max-w-screen-md w-4/5">
      <a v-for="file in uploadedFiles" :key="file.key || file.name" class="w-full flex flex-row items-center mt-4"
        :href="file.status === 'done' ? '/' + encodeName(file.key) : undefined" target="_blank">
        <div class="w-10 h-10 i-mdi-file-document-outline"></div>
        <div class="flex flex-col">
          <div class="text-lg font-semibold">{{ file.key || file.name }}</div>
          <div class="text-sm text-gray">{{ formatBytes(file.size) }} {{ file.visibility }}</div>
        </div>
        <div class="ml-auto w-6 h-6" :class="statusClass(file.status)"></div>
      </a>
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

.pannel {
  --uno: my-6 px-4 py-4 max-w-screen-md w-4/5 rounded shadow-md;
}

.tips-pannel {
  background-color: #d1e7dd;
}

.file-area {
  --uno: rounded max-w-screen-md w-4/5 border-1 border-gray-300;
  background-color: white;
}

.file-area .header {
  background-color: #f5f5f5;
}

.file-area .footer {
  --uno: flex flex-row;
  background-color: #f5f5f5;
}

.file-area .footer .public-select {
  --uno: border-1 rounded px-6 py-1.5 text-sm;
  border-color: #d1d1d1;
  outline-color: #0969da;
}

.file-area .footer .save-btn {
  --uno: rounded px-6 py-1.5 text-sm ml-auto text-white;
  background-color: #1f883d;
}

.file-area .footer .save-btn:hover {
  background-color: #1a7f37;
}

.file-area .header .filename-input {
  --uno: border-1 rounded px-3 py-2 text-sm w-60;
  border-color: #d1d1d1;
  outline-color: #0969da;
}

.files {
  --uno: h-50 border-dashed border-2 cursor-pointer;
  background: url(../assets/upload.svg) center center no-repeat;
  background-color: white;
}

.done-icon {
  color: #67c23a;
}

.error-icon {
  color: #f56c6c;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.uploading {
  border: 5px solid #f3f3f3;
  border-top: 5px solid #555;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  display: inline-block;
  animation: spin 2s linear infinite;
}
</style>
