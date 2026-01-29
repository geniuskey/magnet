import { createContext, useContext, useState, useCallback } from 'react'
import { sendChatMessage } from '../services/api'

const ChatContext = createContext(null)

export function ChatProvider({ children }) {
  const [messages, setMessages] = useState([])
  const [conversationId, setConversationId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('idle')

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

      // 에러 메시지 추가
      const errorMessage = {
        role: 'assistant',
        content: '죄송합니다, 응답을 받아오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [conversationId])

  const clearConversation = useCallback(() => {
    setMessages([])
    setConversationId(null)
    setError(null)
    setStatus('idle')
    localStorage.removeItem('conversation_id')
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  // 저장된 대화 ID 복원
  useState(() => {
    const savedConversationId = localStorage.getItem('conversation_id')
    if (savedConversationId) {
      setConversationId(savedConversationId)
    }
  }, [])

  const value = {
    messages,
    conversationId,
    isLoading,
    error,
    status,
    sendMessage,
    clearConversation,
    clearMessages,
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
