<script setup lang="ts">
import { minimalSetup } from "codemirror"
import { EditorState } from "@codemirror/state"
import { EditorView, lineNumbers, highlightSpecialChars, drawSelection, dropCursor } from "@codemirror/view"

import { onMounted, onBeforeUnmount, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import useClipStore from "@/store/clip";

import { PutFile } from "@/api";
import { toast } from "@/utils/toast";
import { getRandomFilename } from "@/utils/utils";

const { t: $t } = useI18n();
const router = useRouter();

const code = ref("");
const modified = ref(false);
const saving = ref(false);
const editorElement = ref();
let editor: EditorView;

let startState = EditorState.create({
  doc: "",
  extensions: [
    minimalSetup,
    lineNumbers(),
    highlightSpecialChars(),
    drawSelection(),
    // 文件拖动
    dropCursor(),
    EditorView.updateListener.of((update) => {
      code.value = update.state.doc.toString();
      if (update.docChanged) {
        modified.value = true;
      }
    }),
  ]
})

onMounted(() => {
  editor = new EditorView({
    state: startState,
    parent: editorElement.value,
  })
  editor.requestMeasure({
    read: () => {
      editor.focus();
    }
  })
})

let filename = ref(getRandomFilename());

let refreshRandomFileName = () => {
  filename.value = getRandomFilename();
}

const clipStore = useClipStore();

const goFileManage = () => {
  router.push('/filemanage');
};

let onSaveBtnClick = async () => {
  if (saving.value) return;
  saving.value = true;
  try {
    const key = await PutFile(filename.value, code.value, clipStore.visibility, "text");
    modified.value = false;
    toast($t("toast.save_success", { name: key }), 'success');
  } catch (error) {
    console.error(error);
    toast($t("toast.save_failed"), 'error');
  } finally {
    saving.value = false;
  }
}

let saveContentKeydown = (e: KeyboardEvent) => {
  if ((e.ctrlKey && e.key === "s") || (e.metaKey && e.key === "s")) {
    e.preventDefault();
    onSaveBtnClick();
  }
}

let onPasteFile = async (e: ClipboardEvent) => {
  if (!e.clipboardData?.files.length) {
    return;
  }
  const file = e.clipboardData.files[0];
  console.log(file);
  const text = await file.text();
  const cursor = editor.state.selection.main.head;
  editor.dispatch({
    changes: { from: cursor, insert: text },
  });
}


onMounted(() => {
  window.addEventListener("keydown", saveContentKeydown);
  document.addEventListener("paste", onPasteFile);
})

onBeforeUnmount(() => {
  window.removeEventListener("keydown", saveContentKeydown);
  document.removeEventListener("paste", onPasteFile);
})

</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <div class="page-title">{{ $t("page_title.clip") }}</div>
        <div class="page-sub">{{ $t("index.clip_channel_desc") }}</div>
      </div>
    </div>

    <div class="card clip-card">
      <div class="clip-header">
        <span class="clip-ic"><span class="i-mdi-clipboard-text-outline"></span></span>
        <input class="text-input monospace filename-input" type="text" v-model="filename"
          :placeholder="$t('common.filename')" />
        <button class="icon-btn" @click="refreshRandomFileName" :title="$t('common.refresh')">
          <span class="i-mdi-refresh"></span>
        </button>
        <span class="save-dot" :class="modified ? 'dot-dirty' : 'dot-clean'"></span>
      </div>
      <div ref="editorElement" class="editor-wrap"></div>
      <div class="clip-footer">
        <select class="select" v-model="clipStore.visibility">
          <option value="private">{{ $t('common.private') }}</option>
          <option value="public">{{ $t('common.public') }}</option>
        </select>
        <button class="btn btn-primary" @click="goFileManage">
          <span class="i-mdi-folder-open-outline"></span>{{ $t('page_title.filemanage') }}
        </button>
        <button class="btn btn-success save-btn" @click="onSaveBtnClick" :disabled="saving">
          <span v-if="saving" class="spinner spinner-light"></span>
          <span v-else class="i-mdi-content-save-outline"></span>
          {{ $t('common.save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.clip-card {
  overflow: hidden;
}

.clip-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
  background: #fafbfe;
}

.clip-ic {
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: linear-gradient(135deg, #f472b6, #fb7185);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 21px;
}

.filename-input {
  flex: 1;
  min-width: 0;
}

.icon-btn {
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: none;
  background: #eef0f5;
  color: var(--ink-soft);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, transform 0.3s ease;
}

.icon-btn:hover {
  background: var(--brand-soft);
  color: var(--brand-dark);
}

.icon-btn:active .i-mdi-refresh {
  transform: rotate(180deg);
}

.save-dot {
  flex: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-left: 2px;
}

.dot-clean {
  background: var(--success);
  box-shadow: 0 0 0 4px var(--success-soft);
}

.dot-dirty {
  background: #f59e0b;
  box-shadow: 0 0 0 4px #fef3e2;
  animation: fw-pulse 1.6s ease infinite;
}

@keyframes fw-pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.45;
  }
}

.editor-wrap {
  background: #fff;
}

.editor-wrap :deep(.cm-editor) {
  min-height: 380px;
  max-height: 60vh;
  font-size: 14px;
}

.editor-wrap :deep(.cm-editor.cm-focused) {
  outline: none;
}

.editor-wrap :deep(.cm-gutters) {
  border: none !important;
  background: #fafbfe !important;
}

.clip-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-top: 1px solid var(--line);
  background: #fafbfe;
}

.save-btn {
  margin-left: auto;
}

.save-btn:disabled {
  opacity: 0.75;
  cursor: wait;
}

.spinner-light {
  border-color: rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
}
</style>

<style>
.cm-editor {
  border: none;
}
</style>
