<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { marked } from "marked";
import type { DocGroup, DocItem } from "./docs-config";
import { docGroups as initialGroups } from "./docs-config";

const groups = ref<DocGroup[]>(structuredClone(initialGroups));

const flatDocs = computed<DocItem[]>(() =>
  groups.value.flatMap((g) =>
    g.items.map((item) => ({
      ...item,
      group: g.group,
    }))
  )
);

const currentKey = ref<string>("");
const docHtml = ref<string>("載入中…");

const currentDoc = computed<DocItem | undefined>(() =>
  flatDocs.value.find((d) => d.key === currentKey.value)
);

const currentIndex = computed<number>(() =>
  flatDocs.value.findIndex((d) => d.key === currentKey.value)
);

const prevDoc = computed<DocItem | null>(() =>
  currentIndex.value > 0
    ? (flatDocs.value[currentIndex.value - 1] as DocItem)
    : null
);
const nextDoc = computed<DocItem | null>(() =>
  currentIndex.value >= 0 && currentIndex.value < flatDocs.value.length - 1
    ? (flatDocs.value[currentIndex.value + 1] as DocItem)
    : null
);

function toggleGroup(group: DocGroup) {
  group.collapsed = !group.collapsed;
}

async function loadDoc(doc: DocItem | undefined): Promise<void> {
  if (!doc) {
    docHtml.value = "未找到文件";
    return;
  }
  docHtml.value = "載入中…";
  try {
    const res = await fetch(doc.file);
    if (!res.ok) {
      throw new Error("not ok");
    }
    const text = await res.text();
    docHtml.value = await marked.parse(text);
  } catch {
    docHtml.value = `<p>無法載入文件：<code>${doc.file}</code></p>
<p>請確認檔案是否存在於 <code>/docs</code> 資料夾。</p>`;
  }
}

function setDoc(key: string, updateHash = true): void {
  const doc = flatDocs.value.find((d) => d.key === key);
  if (!doc) return;

  currentKey.value = doc.key;

  const g = groups.value.find((g) => g.group === doc.group);
  if (g && g.collapsed) g.collapsed = false;

  if (updateHash) {
    history.replaceState(null, "", `#${doc.key}`);
  }

  void loadDoc(doc);
}

function getInitialKey(): string {
  const hash = window.location.hash.replace("#", "");
  const found = flatDocs.value.find((d) => d.key === hash);
  return found?.key ?? flatDocs.value[0]?.key ?? "";
}

function goPrev(): void {
  if (prevDoc.value) setDoc(prevDoc.value.key);
}

function goNext(): void {
  if (nextDoc.value) setDoc(nextDoc.value.key);
}

onMounted(() => {
  const initialKey = getInitialKey();
  if (initialKey) {
    setDoc(initialKey, false);
  }

  window.addEventListener("hashchange", () => {
    const key = getInitialKey();
    if (key && key !== currentKey.value) {
      setDoc(key, false);
    }
  });
});
</script>

<template>
  <div class="min-h-screen">
    <!-- Topbar -->
    <header
      class="flex items-center justify-between px-12 py-5 bg-white border-b border-gray-200 sticky top-0 z-20"
    >
      <div class="flex items-center gap-2 text-lg font-semibold">
        <div class="w-3 h-3 rounded-full bg-yellow-400" />
        <span>dannis</span>
        <span class="text-sm text-gray-500">· Docs</span>
      </div>
      <nav class="flex gap-6 text-sm">
        <a href="/home.html" class="hover:underline">Home</a>
        <a href="/docs.html" class="hover:underline">Docs</a>
        <a href="https://github.com/" target="_blank" class="hover:underline"
          >GitHub</a
        >
      </nav>
    </header>

    <!-- Layout -->
    <main
      class="max-w-7xl mx-auto mt-3 mb-20 bg-white shadow-2xl rounded-3xl overflow-hidden grid grid-cols-12"
    >
      <!-- Sidebar -->
      <aside class="col-span-3 bg-gray-100 p-6 border-r border-gray-200">
        <div>
          <h2 class="text-lg font-semibold mb-1">Documentation</h2>
          <p class="text-xs text-gray-500 mb-4">選擇一篇文件以查看內容</p>
        </div>

        <div class="space-y-4">
          <div
            v-for="group in groups"
            :key="group.group"
            class="border-t border-gray-300 pt-3"
          >
            <!-- Group header -->
            <button
              type="button"
              class="w-full flex justify-between items-center cursor-pointer hover:bg-gray-200 px-2 py-1 rounded-lg"
              @click="toggleGroup(group)"
            >
              <div class="text-[11px] uppercase tracking-wider text-gray-500">
                {{ group.group }}
              </div>
              <div
                class="text-xs text-gray-400 transition-transform"
                :class="{ 'rotate-90': !group.collapsed }"
              >
                ▶
              </div>
            </button>

            <!-- Items -->
            <div v-show="!group.collapsed" class="mt-2 space-y-1">
              <button
                v-for="item in group.items"
                :key="item.key"
                type="button"
                @click="setDoc(item.key)"
                class="w-full flex items-center gap-2 px-3 py-2 text-left text-sm rounded-full transition border"
                :class="{
                  'bg-teal-500 text-white border-teal-500 shadow-md':
                    currentKey === item.key,
                  'text-gray-600 border-transparent hover:bg-teal-100 hover:border-teal-300':
                    currentKey !== item.key,
                }"
              >
                <span
                  class="w-2 h-2 rounded-full"
                  :class="
                    currentKey === item.key ? 'bg-yellow-300' : 'bg-gray-400'
                  "
                />
                <span>{{ item.title }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="mt-10 pt-4 border-t text-xs text-gray-400">
          Back to <a href="/index.html" class="underline">Home</a>
        </div>
      </aside>

      <!-- Content -->
      <section class="col-span-9 p-10 flex flex-col">
        <header>
          <div class="text-[11px] uppercase tracking-wider text-gray-400">
            TECH STACK
          </div>
          <h1 class="text-2xl font-bold mt-1">
            {{ currentDoc?.title ?? "Loading…" }}
          </h1>
          <p class="text-sm text-gray-500">
            {{ currentDoc?.sub ?? "" }}
          </p>
        </header>

        <!-- ✅ 可捲動內容區 -->
        <div class="mt-6 flex-1 overflow-y-auto pr-2 max-h-[70vh]">
          <article
            class="prose prose-purpleDocs max-w-none prose-headings:scroll-mt-24 prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-a:font-medium"
            v-html="docHtml"
          ></article>
        </div>

        <!-- 下方導航固定在 section 底部 -->
        <div class="mt-6 flex justify-between items-center border-t pt-5">
          <button
            type="button"
            class="px-4 py-2 rounded-full border text-sm transition disabled:opacity-40 hover:bg-gray-900 hover:text-white"
            :disabled="!prevDoc"
            @click="goPrev"
          >
            上一篇
          </button>

          <div class="text-xs text-gray-500">
            Doc {{ currentIndex + 1 }} / {{ flatDocs.length }}
          </div>

          <button
            type="button"
            class="px-4 py-2 rounded-full border bg-teal-600 text-white text-sm transition disabled:opacity-40 hover:bg-teal-700"
            :disabled="!nextDoc"
            @click="goNext"
          >
            下一篇 ➡️
          </button>
        </div>
      </section>
    </main>
  </div>
</template>
