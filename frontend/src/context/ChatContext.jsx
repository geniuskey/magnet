import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { sendChatMessage, sendChatMessageStream } from '../services/api'

const ChatContext = createContext(null)

export function ChatProvider({ children }) {
  const [messages, setMessages] = useState([])
  const [conversationId, setConversationId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('idle')
  const streamingMessageRef = useRef(null)

  const sendMessage = useCallback(async (content, options = {}) => {
    if (!content.trim()) return

    // options.displayContent: UI에 표시할 메시지 (없으면 content 사용)
    // options.skipUserMessage: true면 사용자 메시지 추가 안함
    // options.useStream: 스트리밍 사용 여부 (기본: true)
    const displayContent = options.displayContent || content
    const useStream = options.useStream !== false

    setError(null)
    setIsLoading(true)

    // 사용자 메시지 추가 (skipUserMessage가 아닐 때만)
    if (!options.skipUserMessage) {
      const userMessage = {
        role: 'user',
        content: displayContent,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMessage])
    }

    if (useStream) {
      // 스트리밍 모드
      const streamingId = Date.now().toString()
      streamingMessageRef.current = streamingId

      // 빈 assistant 메시지 추가 (timestamp를 약간 뒤로 밀어 순서 보장)
      const assistantMessage = {
        id: streamingId,
        role: 'assistant',
        content: '',
        timestamp: new Date(Date.now() + 100).toISOString(),  // 100ms 뒤
        isStreaming: true,
      }
      setMessages((prev) => [...prev, assistantMessage])

      await sendChatMessageStream(content, conversationId, {
        onChunk: (text) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === streamingId
                ? { ...msg, content: msg.content + text }
                : msg
            )
          )
        },
        onDone: (newConversationId) => {
          if (newConversationId) {
            setConversationId(newConversationId)
            localStorage.setItem('conversation_id', newConversationId)
          }
          // 스트리밍 완료 표시 제거
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === streamingId
                ? { ...msg, isStreaming: false }
                : msg
            )
          )
          setIsLoading(false)
          streamingMessageRef.current = null
        },
        onError: (err) => {
          console.error('Chat stream error:', err)
          setError('메시지 전송에 실패했습니다. 다시 시도해 주세요.')
          // 에러 메시지로 교체
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === streamingId
                ? {
                    ...msg,
                    content: '죄송합니다, 응답을 받아오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
                    isStreaming: false,
                  }
                : msg
            )
          )
          setIsLoading(false)
          streamingMessageRef.current = null
        },
      })
    } else {
      // 기존 비스트리밍 모드
      try {
        const response = await sendChatMessage(content, conversationId)

        if (response.conversation_id) {
          setConversationId(response.conversation_id)
          localStorage.setItem('conversation_id', response.conversation_id)
        }

        const assistantMessage = {
          role: 'assistant',
          content: response.response.content,
          options: response.response.options,
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, assistantMessage])
        setStatus(response.status)
      } catch (err) {
        console.error('Chat error:', err)
        setError('메시지 전송에 실패했습니다. 다시 시도해 주세요.')

        const errorMessage = {
          role: 'assistant',
          content: '죄송합니다, 응답을 받아오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, errorMessage])
      } finally {
        setIsLoading(false)
      }
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
