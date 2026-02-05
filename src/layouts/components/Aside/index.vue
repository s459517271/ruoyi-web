<!-- Aside 侧边栏 -->
<script setup lang="ts">
import type { ConversationItem } from 'vue-element-plus-x/types/Conversations';
import type { ChatSessionVo } from '@/api/session/types';
import { useRoute, useRouter } from 'vue-router';
import { get_session } from '@/api';
import logo from '@/assets/images/logo.png';
import Collapse from '@/layouts/components/Header/components/Collapse.vue';
import { useDesignStore } from '@/stores';
import { useSessionStore } from '@/stores/modules/session';

const route = useRoute();
const router = useRouter();
const designStore = useDesignStore();
const sessionStore = useSessionStore();

const sessionId = computed(() => route.params?.id);
const conversationsList = computed(() => sessionStore.sessionList);
const loadMoreLoading = computed(() => sessionStore.isLoadingMore);
const active = ref<string | undefined>();

// 固定应用列表
const appList = ref([
  {
    id: 'ai-chat',
    name: 'AI 对话',
    icon: 'ChatLineRound',
    route: '/chat',
  },
  {
    id: 'ai-image',
    name: 'AI 画图',
    icon: 'Picture',
    route: '/ai-image',
  },
  {
    id: 'ai-video',
    name: 'AI 视频',
    icon: 'VideoCamera',
    route: '/ai-video',
  },
  {
    id: 'ai-ppt',
    name: 'AI PPT',
    icon: 'Document',
    route: '/ai-ppt',
  },
]);

const activeApp = ref('ai-chat');
const searchKeyword = ref('');
const activeFooterBtn = ref<'agent' | 'knowledge' | null>(null);

// 切换应用
function handleAppClick(app: typeof appList.value[0]) {
  activeApp.value = app.id;
  // 这里可以添加路由跳转逻辑
  // router.push(app.route);
}

// 智能体中心
function handleAgentCenter() {
  activeFooterBtn.value = activeFooterBtn.value === 'agent' ? null : 'agent';
  console.log('打开智能体中心');
  // router.push('/agent-center');
}

// 知识库管理
function handleKnowledgeBase() {
  activeFooterBtn.value = activeFooterBtn.value === 'knowledge' ? null : 'knowledge';
  console.log('打开知识库管理');
  // router.push('/knowledge-base');
}

onMounted(async () => {
  // 默认选中 AI 对话应用
  activeApp.value = 'ai-chat';

  // 获取会话列表
  console.log('[Aside.onMounted] 开始获取会话列表');
  await sessionStore.requestSessionList();
  console.log('[Aside.onMounted] 获取会话列表完成，conversationsList.length:', conversationsList.value.length);
  console.log('[Aside.onMounted] conversationsList:', conversationsList.value);

  // 高亮最新会话
  if (conversationsList.value.length > 0 && sessionId.value) {
    console.log('[Aside.onMounted] 获取当前选中会话，sessionId:', sessionId.value);
    const currentSessionRes = await get_session(`${sessionId.value}`);
    // 通过 ID 查询详情，设置当前会话 (因为有分页)
    sessionStore.setCurrentSession(currentSessionRes.data);
  }
});

watch(
  () => sessionStore.currentSession,
  (newValue) => {
    active.value = newValue ? `${newValue.id}` : undefined;
  },
);

// 创建会话
function handleCreatChat() {
  // 创建会话, 跳转到默认聊天
  sessionStore.createSessionBtn();
}

// 切换会话
function handleChange(item: ConversationItem<ChatSessionVo>) {
  sessionStore.setCurrentSession(item);
  router.replace({
    name: 'chatWithId',
    params: {
      id: item.id,
    },
  });
}

// 处理组件触发的加载更多事件
async function handleLoadMore() {
  if (!sessionStore.hasMore)
    return; // 无更多数据时不加载
  await sessionStore.loadMoreSessions();
}

// 右键菜单
function handleMenuCommand(command: string, item: ConversationItem<ChatSessionVo>) {
  switch (command) {
    case 'delete':
      ElMessageBox.confirm('删除后，聊天记录将不可恢复。', '确定删除对话？', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
        cancelButtonClass: 'el-button--info',
        roundButton: true,
        autofocus: false,
      })
        .then(async () => {
          // 删除会话
          await sessionStore.deleteSessions([item.id!]);

          // 检查删除的是否为当前选中会话，若是则返回默认页
          nextTick(() => {
            if (item.id === active.value) {
              // 如果删除当前会话，返回到默认页面
              sessionStore.createSessionBtn();
            }
          });
        })
        .catch(() => {
          // 取消删除
        });
      break;
    case 'rename':
      ElMessageBox.prompt('', '编辑对话名称', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputErrorMessage: '请输入对话名称',
        confirmButtonClass: 'el-button--primary',
        cancelButtonClass: 'el-button--info',
        roundButton: true,
        inputValue: item.sessionTitle, // 设置默认值
        autofocus: false,
        inputValidator: (value) => {
          if (!value) {
            return false;
          }
          return true;
        },
      }).then(({ value }) => {
        sessionStore
          .updateSession({
            id: item.id!,
            sessionTitle: value,
            sessionContent: item.sessionContent,
          })
          .then(() => {
            ElMessage({
              type: 'success',
              message: '修改成功',
            });
            nextTick(() => {
              // 如果是当前会话，则更新当前选中会话信息
              if (sessionStore.currentSession?.id === item.id) {
                sessionStore.setCurrentSession({
                  ...item,
                  sessionTitle: value,
                });
              }
            });
          });
      });
      break;
    default:
      break;
  }
}
</script>

<template>
  <div
    class="aside-container"
    :class="{
      'aside-container-suspended': designStore.isSafeAreaHover,
      'aside-container-collapse': designStore.isCollapse,
      // 折叠且未激活悬停时添加 no-delay 类
      'no-delay': designStore.isCollapse && !designStore.hasActivatedHover,
    }"
  >
    <div class="aside-wrapper">
      <div v-if="!designStore.isCollapse" class="aside-header">
        <div class="flex items-center gap-8px hover:cursor-pointer" @click="handleCreatChat">
          <el-image :src="logo" alt="logo" fit="cover" class="logo-img" />
          <span class="logo-text max-w-150px text-overflow">RuoYi-AI</span>
        </div>
        <Collapse class="ml-auto" />
      </div>

      <div class="aside-body">
        <!-- 搜索框 -->
        <div class="search-wrapper">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索对话"
            clearable
            class="search-input"
          >
            <template #prefix>
              <el-icon>
                <Search />
              </el-icon>
            </template>
          </el-input>
        </div>

        <!-- 应用入口区域 -->
        <div class="app-list-wrapper">
          <div class="app-list-title">应用</div>
          <div class="app-list">
            <div
              v-for="app in appList"
              :key="app.id"
              class="app-item"
              :class="{ 'app-item-active': activeApp === app.id }"
              @click="handleAppClick(app)"
            >
              <el-icon class="app-icon">
                <component :is="app.icon" />
              </el-icon>
              <span class="app-name">{{ app.name }}</span>
            </div>
          </div>
        </div>

        <!-- 分割线 -->
        <div class="divider" />

        <div class="aside-content">
          <div v-if="conversationsList.length > 0" class="conversations-wrap overflow-hidden">
            <Conversations
              v-model:active="active"
              :items="conversationsList"
              :label-max-width="200"
              :show-tooltip="true"
              :tooltip-offset="60"
              show-built-in-menu
              groupable
              row-key="id"
              label-key="sessionTitle"
              tooltip-placement="right"
              :load-more="handleLoadMore"
              :load-more-loading="loadMoreLoading"
              :items-style="{
                marginLeft: '8px',
                userSelect: 'none',
                borderRadius: '10px',
                padding: '8px 12px',
              }"
              :items-active-style="{
                backgroundColor: '#fff',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                color: 'rgba(0, 0, 0, 0.85)',
              }"
              :items-hover-style="{
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              }"
              @menu-command="handleMenuCommand"
              @change="handleChange"
            />
          </div>

          <el-empty v-else class="h-full flex-center" description="暂无对话记录" />
        </div>
      </div>

      <!-- 底部悬浮按钮 -->
      <div class="aside-footer">
        <div class="footer-btn" :class="{ active: activeFooterBtn === 'agent' }" @click="handleAgentCenter">
          <el-icon class="footer-btn-icon">
            <Avatar />
          </el-icon>
          <span class="footer-btn-text">智能体中心</span>
        </div>
        <div class="footer-divider" />
        <div class="footer-btn" :class="{ active: activeFooterBtn === 'knowledge' }" @click="handleKnowledgeBase">
          <el-icon class="footer-btn-icon">
            <FolderOpened />
          </el-icon>
          <span class="footer-btn-text">知识库管理</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
// 基础样式
.aside-container {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 11;
  width: var(--sidebar-default-width);
  height: 100%;
  pointer-events: auto;
  background-color: var(--sidebar-background-color);
  border-right: 0.5px solid var(--s-color-border-tertiary, rgb(0 0 0 / 8%));
  .aside-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;

    // 侧边栏头部样式
    .aside-header {
      display: flex;
      align-items: center;
      height: 36px;
      margin: 10px 12px 0;
      .logo-img {
        box-sizing: border-box;
        width: 36px;
        height: 36px;
        padding: 4px;
        overflow: hidden;
        background-color: #ffffff;
        border-radius: 50%;
        img {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }
      }
      .logo-text {
        font-size: 16px;
        font-weight: 700;
        color: rgb(0 0 0 / 85%);
        transform: skewX(-2deg);
      }
    }

    // 侧边栏内容样式
    .aside-body {
      // 搜索框样式
      .search-wrapper {
        padding: 16px 12px 12px;
        .search-input {
          :deep(.el-input__wrapper) {
            padding: 8px 12px;
            background-color: rgb(0 0 0 / 4%);
            border-radius: 10px;
            box-shadow: none;
            transition: all 0.2s ease;
            &:hover {
              background-color: rgb(0 0 0 / 6%);
            }
            &.is-focus {
              background-color: #ffffff;
              box-shadow: 0 0 0 1px rgb(0 87 255 / 20%);
            }
          }
          :deep(.el-input__inner) {
            font-size: 14px;
            color: rgb(0 0 0 / 85%);
            &::placeholder {
              color: rgb(0 0 0 / 45%);
            }
          }
          :deep(.el-input__prefix) {
            color: rgb(0 0 0 / 45%);
          }
        }
      }

      // 应用列表区域
      .app-list-wrapper {
        padding: 16px 12px 0;
        .app-list-title {
          padding-left: 6px;
          margin-bottom: 8px;
          font-size: 12px;
          font-weight: 500;
          color: rgb(0 0 0 / 45%);
        }
        .app-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          .app-item {
            display: flex;
            gap: 10px;
            align-items: center;
            padding: 10px 12px;
            cursor: pointer;
            user-select: none;
            border-radius: 10px;
            transition: all 0.2s ease;
            &:hover {
              background-color: rgb(0 0 0 / 4%);
            }
            &.app-item-active {
              color: rgb(0 0 0 / 85%);
              background-color: #ffffff;
              box-shadow: 0 1px 2px rgb(0 0 0 / 5%);
              .app-icon {
                color: #0057ff;
              }
            }
            .app-icon {
              width: 20px;
              height: 20px;
              font-size: 20px;
              color: rgb(0 0 0 / 45%);
              transition: color 0.2s ease;
            }
            .app-name {
              font-size: 14px;
              font-weight: 500;
              color: rgb(0 0 0 / 85%);
            }
          }
        }
      }

      // 分割线
      .divider {
        height: 1px;
        margin: 12px;
        background-color: rgb(0 0 0 / 6%);
      }
      .creat-chat-btn-wrapper {
        padding: 0 12px;
        .creat-chat-btn {
          display: flex;
          gap: 6px;
          align-items: center;
          padding: 8px 6px;
          margin-top: 16px;
          margin-bottom: 6px;
          color: #0057ff;
          cursor: pointer;
          user-select: none;
          background-color: rgb(0 87 255 / 6%);
          border: 1px solid rgb(0 102 255 / 15%);
          border-radius: 12px;
          &:hover {
            background-color: rgb(0 87 255 / 12%);
          }
          .creat-chat-text {
            font-size: 14px;
            font-weight: 700;
            line-height: 22px;
          }
          .add-icon {
            width: 24px;
            height: 24px;
            font-size: 16px;
          }
          .svg-icon {
            height: 24px;
            margin-left: auto;
            color: rgb(0 87 255 / 30%);
          }
        }
      }
      .aside-content {
        display: flex;
        flex: 1;
        flex-direction: column;
        height: 100%;
        min-height: 0;

        // 会话列表高度-基础样式（调整高度以适应应用区域和底部按钮）
        .conversations-wrap {
          height: calc(100vh - 400px);
          .label {
            display: flex;
            align-items: center;
            height: 100%;
          }
        }
      }
    }

    // 底部悬浮按钮样式
    .aside-footer {
      position: absolute;
      right: 12px;
      bottom: 20px;
      left: 12px;
      z-index: 20;
      display: flex;
      gap: 0;
      align-items: center;
      padding: 8px;
      background-color: #f3f4f6;
      border-radius: 10px;
      .footer-btn {
        display: flex;
        flex: 1;
        flex-direction: column;
        gap: 4px;
        align-items: center;
        justify-content: center;
        padding: 8px 4px;
        cursor: pointer;
        user-select: none;
        background-color: transparent;
        border-radius: 8px;
        transition: all 0.2s ease;
        &:hover {
          background-color: rgb(0 0 0 / 4%);
        }
        &.active {
          background-color: rgb(0 87 255 / 8%);
          .footer-btn-icon {
            color: #0057ff;
          }
          .footer-btn-text {
            color: #0057ff;
          }
        }
        .footer-btn-icon {
          width: 20px;
          height: 20px;
          font-size: 20px;
          color: rgb(0 0 0 / 65%);
          transition: color 0.2s ease;
        }
        .footer-btn-text {
          font-size: 11px;
          font-weight: 500;
          line-height: 1.2;
          color: rgb(0 0 0 / 65%);
          text-align: center;
          transition: color 0.2s ease;
        }
      }
      .footer-divider {
        flex-shrink: 0;
        width: 1px;
        height: 40px;
        background-color: rgb(0 0 0 / 10%);
      }
    }
  }
}

// 折叠样式
.aside-container-collapse {
  position: absolute;
  top: 54px;
  z-index: 22;
  height: auto;
  max-height: calc(100% - 110px);
  padding-bottom: 12px;
  overflow: hidden;

  /* 禁用悬停事件 */
  pointer-events: none;
  border: 1px solid rgb(0 0 0 / 8%);
  border-radius: 15px;
  box-shadow:
    0 10px 20px 0 rgb(0 0 0 / 10%),
    0 0 1px 0 rgb(0 0 0 / 15%);
  opacity: 0;

  // 指定样式过渡

  // 向左偏移一个宽度
  transform: translateX(-100%);
  transition: opacity 0.3s ease 0.3s, transform 0.3s ease 0.3s;

  /* 新增：未激活悬停时覆盖延迟 */
  &.no-delay {
    transition-delay: 0s, 0s;
  }
}

// 悬停样式
.aside-container-collapse:hover,
.aside-container-collapse.aside-container-suspended {
  height: auto;
  max-height: calc(100% - 110px);
  padding-bottom: 12px;
  overflow: hidden;
  pointer-events: auto;
  border: 1px solid rgb(0 0 0 / 8%);
  border-radius: 15px;
  box-shadow:
    0 10px 20px 0 rgb(0 0 0 / 10%),
    0 0 1px 0 rgb(0 0 0 / 15%);

  // 直接在这里写悬停时的样式（与 aside-container-suspended 一致）
  opacity: 1;

  // 过渡动画沿用原有设置
  transform: translateX(15px);
  transition: opacity 0.3s ease 0s, transform 0.3s ease 0s;

  // 会话列表高度-悬停样式
  .conversations-wrap {
    height: calc(100vh - 155px) !important;
  }
}

// 样式穿透
:deep() {
  // 会话列表背景色
  .conversations-list {
    background-color: transparent !important;
  }

  // 群组标题样式 和 侧边栏菜单背景色一致
  .conversation-group-title {
    padding-left: 12px !important;
    font-weight: 700 !important;
    color: rgb(0 0 0 / 85%) !important;
    background-color: var(--sidebar-background-color) !important;
  }
}
</style>
