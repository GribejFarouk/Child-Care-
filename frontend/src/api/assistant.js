import { apiClient } from './client';

export const assistantAPI = {
  // GET /api/assistant/conversations/?child_id=...
  getConversations: (childId) => 
    apiClient.get(`/api/assistant/conversations/${childId ? `?child_id=${childId}` : ''}`),

  // GET /api/assistant/conversations/:id/
  getConversation: (id) => 
    apiClient.get(`/api/assistant/conversations/${id}/`),

  // POST /api/assistant/chat/
  sendMessage: (data) => 
    apiClient.post('/api/assistant/chat/', data),

  deleteConversation: (id) =>
    apiClient.delete(`/api/assistant/conversations/${id}/`),
};
