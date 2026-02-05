<!-- 默认消息列表页 -->
<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue';
import type { FilesCardProps } from 'vue-element-plus-x/types/FilesCard';
import { Sender } from 'vue-element-plus-x';
import FilesSelect from '@/components/FilesSelect/index.vue';
import ModelSelect from '@/components/ModelSelect/index.vue';
import WelecomeText from '@/components/WelecomeText/index.vue';
import { useUserStore } from '@/stores';
import { useFilesStore } from '@/stores/modules/files';
import { useSessionStore } from '@/stores/modules/session';
import { useChatStore } from '@/stores/modules/chat';
import { getKnowledgeList } from '@/api/chat';

const userStore = useUserStore();
const sessionStore = useSessionStore();
const filesStore = useFilesStore();
const chatStore = useChatStore();

const senderValue = ref('');
const senderRef = ref<InstanceType<typeof Sender> | null>(null);

// 推理和联网开关状态
const isReasoningEnabled = ref(false);
const isWebSearchEnabled = ref(false);

// 知识库列表配置
const knowledgeList = ref<any[]>([]);

// 知识库列表选择标签配置
const selectTagsArr = ref<any[]>([
  {
    dialogTitle: '知识库选择',
    key: 'knowledge',
    options: knowledgeList.value
  }
]);

// 加载知识库列表
async function loadKnowledgeList() {
  try {
    const response = await getKnowledgeList();
    if (response?.rows && Array.isArray(response.rows)) {
      knowledgeList.value = response.rows.map((item: any) => ({
        id: item.id,
        name: item.name,
        icon: 'Document'
      }));
      selectTagsArr.value[0].options = knowledgeList.value;
    }
  } catch (error) {
    console.error('Failed to load knowledge list:', error);
  }
}

// 知识库弹窗状态
const knowledgePopoverRef = ref();
const isKnowledgePopoverVisible = ref(false);
const selectedKnowledgeId = ref<string>('');
const selectedKnowledgeName = ref<string>('知识库');

// 插入知识库标签
function insertKnowledgeTag(knowledgeId: string) {
  const knowledge = knowledgeList.value.find(k => k.id === knowledgeId);
  if (knowledge) {
    selectedKnowledgeId.value = knowledgeId;
    selectedKnowledgeName.value = knowledge.name;
    chatStore.setKnowledgeId(knowledgeId);
    // 关闭弹窗
    knowledgePopoverRef.value?.hide();
  }
}

// 清除知识库选择
function clearKnowledgeSelection() {
  selectedKnowledgeId.value = '';
  selectedKnowledgeName.value = '知识库';
}

// 处理选择对话框显示事件
function handleShowSelectDialog(selectTag: any) {
  // 此方法被 Sender 组件的 showSelectDialog 事件调用
  // 可以在这里处理自定义逻辑
  console.log('Selected tag:', selectTag);
}

async function handleSend() {
  const messageContent = senderValue.value;
  localStorage.setItem('chatContent', messageContent);
  localStorage.setItem('enableThinking', String(isReasoningEnabled.value));
  localStorage.setItem('enableInternet', String(isWebSearchEnabled.value));
  senderValue.value = '';
  await sessionStore.createSessionList({
    userId: userStore.userInfo?.userId as number,
    sessionContent: messageContent,
    sessionTitle: messageContent.slice(0, 10),
    remark: messageContent.slice(0, 10),
  });
}

function handleDeleteCard(_item: FilesCardProps, index: number) {
  filesStore.deleteFileByIndex(index);
}

watch(
  () => filesStore.filesList.length,
  (val) => {
    if (val > 0) {
      nextTick(() => {
        senderRef.value?.openHeader();
      });
    }
    else {
      nextTick(() => {
        senderRef.value?.closeHeader();
      });
    }
  },
);

// 组件挂载时加载知识库列表
onMounted(() => {
  loadKnowledgeList();
});
</script>

<template>
  <div class="chat-defaul-wrap">
    <WelecomeText />
    <Sender
      ref="senderRef"
      v-model="senderValue"
      class="chat-defaul-sender"
      :auto-size="{
        maxRows: 9,
        minRows: 3,
      }"
      variant="updown"
      clearable
      allow-speech
      :select-list="selectTagsArr"
      @submit="handleSend"
      @showSelectDialog="handleShowSelectDialog"
    >
      <template #header>
        <div class="sender-header p-12px pt-6px pb-0px">
          <Attachments
            :items="filesStore.filesList"
            :hide-upload="true"
            @delete-card="handleDeleteCard"
          >
            <template #prev-button="{ show, onScrollLeft }">
              <div
                v-if="show"
                class="prev-next-btn left-8px flex-center w-22px h-22px rounded-8px border-1px border-solid border-[rgba(0,0,0,0.08)] c-[rgba(0,0,0,.4)] hover:bg-#f3f4f6 bg-#fff font-size-10px"
                @click="onScrollLeft"
              >
                <el-icon>
                  <ArrowLeftBold />
                </el-icon>
              </div>
            </template>

            <template #next-button="{ show, onScrollRight }">
              <div
                v-if="show"
                class="prev-next-btn right-8px flex-center w-22px h-22px rounded-8px border-1px border-solid border-[rgba(0,0,0,0.08)] c-[rgba(0,0,0,.4)] hover:bg-#f3f4f6 bg-#fff font-size-10px"
                @click="onScrollRight"
              >
                <el-icon>
                  <ArrowRightBold />
                </el-icon>
              </div>
            </template>
          </Attachments>
        </div>
      </template>
      <template #prefix>
        <div class="flex-1 flex items-center gap-8px flex-none w-fit overflow-hidden">
          <FilesSelect />
          <ModelSelect />

          <!-- 知识库选择下拉菜单 -->
          <el-popover
            ref="knowledgePopoverRef"
            placement="top-start"
            :width="280"
            trigger="click"
            popper-class="knowledge-popover"
            @show="isKnowledgePopoverVisible = true"
            @hide="isKnowledgePopoverVisible = false"
          >
            <template #default>
              <div class="knowledge-list-container">
                <div class="knowledge-list-header">
                  <span>选择知识库</span>
                  <button class="clear-btn" @click="clearKnowledgeSelection">取消选择</button>
                </div>
                <div class="knowledge-list">

                  <div
                    v-for="item in knowledgeList"
                    :key="item.id"
                    class="knowledge-item"
                    :class="{ 'is-selected': selectedKnowledgeId === item.id }"
                    @click="insertKnowledgeTag(item.id)"
                  >
                    <div class="item-name">
                      <el-icon>
                        <component :is="item.icon" />
                      </el-icon>
                      {{ item.name }}
                      <el-icon v-if="selectedKnowledgeId === item.id" class="item-check">
                        <Check />
                      </el-icon>
                    </div>
                  </div>

                </div>
              </div>
            </template>
            <template #reference>
              <div class="knowledge-btn">
                <el-icon class="knowledge-icon">
                  <DocumentCopy />
                </el-icon>
                <span class="knowledge-text">{{ selectedKnowledgeName }}</span>
              </div>
            </template>
          </el-popover>

          <!-- 推理和联网按钮 -->
          <div class="feature-buttons">
            <div
              class="feature-btn"
              :class="{ active: isReasoningEnabled }"
              @click="isReasoningEnabled = !isReasoningEnabled"
            >
              <el-icon class="feature-icon">
                <Operation />
              </el-icon>
              <span class="feature-text">推理</span>
            </div>
            <div
              class="feature-btn"
              :class="{ active: isWebSearchEnabled }"
              @click="isWebSearchEnabled = !isWebSearchEnabled"
            >
              <el-icon class="feature-icon">
                <ChromeFilled />
              </el-icon>
              <span class="feature-text">联网</span>
            </div>
          </div>
        </div>
      </template>
    </Sender>
  </div>
</template>

<style scoped lang="scss">
.chat-defaul-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 800px;
  min-height: 450px;
  .chat-defaul-sender {
    width: 100%;
  }

  // 知识库按钮样式 (参考 Element Plus 风格)
  .knowledge-btn {
    display: flex;
    gap: 6px;
    align-items: center;
    justify-content: center;
    height: 32px;
    padding: 0 14px;
    cursor: pointer;
    user-select: none;
    background-color: #fff;
    border: 1px solid #dcdfe4;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    color: #606266;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%);
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    }

    &:hover {
      color: #409eff;
      border-color: #c6e2ff;
      background-color: #f0f9ff;

      .knowledge-icon {
        color: #409eff;
      }

      &::before {
        opacity: 1;
      }
    }

    &:active {
      color: #0c5cff;
      border-color: #409eff;
      background-color: #e6f7ff;
      transform: scale(0.98);
    }

    .knowledge-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
      color: #909399;
      transition: color 0.3s ease;
      flex-shrink: 0;
    }

    .knowledge-text {
      font-size: 13px;
      font-weight: 500;
      color: inherit;
      transition: color 0.3s ease;
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  @keyframes scaleIn {
    0% {
      opacity: 0;
      transform: scale(0.8);
    }
    50% {
      transform: scale(1.1);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  // 推理和联网按钮样式
  .feature-buttons {
    display: flex;
    gap: 8px;
    margin-left: 8px;
    .feature-btn {
      display: flex;
      gap: 4px;
      align-items: center;
      padding: 6px 12px;
      cursor: pointer;
      user-select: none;
      background-color: transparent;
      border: 1px solid rgb(0 0 0 / 10%);
      border-radius: 16px;
      transition: all 0.2s ease;
      &:hover {
        background-color: rgb(0 0 0 / 4%);
        border-color: rgb(0 0 0 / 15%);
      }
      &.active {
        background-color: rgb(0 87 255 / 8%);
        border-color: rgb(0 87 255 / 30%);
        .feature-icon {
          color: #0057ff;
        }
        .feature-text {
          color: #0057ff;
        }
      }
      .feature-icon {
        width: 16px;
        height: 16px;
        font-size: 16px;
        color: rgb(0 0 0 / 65%);
        transition: color 0.2s ease;
      }
      .feature-text {
        font-size: 13px;
        font-weight: 500;
        color: rgb(0 0 0 / 85%);
        transition: color 0.2s ease;
      }
    }
  }
}

// 知识库列表容器
.knowledge-list-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

// 知识库列表标题
.knowledge-list-header {
  padding: 12px 16px 8px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  align-items: center;
  justify-content: space-between;

  span {
    flex: 1;
  }
}

// 知识库列表
.knowledge-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-height: 300px;
  overflow-y: auto;

  // 知识库项目
  .knowledge-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    cursor: pointer;
    user-select: none;
    background-color: transparent;
    border-radius: 4px;
    transition: all 0.2s ease;
    position: relative;

    // 项目前的颜色指示器
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      border-radius: 0 2px 2px 0;
      background-color: var(--knowledge-color, #0057ff);
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    &:hover {
      background-color: #f5f7fa;

      .item-name {
        color: #409eff;

        :deep(.el-icon) {
          color: #409eff;
        }
      }
    }

    &.is-selected {
      background-color: #f0f9ff;
      border-left: 3px solid;
      padding-left: 9px;

      &::before {
        opacity: 0;
      }

      .item-name {
        color: #0057ff;
        font-weight: 500;

        :deep(.el-icon) {
          color: #0057ff;
        }

        .item-check {
          color: #0057ff;
          font-size: 16px;
        }
      }
    }

    // 项目名称
    .item-name {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      font-size: 13px;
      color: #606266;
      transition: all 0.2s ease;
      width: 100%;

      :deep(.el-icon) {
        width: 16px;
        height: 16px;
        font-size: 16px;
        color: #909399;
        flex-shrink: 0;
        transition: color 0.2s ease;
      }

      .item-check {
        margin-left: auto;
        flex-shrink: 0;
      }
    }
  }
}

// 知识库列表底部
.knowledge-list-footer {
  padding: 8px 12px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: center;
}

// 清除按钮
.clear-btn {
  padding: 4px 12px;
  height: auto;
  background-color: transparent;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  color: #909399;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    color: #f56c6c;
    background-color: #fef0f0;
  }

  &:active {
    color: #c81d1d;
    background-color: #fde2e2;
  }
}

// 知识库 Popover 弹窗样式 (全局作用域)
:deep(.knowledge-popover) {
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  padding: 0 !important;

  .el-popper__arrow {
    display: none;
  }

  [role='tooltip'] {
    padding: 0;
  }
}
</style>
