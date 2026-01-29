import { useChat } from '../context/ChatContext'

function OptionCard({ option, index }) {
  const { sendMessage } = useChat()

  const handleClick = () => {
    // 옵션 선택 시 해당 번호나 내용으로 메시지 전송
    if (option.display) {
      sendMessage(`${index + 1}번 (${option.display})으로 할게요`)
    } else if (option.name) {
      sendMessage(`${option.name} 선택할게요`)
    } else {
      sendMessage(`${index + 1}번으로 할게요`)
    }
  }

  // 시간 슬롯 옵션
  if (option.start && option.duration_minutes) {
    return (
      <button
        onClick={handleClick}
        className="option-card w-full text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-medium">
              {index + 1}
            </span>
            <div>
              <p className="font-medium text-gray-900">{option.display}</p>
              <p className="text-sm text-gray-500">{option.duration_minutes}분</p>
            </div>
          </div>
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </button>
    )
  }

  // 회의실 옵션
  if (option.name && option.capacity) {
    return (
      <button
        onClick={handleClick}
        className="option-card w-full text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-medium">
              {index + 1}
            </span>
            <div>
              <p className="font-medium text-gray-900">{option.name}</p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{option.location}</span>
                <span>·</span>
                <span>{option.capacity}명</span>
                {option.facilities && option.facilities.length > 0 && (
                  <>
                    <span>·</span>
                    <span>{option.facilities.join(', ')}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </button>
    )
  }

  // 기본 옵션
  return (
    <button
      onClick={handleClick}
      className="option-card w-full text-left"
    >
      <div className="flex items-center gap-3">
        <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-medium">
          {index + 1}
        </span>
        <span className="text-gray-900">{JSON.stringify(option)}</span>
      </div>
    </button>
  )
}

export default OptionCard
