import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useChat } from '../context/ChatContext';
import { useReservation } from '../context/ReservationContext';
import TypingIndicator from './TypingIndicator';
import { parseUserIntent, executeFunctions, formatFunctionResults } from '../services/functionCalling';

const STORAGE_KEY = 'floating_chat_position';

// 기본 위치 (오른쪽 하단, 미니맵 위)
const DEFAULT_POSITION = { right: 24, bottom: 72 }; // right-6, bottom-[72px] (미니맵 h-12 + 여유 공간)

// 엔티티 매칭 유틸
const extractActions = (text, { buildings, employees, allRooms }) => {
  const actions = [];

  // 건물 매칭
  buildings.forEach(building => {
    if (text.includes(building.name)) {
      actions.push({
        type: 'building',
        label: `건물: ${building.name}`,
        data: building,
      });
    }
  });

  // 층 매칭
  const floorMatch = text.match(/(\d)층/g);
  if (floorMatch) {
    floorMatch.forEach(f => {
      actions.push({
        type: 'floor',
        label: `층: ${f}`,
        data: f,
      });
    });
  }

  // 회의실 매칭
  allRooms.forEach(room => {
    if (text.includes(room.name)) {
      actions.push({
        type: 'room',
        label: `회의실: ${room.name}`,
        data: room,
      });
    }
  });

  // 직원 매칭
  employees.forEach(emp => {
    if (text.includes(emp.name)) {
      actions.push({
        type: 'participant',
        label: `참여자: ${emp.name}`,
        data: emp,
      });
    }
  });

  // 시간 매칭 (예: 14:00 ~ 15:00, 오후 2시)
  const timeRangeMatch = text.match(/(\d{1,2}):?(\d{2})?\s*[~\-부터]\s*(\d{1,2}):?(\d{2})?/);
  if (timeRangeMatch) {
    const startHour = parseInt(timeRangeMatch[1]);
    const startMin = timeRangeMatch[2] ? parseInt(timeRangeMatch[2]) : 0;
    const endHour = parseInt(timeRangeMatch[3]);
    const endMin = timeRangeMatch[4] ? parseInt(timeRangeMatch[4]) : 0;
    const startTime = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
    actions.push({
      type: 'time',
      label: `시간: ${startTime} ~ ${endTime}`,
      data: { startTime, endTime },
    });
  }

  return actions;
};

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
  const [position, setPosition] = useState(() => loadPosition() || DEFAULT_POSITION);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatRef = useRef(null);

  const { messages, isLoading, sendMessage, clearMessages } = useChat();
  const reservation = useReservation();
  const [appliedActions, setAppliedActions] = useState(new Set());

  // 액션 추출 헬퍼 데이터
  const entityData = useMemo(() => ({
    buildings: reservation.buildings,
    employees: reservation.employees,
    allRooms: reservation.allRooms,
  }), [reservation.buildings, reservation.employees, reservation.allRooms]);

  // Function Calling 컨텍스트
  const functionContext = useMemo(() => ({
    buildings: reservation.buildings,
    employees: reservation.employees,
    allRooms: reservation.allRooms,
  }), [reservation.buildings, reservation.employees, reservation.allRooms]);

  // 액션 적용 핸들러
  const handleApplyAction = useCallback((action, msgIdx) => {
    const key = `${msgIdx}_${action.type}_${action.label}`;
    if (appliedActions.has(key)) return;

    switch (action.type) {
      case 'building':
        reservation.setBuildingByName(action.data.name);
        break;
      case 'floor':
        const floorNum = action.data.replace('층', '');
        reservation.setFloorByName(`${floorNum}층`);
        break;
      case 'room':
        reservation.setRoomByName(action.data.name);
        break;
      case 'participant':
        reservation.toggleParticipant(action.data);
        break;
      case 'time':
        if (reservation.selectedRoom) {
          reservation.setTimeByRange(action.data.startTime, action.data.endTime);
        }
        break;
    }

    setAppliedActions(prev => new Set([...prev, key]));
  }, [reservation, appliedActions]);

  // 최적 시간 찾기
  const handleFindOptimalTimes = useCallback(() => {
    const participantIds = reservation.selectedParticipants.map(p => p.id);
    const optimalTimes = reservation.findOptimalTimes(participantIds, reservation.selectedDate, 60);

    if (optimalTimes.length === 0) {
      const noTimeMsg = {
        role: 'assistant',
        content: `선택된 참여자들(${reservation.selectedParticipants.map(p => p.name).join(', ')})의 일정을 분석한 결과, ${reservation.selectedDate}에 공통으로 가능한 1시간 연속 시간대를 찾지 못했습니다.\n\n다른 날짜를 선택하거나 회의 시간을 줄여보세요.`,
        timestamp: new Date().toISOString(),
      };
      // 직접 메시지 추가 (sendMessage 대신 로컬로 처리)
      setLocalMessages(prev => [...prev, noTimeMsg]);
    } else {
      const timeList = optimalTimes
        .map((t, i) => `${i + 1}. ${t.startTime} ~ ${t.endTime}`)
        .join('\n');

      const optimalMsg = {
        role: 'assistant',
        content: `선택된 참여자들(${reservation.selectedParticipants.map(p => p.name).join(', ')})의 ${reservation.selectedDate} 일정을 분석한 결과, 다음 시간대가 최적입니다:\n\n${timeList}\n\n원하시는 시간대를 선택해주세요.`,
        timestamp: new Date().toISOString(),
        optimalTimes: optimalTimes,
      };
      setLocalMessages(prev => [...prev, optimalMsg]);
    }
  }, [reservation]);

  // 로컬 메시지 (최적 시간 추천 결과 등)
  const [localMessages, setLocalMessages] = useState([]);
  const allMessages = useMemo(() => [...messages, ...localMessages], [messages, localMessages]);

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
      // 오른쪽 하단 기준으로 오프셋 계산
      setDragOffset({
        x: rect.right - e.clientX,
        y: rect.bottom - e.clientY,
      });
      setIsDragging(true);
    }
  }, []);

  // 드래그 중
  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;

    // 열린 상태: 384x512, 닫힌/최소화 상태: 56x56 (버튼)
    const elementWidth = isOpen && !isMinimized ? 384 : 56;
    const elementHeight = isOpen && !isMinimized ? 512 : 56;

    // 오른쪽 하단 기준으로 위치 계산
    let newRight = window.innerWidth - e.clientX - dragOffset.x;
    let newBottom = window.innerHeight - e.clientY - dragOffset.y;

    // 화면 경계 체크
    newRight = Math.max(0, Math.min(newRight, window.innerWidth - elementWidth));
    newBottom = Math.max(0, Math.min(newBottom, window.innerHeight - elementHeight));

    setPosition({ right: newRight, bottom: newBottom });
  }, [isDragging, dragOffset, isOpen, isMinimized]);

  // 위치가 기본 위치와 다른지 확인
  const isCustomPosition = position.right !== DEFAULT_POSITION.right || position.bottom !== DEFAULT_POSITION.bottom;

  // 드래그 종료
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      savePosition(position);
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

    // 사용자 메시지 추가
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    setLocalMessages(prev => [...prev, userMessage]);

    // Function Calling 의도 파싱
    const functionCalls = parseUserIntent(message, functionContext);

    if (functionCalls.length > 0) {
      // 함수 실행
      const results = await executeFunctions(functionCalls, reservation);
      const responseText = formatFunctionResults(results);

      // 추가 데이터 추출 (최적 시간, 회의실 목록 등)
      const optimalTimes = results.find(r => r.optimalTimes)?.optimalTimes;
      const availableRooms = results.find(r => r.rooms)?.rooms;

      const assistantMessage = {
        role: 'assistant',
        content: responseText || '요청을 처리했습니다.',
        timestamp: new Date().toISOString(),
        optimalTimes,
        availableRooms,
        functionResults: results,
        autoApplied: true, // 함수가 이미 실행되었음을 표시
      };
      setLocalMessages(prev => [...prev, assistantMessage]);
    } else {
      // 백엔드 API 호출 (Function Call이 감지되지 않은 경우)
      // 컨텍스트 정보 구성 (현재 UI 상태)
      const contextInfo = [];
      if (reservation.selectedParticipants.length > 0) {
        contextInfo.push(`참여자: ${reservation.selectedParticipants.map(p => p.name).join(', ')}`);
      }
      if (reservation.selectedBuilding) {
        contextInfo.push(`건물: ${reservation.selectedBuilding.name}`);
      }
      if (reservation.selectedFloor) {
        contextInfo.push(`층: ${reservation.selectedFloor.name}`);
      }
      if (reservation.selectedRoom) {
        const room = reservation.allRooms.find(r => r.id === reservation.selectedRoom);
        if (room) contextInfo.push(`회의실: ${room.name}`);
      }
      if (reservation.selectedTimeSlots.length > 0) {
        const slots = reservation.selectedTimeSlots.map(s => s.timeSlot).sort();
        contextInfo.push(`선택 시간: ${slots[0]} ~ ${addMinutes(slots[slots.length - 1], 10)}`);
      }

      const fullMessage = contextInfo.length > 0
        ? `[현재 상태: ${contextInfo.join(', ')}]\n\n${message}`
        : message;

      // 로컬 메시지 제거하고 API 메시지 사용
      setLocalMessages(prev => prev.filter(m => m !== userMessage));
      await sendMessage(fullMessage);
    }
  };

  // 시간 더하기 헬퍼
  const addMinutes = (time, minutes) => {
    const [h, m] = time.split(':').map(Number);
    const totalMinutes = h * 60 + m + minutes;
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = totalMinutes % 60;
    return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
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
    setPosition(DEFAULT_POSITION);
    localStorage.removeItem(STORAGE_KEY);
  };

  // 오른쪽 하단 기준 스타일 계산
  const getPositionStyle = () => {
    return {
      right: `${position.right}px`,
      bottom: `${position.bottom}px`,
    };
  };

  // 버튼 드래그 핸들러
  const handleButtonMouseDown = (e) => {
    // 우클릭 무시
    if (e.button !== 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    // 오른쪽 하단 기준으로 오프셋 계산
    setDragOffset({
      x: rect.right - e.clientX,
      y: rect.bottom - e.clientY,
    });
    setIsDragging(true);
    e.preventDefault();
  };

  // 플로팅 버튼 (닫힌 상태)
  if (!isOpen) {
    return (
      <div
        className={`fixed w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-50 group ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={getPositionStyle()}
        onMouseDown={handleButtonMouseDown}
        onClick={(e) => {
          // 드래그 후 클릭 방지
          if (!isDragging) toggleOpen();
        }}
      >
        <svg className="w-6 h-6 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        <span className="absolute right-full mr-3 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          AI 어시스턴트
        </span>
        {allMessages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center pointer-events-none">
            {allMessages.length}
          </span>
        )}
      </div>
    );
  }

  // 최소화된 상태
  if (isMinimized) {
    return (
      <div
        className={`fixed bg-white dark:bg-gray-800 rounded-full shadow-lg px-4 py-3 flex items-center gap-3 hover:shadow-xl transition-all z-50 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={getPositionStyle()}
        onMouseDown={handleButtonMouseDown}
        onClick={(e) => {
          if (!isDragging) toggleMinimize(e);
        }}
      >
        <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">AI 어시스턴트</span>
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
      className={`fixed w-96 h-[32rem] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden border border-gray-200 dark:border-gray-700 origin-bottom-right animate-scale-up ${isDragging ? 'select-none' : ''}`}
      style={getPositionStyle()}
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
          {isCustomPosition && (
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
            onClick={() => { clearMessages(); setLocalMessages([]); setAppliedActions(new Set()); }}
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
        {allMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-300 font-medium mb-2">무엇을 도와드릴까요?</p>
            <div className="text-gray-400 dark:text-gray-500 text-xs mb-4 space-y-1 text-left">
              <p>"김철수, 이영희 참석자로 추가해줘"</p>
              <p>"내일 오후 2시~3시 가능한 회의실 찾아줘"</p>
              <p>"최적 시간 추천해줘"</p>
              <p>"내 예약 목록 보여줘"</p>
            </div>
            {reservation.selectedParticipants.length > 0 && (
              <button
                onClick={handleFindOptimalTimes}
                className="px-3 py-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-sm rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                선택된 참여자들의 최적 시간 찾기
              </button>
            )}
          </div>
        ) : (
          <>
            {allMessages.map((msg, idx) => {
              // 이미 자동 적용된 메시지는 "빠른 적용" 버튼 표시 안함
              const actions = (msg.role === 'assistant' && !msg.autoApplied) ? extractActions(msg.content, entityData) : [];
              return (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm border border-gray-100 dark:border-gray-600 rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {/* 최적 시간 선택 버튼 */}
                    {msg.optimalTimes && msg.optimalTimes.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-600">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">시간 선택:</p>
                        <div className="flex flex-wrap gap-1">
                          {msg.optimalTimes.slice(0, 5).map((time, timeIdx) => (
                            <button
                              key={timeIdx}
                              onClick={() => {
                                // 회의실이 있으면 첫 번째 가용 회의실 선택
                                if (time.availableRooms && time.availableRooms.length > 0) {
                                  const room = time.availableRooms[0];
                                  reservation.setRoomByName(room.name);
                                  setTimeout(() => {
                                    reservation.setTimeByRange(time.startTime, time.endTime, room.id);
                                  }, 100);
                                } else if (reservation.selectedRoom) {
                                  reservation.setTimeByRange(time.startTime, time.endTime);
                                } else {
                                  alert('먼저 회의실을 선택해주세요.');
                                }
                              }}
                              className={`px-2 py-1 text-xs rounded-full transition-colors ${
                                time.isAllRequiredAvailable
                                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800'
                                  : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800'
                              }`}
                            >
                              {time.startTime}~{time.endTime}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* 가용 회의실 선택 버튼 */}
                    {msg.availableRooms && msg.availableRooms.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-600">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">회의실 선택:</p>
                        <div className="flex flex-wrap gap-1">
                          {msg.availableRooms.slice(0, 6).map((room, roomIdx) => (
                            <button
                              key={roomIdx}
                              onClick={() => reservation.setRoomByName(room.name)}
                              className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                            >
                              {room.name} ({room.capacity}인)
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* 빠른 적용 버튼 */}
                    {actions.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-600">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">빠른 적용:</p>
                        <div className="flex flex-wrap gap-1">
                          {actions.map((action, actionIdx) => {
                            const key = `${idx}_${action.type}_${action.label}`;
                            const isApplied = appliedActions.has(key);
                            return (
                              <button
                                key={actionIdx}
                                onClick={() => handleApplyAction(action, idx)}
                                disabled={isApplied}
                                className={`px-2 py-1 text-xs rounded-full transition-colors ${
                                  isApplied
                                    ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 cursor-default'
                                    : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800'
                                }`}
                              >
                                {isApplied ? '✓ ' : ''}{action.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-700 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-600">
                  <TypingIndicator />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 입력 영역 */}
      <form onSubmit={handleSubmit} className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요..."
              rows={1}
              className="w-full px-4 py-2.5 pr-12 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
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
