import type { ChatMessageVo, GetChatListParams, SendDTO } from './types';
import { get, post } from '@/utils/request';

// 发送消息
export const send = (data: SendDTO) => post('/chat/send', data);

// 新增对应会话聊天记录
export function addChat(data: ChatMessageVo) {
  return post('/system/message', data).json();
}

// 获取当前会话的聊天记录
export function getChatList(params: GetChatListParams) {
  return get<ChatMessageVo[]>('/system/message/list', params).json();
}

// 获取知识库列表
export function getKnowledgeList() {
  return get('/system/info/list').json();
}
