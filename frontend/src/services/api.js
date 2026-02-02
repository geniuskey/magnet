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
 * 스트리밍 채팅 메시지 전송
 * @param {string} message - 사용자 메시지
 * @param {string|null} conversationId - 대화 ID
 * @param {function} onChunk - 청크 수신 콜백
 * @param {function} onDone - 완료 콜백
 * @param {function} onError - 에러 콜백
 */
export async function sendChatMessageStream(message, conversationId, { onChunk, onDone, onError }) {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/stream`, {
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

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let newConversationId = conversationId

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'start') {
              newConversationId = data.conversation_id
            } else if (data.type === 'content') {
              onChunk?.(data.text)
            } else if (data.type === 'tool_call') {
              // 도구 호출 상태 (선택적으로 표시)
            } else if (data.type === 'done') {
              newConversationId = data.conversation_id
            } else if (data.type === 'error') {
              onError?.(new Error(data.message))
              return
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', e)
          }
        }
      }
    }

    onDone?.(newConversationId)
  } catch (error) {
    onError?.(error)
  }
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
