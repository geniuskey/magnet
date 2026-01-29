import OptionCard from './OptionCard'

function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  // 줄바꿈 처리
  const formatContent = (content) => {
    return content.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </span>
    ))
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div className={`flex gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : ''}`}>
        {/* 아바타 */}
        {isAssistant && (
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex-shrink-0 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {/* 메시지 버블 */}
          <div
            className={`message-bubble ${
              isUser ? 'message-bubble-user' : 'message-bubble-assistant'
            }`}
          >
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {formatContent(message.content)}
            </div>
          </div>

          {/* 옵션 카드 (있는 경우) */}
          {message.options && message.options.length > 0 && (
            <div className="space-y-2 mt-1">
              {message.options.map((option, index) => (
                <OptionCard key={index} option={option} index={index} />
              ))}
            </div>
          )}

          {/* 타임스탬프 */}
          <span className={`text-xs text-gray-400 ${isUser ? 'text-right' : ''}`}>
            {formatTime(message.timestamp)}
          </span>
        </div>
      </div>
    </div>
  )
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

export default MessageBubble
