import { useState, useCallback, useEffect } from 'react'
import { sendChatMessage, getConversation } from '../services/api'

/**
 * 채팅 기능을 위한 커스텀 훅
 * (ChatContext 대안으로 사용 가능)
 */
export function useChat() {
  const [messages, setMessages] = useState([])
  const [conversationId, setConversationId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('idle')

  // 저장된 대화 ID 복원
  useEffect(() => {
    const savedConversationId = localStorage.getItem('conversation_id')
    if (savedConversationId) {
      setConversationId(savedConversationId)
      // 기존 대화 내역 로드
      loadConversation(savedConversationId)
    }
  }, [])

  // 대화 내역 로드
  const loadConversation = async (convId) => {
    try {
      const data = await getConversation(convId)
      if (data && data.messages) {
        setMessages(data.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        })))
        setStatus(data.status)
      }
    } catch (err) {
      console.error('Failed to load conversation:', err)
      // 대화 로드 실패 시 새 대화 시작
      localStorage.removeItem('conversation_id')
      setConversationId(null)
    }
  }

  // 메시지 전송
  const sendMessage = useCallback(async (content) => {
    if (!content.trim()) return

    setError(null)
    setIsLoading(true)

    // 사용자 메시지 추가
    const userMessage = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])

    try {
      const response = await sendChatMessage(content, conversationId)

      // 대화 ID 저장
      if (response.conversation_id) {
        setConversationId(response.conversation_id)
        localStorage.setItem('conversation_id', response.conversation_id)
      }

      // AI 응답 추가
      const assistantMessage = {
        role: 'assistant',
        content: response.response.content,
        options: response.response.options,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMessage])

      // 상태 업데이트
      setStatus(response.status)

    } catch (err) {
      console.error('Chat error:', err)
      setError('메시지 전송에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setIsLoading(false)
    }
  }, [conversationId])

  // 대화 초기화
  const clearConversation = useCallback(() => {
    setMessages([])
    setConversationId(null)
    setError(null)
    setStatus('idle')
    localStorage.removeItem('conversation_id')
  }, [])

  return {
    messages,
    conversationId,
    isLoading,
    error,
    status,
    sendMessage,
    clearConversation,
  }
}

export default useChat
