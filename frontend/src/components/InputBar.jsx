import { useState, useRef, useEffect } from 'react'
import { useChat } from '../context/ChatContext'

function InputBar() {
  const [input, setInput] = useState('')
  const { sendMessage, isLoading } = useChat()
  const textareaRef = useRef(null)

  // 텍스트 영역 높이 자동 조절
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      sendMessage(input.trim())
      setInput('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="flex items-end gap-3 bg-gray-100 rounded-2xl px-4 py-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            disabled={isLoading}
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-gray-900 placeholder-gray-500 text-sm py-2 max-h-[120px]"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`p-2 rounded-xl transition-colors ${
              input.trim() && !isLoading
                ? 'bg-primary-500 text-white hover:bg-primary-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <svg
                className="w-5 h-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-2">
          Enter로 전송, Shift+Enter로 줄바꿈
        </p>
      </form>
    </div>
  )
}

export default InputBar
