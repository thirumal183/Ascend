/**
 * ASCEND AI Coach Domain API Service
 */

import { apiClient } from './client';

export interface CoachMetricItem {
  label: string;
  current: string;
  target: string;
  status: 'optimal' | 'attention' | 'warning' | 'deficit';
}

export interface CoachSuggestedAction {
  label: string;
  targetTab?: string | null;
}

export interface CoachStructuredInsight {
  title: string;
  summary: string;
  metrics: CoachMetricItem[];
  suggestedAction?: CoachSuggestedAction | null;
  medicalDisclaimer?: string;
}

export interface BackendChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  structuredInsight?: CoachStructuredInsight | null;
  isMockResponse: boolean;
  timestamp: string;
}

export interface AIChatRequestPayload {
  message: string;
  conversationId?: string | null;
}

export interface ConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationDetail {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: BackendChatMessage[];
}

export const aiCoachApi = {
  async sendChatMessage(payload: AIChatRequestPayload): Promise<BackendChatMessage> {
    return apiClient<BackendChatMessage>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async listConversations(): Promise<ConversationSummary[]> {
    return apiClient<ConversationSummary[]>('/ai/conversations');
  },

  async getConversation(conversationId: string): Promise<ConversationDetail> {
    return apiClient<ConversationDetail>(`/ai/conversations/${conversationId}`);
  },

  async deleteConversation(conversationId: string): Promise<void> {
    await apiClient<void>(`/ai/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  },
};
