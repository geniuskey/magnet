import { useEffect, useRef } from 'react'
import { useChat } from '../context/ChatContext'
import MessageBubble from './MessageBubble'
import InputBar from './InputBar'
import TypingIndicator from './TypingIndicator'
import WelcomeScreen from './WelcomeScreen'

function ChatWindow({ showWelcome, onStartChat }) {
  const { messages, isLoading, error } = useChat()
  const messagesEndRef = useRef(null)

  // 새 메시지 시 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // 메시지가 있으면 웰컴 화면 숨김
  useEffect(() => {
    if (messages.length > 0) {
      onStartChat()
    }
  }, [messages, onStartChat])

  if (showWelcome && messages.length === 0) {
    return <WelcomeScreen onStartChat={onStartChat} />
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)]">
      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((message, index) => (
          <MessageBubble key={index} message={message} />
        ))}

        {isLoading && <TypingIndicator />}

        {error && (
          <div className="flex justify-center">
            <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력 바 */}
      <InputBar />
    </div>
  )
}

export default ChatWindow
