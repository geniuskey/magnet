import { useChat } from '../context/ChatContext'

function WelcomeScreen({ onStartChat }) {
  const { sendMessage } = useChat()

  const suggestions = [
    {
      icon: '📅',
      title: '회의 예약하기',
      description: '내일 오후에 김철수님과 1시간 회의 잡아줘',
    },
    {
      icon: '👥',
      title: '팀 회의 조율',
      description: '다음 주에 개발팀 전체 회의 가능한 시간 찾아줘',
    },
    {
      icon: '🏢',
      title: '회의실 찾기',
      description: '화상회의 장비 있는 회의실 보여줘',
    },
    {
      icon: '🔍',
      title: '일정 확인',
      description: '이번 주 내 일정 보여줘',
    },
  ]

  const handleSuggestionClick = (suggestion) => {
    sendMessage(suggestion.description)
    onStartChat()
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      {/* 로고 및 인사 */}
      <div className="w-20 h-20 bg-primary-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
        <svg
          className="w-12 h-12 text-white"
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

      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        안녕하세요! 회의봇입니다 👋
      </h2>
      <p className="text-gray-500 text-center mb-8 max-w-md">
        회의 일정 조율을 도와드릴게요. 참석자, 시간, 회의실까지 한 번에 해결해 드립니다.
      </p>

      {/* 추천 질문 */}
      <div className="w-full max-w-2xl">
        <p className="text-sm text-gray-500 mb-3 text-center">이렇게 시작해 보세요</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-all text-left group"
            >
              <span className="text-2xl">{suggestion.icon}</span>
              <div>
                <p className="font-medium text-gray-900 group-hover:text-primary-700">
                  {suggestion.title}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  "{suggestion.description}"
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default WelcomeScreen
