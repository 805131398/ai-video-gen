import { ChatConversation, ChatMessage, AiChatRequest, AiChatStreamChunk } from '../types';

// ==================== 对话会话 ====================

export async function saveChatConversation(conversation: ChatConversation): Promise<boolean> {
  return window.electron.db.saveChatConversation(conversation);
}

export async function getChatConversations(): Promise<ChatConversation[]> {
  return window.electron.db.getChatConversations();
}

export async function deleteChatConversation(conversationId: string): Promise<boolean> {
  return window.electron.db.deleteChatConversation(conversationId);
}

export async function updateChatConversationTitle(conversationId: string, title: string): Promise<boolean> {
  return window.electron.db.updateChatConversationTitle(conversationId, title);
}

// ==================== 对话消息 ====================

export async function saveChatMessage(message: ChatMessage): Promise<boolean> {
  return window.electron.db.saveChatMessage(message);
}

export async function getChatMessages(conversationId: string): Promise<ChatMessage[]> {
  return window.electron.db.getChatMessages(conversationId);
}

export async function deleteChatMessages(conversationId: string): Promise<boolean> {
  return window.electron.db.deleteChatMessages(conversationId);
}

// ==================== AI 对话流式调用 ====================

export async function sendChatMessage(request: AiChatRequest): Promise<string> {
  return window.electron.chat.sendMessage(request);
}

export function onChatStreamChunk(callback: (chunk: AiChatStreamChunk) => void): () => void {
  return window.electron.chat.onStreamChunk(callback);
}
