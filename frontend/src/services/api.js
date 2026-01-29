const API_BASE_URL = '/api'

/**
 * 채팅 메시지 전송
 * @param {string} message - 사용자 메시지
 * @param {string|null} conversationId - 대화 ID (새 대화면 null)
 * @returns {Promise<Object>} 응답 객체
 */
export async function sendChatMessage(message, conversationId = null) {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || `HTTP error ${response.status}`)
  }

  return response.json()
}

/**
 * 대화 내역 조회
 * @param {string} conversationId - 대화 ID
 * @returns {Promise<Object>} 대화 내역
 */
export async function getConversation(conversationId) {
  const response = await fetch(`${API_BASE_URL}/chat/conversation/${conversationId}`)

  if (!response.ok) {
    if (response.status === 404) {
      return null
    }
    throw new Error(`HTTP error ${response.status}`)
  }

  return response.json()
}

/**
 * 대화 삭제
 * @param {string} conversationId - 대화 ID
 * @returns {Promise<void>}
 */
export async function deleteConversation(conversationId) {
  const response = await fetch(`${API_BASE_URL}/chat/conversation/${conversationId}`, {
    method: 'DELETE',
  })

  if (!response.ok && response.status !== 404) {
    throw new Error(`HTTP error ${response.status}`)
  }
}

/**
 * 헬스체크
 * @returns {Promise<Object>} 서버 상태
 */
export async function checkHealth() {
  const response = await fetch(`${API_BASE_URL}/health`)

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`)
  }

  return response.json()
}
