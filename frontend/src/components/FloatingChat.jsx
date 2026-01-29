import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '../context/ChatContext';
import { useReservation } from '../context/ReservationContext';
import TypingIndicator from './TypingIndicator';

const STORAGE_KEY = 'floating_chat_position';

// localStorage에서 위치 불러오기
const loadPosition = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load chat position:', e);
  }
  return null;
};

// localStorage에 위치 저장
const savePosition = (position) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  } catch (e) {
    console.error('Failed to save chat position:', e);
  }
};

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [position, setPosition] = useState(() => loadPosition() || { x: null, y: null });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatRef = useRef(null);

  const { messages, isLoading, sendMessage, clearMessages } = useChat();
  const reservation = useReservation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  // 드래그 시작
  const handleMouseDown = useCallback((e) => {
    if (chatRef.current) {
      const rect = chatRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  }, []);

  // 드래그 중
  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;

    const chatWidth = 384; // w-96 = 24rem = 384px
    const chatHeight = 512; // h-[32rem] = 512px

    let newX = e.clientX - dragOffset.x;
    let newY = e.clientY - dragOffset.y;

    // 화면 경계 체크
    const maxX = window.innerWidth - chatWidth;
    const maxY = window.innerHeight - chatHeight;

    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));

    setPosition({ x: newX, y: newY });
  }, [isDragging, dragOffset]);

  // 드래그 종료
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      if (position.x !== null && position.y !== null) {
        savePosition(position);
      }
    }
  }, [isDragging, position]);

  // 전역 마우스 이벤트 등록
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue('');

    const context = {
      selectedParticipants: reservation.selectedParticipants.map(p => p.name),
      selectedBuilding: reservation.selectedBuilding?.name,
      selectedFloor: reservation.selectedFloor?.name,
      selectedDate: reservation.selectedDate,
    };

    await sendMessage(message, context);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleOpen = () => {
    if (isMinimized) {
      setIsMinimized(false);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const toggleMinimize = (e) => {
    e.stopPropagation();
    setIsMinimized(!isMinimized);
  };

  // 위치 초기화 (기본 위치로)
  const resetPosition = () => {
    setPosition({ x: null, y: null });
    localStorage.removeItem(STORAGE_KEY);
  };

  // 채팅창 스타일 계산
  const getChatStyle = () => {
    if (position.x !== null && position.y !== null) {
      return {
        left: `${position.x}px`,
        top: `${position.y}px`,
        right: 'auto',
        bottom: 'auto',
      };
    }
    return {};
  };

  // 플로팅 버튼 (닫힌 상태)
  if (!isOpen) {
    return (
      <button
        onClick={toggleOpen}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-50 group"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        <span className="absolute right-full mr-3 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          AI 어시스턴트
        </span>
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {messages.length}
          </span>
        )}
      </button>
    );
  }

  // 최소화된 상태
  if (isMinimized) {
    return (
      <div
        onClick={toggleMinimize}
        className="fixed bottom-6 right-6 bg-white rounded-full shadow-lg px-4 py-3 flex items-center gap-3 cursor-pointer hover:shadow-xl transition-all z-50"
      >
        <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <span className="text-sm font-medium text-gray-700">AI 어시스턴트</span>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </div>
    );
  }

  // 열린 상태 - 채팅창
  return (
    <div
      ref={chatRef}
      className={`fixed w-96 h-[32rem] bg-white rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden border border-gray-200 ${
        position.x === null ? 'bottom-6 right-6' : ''
      } ${isDragging ? 'select-none' : ''}`}
      style={getChatStyle()}
    >
      {/* 헤더 - 드래그 가능 */}
      <div
        className={`bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center justify-between ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2 pointer-events-none">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-medium text-sm">AI 어시스턴트</h3>
            <p className="text-blue-100 text-xs">드래그하여 이동</p>
          </div>
        </div>
        <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
          {position.x !== null && (
            <button
              onClick={resetPosition}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              title="위치 초기화"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
          <button
            onClick={clearMessages}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            title="대화 초기화"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button
            onClick={toggleMinimize}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            title="최소화"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            title="닫기"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium mb-2">무엇을 도와드릴까요?</p>
            <p className="text-gray-400 text-sm">
              예: "김철수, 이영희와 내일 오후 2시에 본관 2층 대회의실 예약해줘"
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100">
                  <TypingIndicator />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 입력 영역 */}
      <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-gray-200">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요..."
              rows={1}
              className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              style={{ maxHeight: '100px' }}
            />
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
