import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useReservation } from '../context/ReservationContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from './Toast';
import ReservationModal from './ReservationModal';
import ReservationDetailModal from './ReservationDetailModal';
import MyReservations from './MyReservations';

export default function RoomReservation() {
  const {
    buildings,
    floors,
    rooms,
    timeSlots,
    reservations,
    myReservations,
    selectedBuilding,
    selectedFloor,
    selectedDate,
    selectedTimeSlots,
    selectedRoom,
    selectedParticipants,
    employeeSchedules,
    selectBuilding,
    selectFloor,
    setSelectedDate,
    selectTimeRange,
    clearSelection,
    findOptimalTimes,
    moveReservation,
  } = useReservation();

  const { isDark, toggleTheme } = useTheme();
  const toast = useToast();

  const [showModal, setShowModal] = useState(false);
  const [showMyReservations, setShowMyReservations] = useState(false);
  const [viewingReservation, setViewingReservation] = useState(null);
  const [viewingRoom, setViewingRoom] = useState(null);
  const [showAvailability, setShowAvailability] = useState(true); // 참석자 가용시간 표시 여부
  const [meetingDuration, setMeetingDuration] = useState(60); // 회의 시간 (분)
  const [showShortcutHelp, setShowShortcutHelp] = useState(false); // 단축키 도움말

  // 드래그 상태
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null); // { roomId, slotIndex }
  const [dragEnd, setDragEnd] = useState(null);

  // 컨텍스트 메뉴 상태
  const [contextMenu, setContextMenu] = useState(null); // { x, y, roomId, slotIndex, slot, status, room, reservation }

  // 리사이즈 드래그 상태
  const [isResizing, setIsResizing] = useState(false);
  const [resizeEdge, setResizeEdge] = useState(null); // 'start' | 'end'

  // 예약 이동 드래그 상태
  const [movingReservation, setMovingReservation] = useState(null); // { reservation, roomId, startSlotIndex }
  const [moveTargetSlot, setMoveTargetSlot] = useState(null); // { roomId, slotIndex }

  // 미니맵 상태
  const [viewportPosition, setViewportPosition] = useState({ left: 0, width: 100 });

  const scrollContainerRef = useRef(null);
  const minimapRef = useRef(null);

  // 선택된 참석자들의 바쁜 시간대 계산
  const participantBusySlots = useMemo(() => {
    if (!showAvailability || selectedParticipants.length === 0) return new Set();

    const busySlots = new Set();
    selectedParticipants.forEach(participant => {
      const schedule = employeeSchedules[participant.id] || [];
      schedule
        .filter(s => s.date === selectedDate)
        .forEach(s => {
          // 시작/종료 시간을 10분 단위 슬롯으로 변환
          const startMin = timeToMinutes(s.startTime);
          const endMin = timeToMinutes(s.endTime);
          for (let t = startMin; t < endMin; t += 10) {
            const h = Math.floor(t / 60);
            const m = t % 60;
            busySlots.add(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
          }
        });
    });
    return busySlots;
  }, [showAvailability, selectedParticipants, employeeSchedules, selectedDate]);

  // 최적 시간 추천
  const optimalTimes = useMemo(() => {
    if (selectedParticipants.length === 0) return [];
    const participantIds = selectedParticipants.map(p => p.id);
    return findOptimalTimes(participantIds, selectedDate, meetingDuration);
  }, [selectedParticipants, selectedDate, meetingDuration, findOptimalTimes]);

  // 시간 -> 분 변환 헬퍼
  function timeToMinutes(time) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  const getSlotStatus = (roomId, timeSlot) => {
    if (reservations[roomId]?.[timeSlot]) {
      return 'reserved';
    }
    if (selectedTimeSlots.find(s => s.roomId === roomId && s.timeSlot === timeSlot)) {
      return 'selected';
    }
    return 'available';
  };

  // 참석자 바쁜 시간대 여부 확인
  const isParticipantBusy = (timeSlot) => {
    return participantBusySlots.has(timeSlot);
  };

  // 추천 시간 적용
  const applyOptimalTime = (startTime, endTime, roomId) => {
    if (!roomId && rooms.length > 0) {
      roomId = rooms[0].id;
    }
    if (roomId) {
      selectTimeRange(roomId, startTime, endTime);
    }
  };

  // 컨텍스트 메뉴 열기
  const handleContextMenu = (e, roomId, slotIndex, room) => {
    e.preventDefault();
    const slot = timeSlots[slotIndex];
    const status = getSlotStatus(roomId, slot);
    const reservation = reservations[roomId]?.[slot];

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      roomId,
      slotIndex,
      slot,
      status,
      room,
      reservation,
    });
  };

  // 컨텍스트 메뉴 닫기
  const closeContextMenu = () => setContextMenu(null);

  // 컨텍스트 메뉴 - 시간 선택 (duration: 분)
  const handleSelectDuration = (duration) => {
    if (!contextMenu) return;
    const { roomId, slotIndex } = contextMenu;
    const slotsNeeded = Math.ceil(duration / 10);
    const endIdx = Math.min(slotIndex + slotsNeeded - 1, timeSlots.length - 1);
    selectTimeRange(roomId, timeSlots[slotIndex], timeSlots[endIdx]);
    closeContextMenu();
  };

  // 컨텍스트 메뉴 - 정시까지 선택
  const handleSelectToNextHour = () => {
    if (!contextMenu) return;
    const { roomId, slotIndex, slot } = contextMenu;
    const currentMin = parseInt(slot.split(':')[1]);
    const slotsToHour = currentMin === 0 ? 6 : Math.ceil((60 - currentMin) / 10);
    const endIdx = Math.min(slotIndex + slotsToHour - 1, timeSlots.length - 1);
    selectTimeRange(roomId, timeSlots[slotIndex], timeSlots[endIdx]);
    closeContextMenu();
  };

  // 전역 클릭으로 컨텍스트 메뉴 닫기
  useEffect(() => {
    if (contextMenu) {
      const handleClick = () => closeContextMenu();
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  // 예약 생성 가능 여부
  const canCreateReservation = selectedTimeSlots.length > 0 && selectedRoom;

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 입력 필드에서는 단축키 비활성화
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        if (e.key === 'Escape') {
          e.target.blur();
        }
        return;
      }

      switch (e.key) {
        case 'Escape':
          // Esc: 모달 닫기 또는 선택 해제
          if (showShortcutHelp) {
            setShowShortcutHelp(false);
          } else if (showModal) {
            setShowModal(false);
          } else if (showMyReservations) {
            setShowMyReservations(false);
          } else if (viewingReservation) {
            setViewingReservation(null);
            setViewingRoom(null);
          } else if (contextMenu) {
            closeContextMenu();
          } else if (selectedTimeSlots.length > 0) {
            clearSelection();
          }
          break;

        case 'Enter':
          // Enter: 예약 모달 열기 (선택된 슬롯이 있을 때)
          if (!showModal && !showMyReservations && !viewingReservation && canCreateReservation) {
            e.preventDefault();
            setShowModal(true);
          }
          break;

        case 'Delete':
        case 'Backspace':
          // Delete/Backspace: 선택 해제
          if (!showModal && !showMyReservations && !viewingReservation && selectedTimeSlots.length > 0) {
            e.preventDefault();
            clearSelection();
          }
          break;

        case 'ArrowLeft':
          // 왼쪽 화살표: 이전 날짜
          if (!showModal && !showMyReservations && !viewingReservation) {
            e.preventDefault();
            const prevDate = new Date(selectedDate);
            prevDate.setDate(prevDate.getDate() - 1);
            setSelectedDate(prevDate.toISOString().split('T')[0]);
          }
          break;

        case 'ArrowRight':
          // 오른쪽 화살표: 다음 날짜
          if (!showModal && !showMyReservations && !viewingReservation) {
            e.preventDefault();
            const nextDate = new Date(selectedDate);
            nextDate.setDate(nextDate.getDate() + 1);
            setSelectedDate(nextDate.toISOString().split('T')[0]);
          }
          break;

        case 't':
        case 'T':
          // T: 오늘로 이동
          if (!showModal && !showMyReservations && !viewingReservation) {
            e.preventDefault();
            setSelectedDate(new Date().toISOString().split('T')[0]);
          }
          break;

        case 'm':
        case 'M':
          // M: 내 예약 열기/닫기
          if (!showModal && !viewingReservation) {
            e.preventDefault();
            setShowMyReservations(!showMyReservations);
          }
          break;

        case '?':
          // ?: 단축키 도움말
          e.preventDefault();
          setShowShortcutHelp(!showShortcutHelp);
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    showModal,
    showMyReservations,
    viewingReservation,
    showShortcutHelp,
    contextMenu,
    selectedTimeSlots,
    selectedDate,
    canCreateReservation,
    clearSelection,
    setSelectedDate,
  ]);

  // 드래그 범위 내 슬롯인지 확인
  const isInDragRange = (roomId, slotIndex) => {
    if (!isDragging || !dragStart || dragStart.roomId !== roomId) return false;
    const endIndex = dragEnd?.slotIndex ?? dragStart.slotIndex;
    const minIdx = Math.min(dragStart.slotIndex, endIndex);
    const maxIdx = Math.max(dragStart.slotIndex, endIndex);
    return slotIndex >= minIdx && slotIndex <= maxIdx;
  };

  // 마우스 다운 - 드래그 시작
  const handleMouseDown = (roomId, slotIndex, room) => {
    const slot = timeSlots[slotIndex];
    const status = getSlotStatus(roomId, slot);

    // 예약된 슬롯 클릭 시 상세 모달 표시
    if (status === 'reserved') {
      const reservation = reservations[roomId][slot];
      setViewingReservation(reservation);
      setViewingRoom(room);
      return;
    }

    // 다른 곳 클릭 시 이전 선택 초기화
    clearSelection();

    setIsDragging(true);
    setDragStart({ roomId, slotIndex });
    setDragEnd({ roomId, slotIndex });
  };

  // 마우스 이동 - 드래그 중
  const handleMouseEnter = (roomId, slotIndex) => {
    if (!isDragging || !dragStart) return;

    // 같은 방에서만 드래그 가능
    if (dragStart.roomId !== roomId) return;

    setDragEnd({ roomId, slotIndex });
  };

  // 마우스 업 - 드래그 종료
  const handleMouseUp = useCallback(() => {
    if (!isDragging || !dragStart) {
      setIsDragging(false);
      return;
    }

    const endIndex = dragEnd?.slotIndex ?? dragStart.slotIndex;
    const startSlot = timeSlots[dragStart.slotIndex];
    const endSlot = timeSlots[endIndex];

    // 범위 선택
    selectTimeRange(dragStart.roomId, startSlot, endSlot);

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }, [isDragging, dragStart, dragEnd, timeSlots, selectTimeRange]);

  // 전역 마우스 업 이벤트
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isDragging, handleMouseUp]);

  // 스크롤 위치 추적 (미니맵용)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateViewport = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      const totalWidth = scrollWidth - 128; // 회의실 이름 열 제외
      const visibleWidth = clientWidth - 128;

      if (totalWidth > 0) {
        const left = (scrollLeft / totalWidth) * 100;
        const width = (visibleWidth / totalWidth) * 100;
        setViewportPosition({ left: Math.max(0, left), width: Math.min(100, width) });
      }
    };

    updateViewport();
    container.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);

    return () => {
      container.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
    };
  }, [rooms, selectedFloor]);

  // 미니맵 클릭으로 스크롤
  const handleMinimapClick = (e) => {
    const minimap = minimapRef.current;
    const container = scrollContainerRef.current;
    if (!minimap || !container) return;

    const rect = minimap.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercent = clickX / rect.width;

    const totalScrollWidth = container.scrollWidth - 128;
    const targetScroll = clickPercent * totalScrollWidth - (container.clientWidth - 128) / 2;

    container.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
  };

  // 선택 영역의 시작/끝 슬롯 인덱스
  const selectedSlotRange = useMemo(() => {
    if (selectedTimeSlots.length === 0 || !selectedRoom) return null;

    const indices = selectedTimeSlots
      .filter(s => s.roomId === selectedRoom)
      .map(s => timeSlots.indexOf(s.timeSlot))
      .filter(i => i >= 0)
      .sort((a, b) => a - b);

    if (indices.length === 0) return null;
    return { start: indices[0], end: indices[indices.length - 1] };
  }, [selectedTimeSlots, selectedRoom, timeSlots]);

  // 리사이즈 시작
  const handleResizeStart = (edge, e) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeEdge(edge);
  };

  // 리사이즈 중 마우스 이동
  const handleResizeMove = useCallback((roomId, slotIndex) => {
    if (!isResizing || !selectedSlotRange || roomId !== selectedRoom) return;

    const { start, end } = selectedSlotRange;
    let newStart = start;
    let newEnd = end;

    if (resizeEdge === 'start') {
      newStart = Math.min(slotIndex, end);
    } else if (resizeEdge === 'end') {
      newEnd = Math.max(slotIndex, start);
    }

    if (newStart !== start || newEnd !== end) {
      selectTimeRange(roomId, timeSlots[newStart], timeSlots[newEnd]);
    }
  }, [isResizing, selectedSlotRange, selectedRoom, resizeEdge, timeSlots, selectTimeRange]);

  // 리사이즈 종료
  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setResizeEdge(null);
  }, []);

  // 리사이즈 전역 마우스 업
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mouseup', handleResizeEnd);
      return () => window.removeEventListener('mouseup', handleResizeEnd);
    }
  }, [isResizing, handleResizeEnd]);

  // 슬롯이 선택 영역의 가장자리인지 확인
  const getSlotEdge = (roomId, slotIndex) => {
    if (!selectedSlotRange || roomId !== selectedRoom) return null;
    if (slotIndex === selectedSlotRange.start) return 'start';
    if (slotIndex === selectedSlotRange.end) return 'end';
    return null;
  };

  // 예약 이동 시작 (내 예약만)
  const handleReservationDragStart = (reservation, roomId, slotIndex, e) => {
    if (!reservation.isMyReservation) return;
    e.stopPropagation();

    // 예약의 슬롯 개수 계산
    const startIdx = timeSlots.indexOf(reservation.startTime);
    const endTime = reservation.endTime;
    let endIdx = timeSlots.findIndex(s => s === endTime);
    if (endIdx < 0) {
      // endTime이 슬롯에 없으면 계산
      const [eh, em] = endTime.split(':').map(Number);
      const endMinutes = eh * 60 + em;
      endIdx = timeSlots.findIndex(s => {
        const [sh, sm] = s.split(':').map(Number);
        return sh * 60 + sm >= endMinutes;
      }) - 1;
    }
    const slotCount = endIdx - startIdx;

    setMovingReservation({
      reservation,
      roomId,
      startSlotIndex: slotIndex,
      slotCount,
    });
    setMoveTargetSlot({ roomId, slotIndex });
  };

  // 예약 이동 중
  const handleReservationDragMove = useCallback((roomId, slotIndex) => {
    if (!movingReservation) return;
    setMoveTargetSlot({ roomId, slotIndex });
  }, [movingReservation]);

  // 예약 이동 완료
  const handleReservationDragEnd = useCallback(async () => {
    if (!movingReservation || !moveTargetSlot) {
      setMovingReservation(null);
      setMoveTargetSlot(null);
      return;
    }

    const { reservation, slotCount } = movingReservation;
    const { roomId: targetRoomId, slotIndex: targetSlotIndex } = moveTargetSlot;

    // 같은 위치면 무시
    const originalStartIdx = timeSlots.indexOf(reservation.startTime);
    if (targetRoomId === movingReservation.roomId && targetSlotIndex === originalStartIdx) {
      setMovingReservation(null);
      setMoveTargetSlot(null);
      return;
    }

    // 새 시간 계산
    const newStartTime = timeSlots[targetSlotIndex];
    const newEndIdx = Math.min(targetSlotIndex + slotCount, timeSlots.length - 1);
    const newEndTime = timeSlots[newEndIdx] || timeSlots[timeSlots.length - 1];

    // 충돌 체크
    for (let i = targetSlotIndex; i <= newEndIdx; i++) {
      const slot = timeSlots[i];
      const existing = reservations[targetRoomId]?.[slot];
      if (existing && existing.id !== reservation.id) {
        toast.error('해당 시간에 다른 예약이 있습니다.');
        setMovingReservation(null);
        setMoveTargetSlot(null);
        return;
      }
    }

    // 예약 이동
    if (moveReservation) {
      const result = await moveReservation(reservation.id, targetRoomId, newStartTime, newEndTime);
      if (result.success) {
        toast.success('예약이 이동되었습니다.');
      } else {
        toast.error(result.error || '예약 이동에 실패했습니다.');
      }
    }

    setMovingReservation(null);
    setMoveTargetSlot(null);
  }, [movingReservation, moveTargetSlot, timeSlots, reservations, moveReservation, toast]);

  // 예약 이동 취소 (마우스 업)
  useEffect(() => {
    if (movingReservation) {
      window.addEventListener('mouseup', handleReservationDragEnd);
      return () => window.removeEventListener('mouseup', handleReservationDragEnd);
    }
  }, [movingReservation, handleReservationDragEnd]);

  // 이동 미리보기 범위 계산
  const getMovePreviewRange = (roomId) => {
    if (!movingReservation || !moveTargetSlot || moveTargetSlot.roomId !== roomId) return null;
    const { slotCount } = movingReservation;
    const { slotIndex } = moveTargetSlot;
    return {
      start: slotIndex,
      end: Math.min(slotIndex + slotCount, timeSlots.length - 1),
    };
  };

  // 시간 헤더용 - 정각만 표시
  const hourSlots = timeSlots.filter(slot => slot.endsWith(':00'));

  // 10분 단위로 시간 파싱
  const isHourStart = (slot) => slot.endsWith(':00');

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* 헤더 */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0 transition-colors">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">회의실 예약</h1>
          <div className="flex items-center gap-2">
            {/* 다크 모드 토글 */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={isDark ? '라이트 모드' : '다크 모드'}
            >
              {isDark ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setShowMyReservations(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              내 예약
              {myReservations.length > 0 && (
                <span className="px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                  {myReservations.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">날짜:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">건물:</label>
            <select
              value={selectedBuilding?.id || ''}
              onChange={(e) => {
                const building = buildings.find(b => b.id === e.target.value);
                selectBuilding(building);
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">선택하세요</option>
              {buildings.map(building => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </select>
          </div>

          {selectedBuilding && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">층:</label>
              <select
                value={selectedFloor?.id || ''}
                onChange={(e) => {
                  const floor = floors.find(f => f.id === e.target.value);
                  selectFloor(floor);
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[100px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">선택하세요</option>
                {floors.map(floor => (
                  <option key={floor.id} value={floor.id}>
                    {floor.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {canCreateReservation && (
            <button
              onClick={() => setShowModal(true)}
              className="ml-auto px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              예약하기 ({selectedTimeSlots.length * 10}분)
            </button>
          )}
        </div>

        {/* 참석자 가용시간 & 최적 시간 추천 */}
        {selectedParticipants.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-blue-800">
                  참석자 {selectedParticipants.length}명 선택됨
                </span>
                <label className="flex items-center gap-1.5 text-sm text-blue-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAvailability}
                    onChange={(e) => setShowAvailability(e.target.checked)}
                    className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                  />
                  바쁜 시간 표시
                </label>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-600">회의 시간:</span>
                <select
                  value={meetingDuration}
                  onChange={(e) => setMeetingDuration(Number(e.target.value))}
                  className="px-2 py-1 text-xs border border-blue-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={30}>30분</option>
                  <option value={60}>1시간</option>
                  <option value={90}>1시간 30분</option>
                  <option value={120}>2시간</option>
                </select>
              </div>
            </div>

            {/* 최적 시간 추천 */}
            {optimalTimes.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-blue-600 mb-1.5">추천 시간 (모두 가능):</div>
                <div className="flex flex-wrap gap-2">
                  {optimalTimes.slice(0, 5).map((time, idx) => (
                    <button
                      key={idx}
                      onClick={() => applyOptimalTime(time.startTime, time.endTime, selectedRoom)}
                      className="px-3 py-1.5 text-sm bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-colors flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {time.startTime} - {time.endTime}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {optimalTimes.length === 0 && selectedParticipants.length > 0 && (
              <div className="mt-2 text-xs text-blue-600">
                선택된 시간({meetingDuration}분) 동안 모두 가능한 시간이 없습니다.
              </div>
            )}
          </div>
        )}
      </header>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 overflow-hidden p-6">
        {!selectedBuilding ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="text-lg font-medium">건물을 선택해주세요</p>
              <p className="text-sm mt-1">회의실 현황을 확인할 수 있습니다</p>
            </div>
          </div>
        ) : !selectedFloor ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-lg font-medium">층을 선택해주세요</p>
              <p className="text-sm mt-1">{selectedBuilding.name}의 회의실을 확인합니다</p>
            </div>
          </div>
        ) : rooms.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <p className="text-lg font-medium">해당 층에 회의실이 없습니다</p>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden select-none transition-colors">
            {/* 스크롤 가능한 그리드 영역 */}
            <div className="flex-1 overflow-auto" ref={scrollContainerRef}>
              <div className="inline-block min-w-full">
                {/* 시간 헤더 */}
                <div className="flex sticky top-0 z-20 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <div className="w-32 flex-shrink-0 px-3 py-3 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 sticky left-0 z-30">
                    회의실
                  </div>
                  <div className="flex">
                    {hourSlots.map(hour => (
                      <div
                        key={hour}
                        className="flex-shrink-0 flex items-center justify-center border-r border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
                        style={{ width: '120px' }}
                      >
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{hour}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 회의실 행 */}
                {rooms.map(room => {
                  const movePreview = getMovePreviewRange(room.id);

                  return (
                  <div key={room.id} className="flex border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                    <div className="w-32 flex-shrink-0 px-3 py-2 border-r border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 sticky left-0 z-10">
                      <div className="font-medium text-gray-900 dark:text-white text-sm truncate">{room.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{room.capacity}인</div>
                    </div>
                    <div className="flex">
                      {timeSlots.map((slot, slotIndex) => {
                        const status = getSlotStatus(room.id, slot);
                        const reservation = reservations[room.id]?.[slot];
                        const isHour = isHourStart(slot);
                        const inDragRange = isInDragRange(room.id, slotIndex);
                        const isBusy = showAvailability && isParticipantBusy(slot);
                        const edge = getSlotEdge(room.id, slotIndex);

                        return (
                          <div
                            key={slot}
                            onMouseDown={(e) => {
                              // 리사이즈 핸들 클릭이 아닌 경우에만 일반 드래그 시작
                              if (!e.target.classList.contains('resize-handle')) {
                                handleMouseDown(room.id, slotIndex, room);
                              }
                            }}
                            onMouseEnter={() => {
                              if (movingReservation) {
                                handleReservationDragMove(room.id, slotIndex);
                              } else if (isResizing) {
                                handleResizeMove(room.id, slotIndex);
                              } else {
                                handleMouseEnter(room.id, slotIndex);
                              }
                            }}
                            onContextMenu={(e) => handleContextMenu(e, room.id, slotIndex, room)}
                            className={`flex-shrink-0 w-5 h-10 cursor-pointer transition-colors relative ${
                              isHour ? 'border-l border-gray-200 dark:border-gray-600' : 'border-l border-gray-100 dark:border-gray-700'
                            } ${
                              // 이동 미리보기
                              movePreview && slotIndex >= movePreview.start && slotIndex <= movePreview.end
                                ? 'bg-green-400 dark:bg-green-500'
                                : status === 'reserved'
                                ? reservation?.isMyReservation
                                  ? 'bg-purple-200 dark:bg-purple-700 hover:bg-purple-300 dark:hover:bg-purple-600 cursor-move'
                                  : 'bg-red-200 dark:bg-red-700 hover:bg-red-300 dark:hover:bg-red-600 cursor-pointer'
                                : status === 'selected'
                                ? 'bg-blue-500 dark:bg-blue-600'
                                : inDragRange
                                ? 'bg-blue-300 dark:bg-blue-400'
                                : isBusy
                                ? 'bg-orange-100 dark:bg-orange-900 hover:bg-orange-200 dark:hover:bg-orange-800'
                                : 'hover:bg-blue-100 dark:hover:bg-blue-900'
                            }`}
                            title={`${slot} - ${reservation ? `${reservation.title} (${reservation.organizer})${reservation.isMyReservation ? ' - 드래그하여 이동' : ''}` : isBusy ? '참석자 일정 있음' : '예약 가능'}`}
                          >
                            {/* 내 예약 드래그 시작 */}
                            {status === 'reserved' && reservation?.isMyReservation && (
                              <div
                                className="absolute inset-0 z-5"
                                onMouseDown={(e) => handleReservationDragStart(reservation, room.id, slotIndex, e)}
                              />
                            )}
                            {/* 바쁜 시간대 표시 패턴 */}
                            {isBusy && status === 'available' && !inDragRange && (
                              <div className="absolute inset-0 opacity-50" style={{
                                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(251, 146, 60, 0.3) 2px, rgba(251, 146, 60, 0.3) 4px)'
                              }} />
                            )}
                            {/* 리사이즈 핸들 - 선택 영역 가장자리 */}
                            {status === 'selected' && edge === 'start' && (
                              <div
                                className="resize-handle absolute left-0 top-0 bottom-0 w-1.5 bg-blue-700 cursor-ew-resize hover:bg-blue-800 z-10"
                                onMouseDown={(e) => handleResizeStart('start', e)}
                              />
                            )}
                            {status === 'selected' && edge === 'end' && (
                              <div
                                className="resize-handle absolute right-0 top-0 bottom-0 w-1.5 bg-blue-700 cursor-ew-resize hover:bg-blue-800 z-10"
                                onMouseDown={(e) => handleResizeStart('end', e)}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

            {/* 미니맵 */}
            <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 w-16">미니맵</span>
                <div
                  ref={minimapRef}
                  onClick={handleMinimapClick}
                  className="flex-1 h-6 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 relative cursor-pointer overflow-hidden"
                >
                  {/* 시간 눈금 */}
                  {hourSlots.map((hour, idx) => (
                    <div
                      key={hour}
                      className="absolute top-0 bottom-0 border-l border-gray-200 dark:border-gray-600"
                      style={{ left: `${(idx / hourSlots.length) * 100}%` }}
                    >
                      {idx % 2 === 0 && (
                        <span className="absolute -top-0.5 left-0.5 text-[8px] text-gray-400 dark:text-gray-500">{hour.split(':')[0]}</span>
                      )}
                    </div>
                  ))}

                  {/* 모든 회의실의 예약 표시 */}
                  {rooms.map((room, roomIdx) => (
                    <div key={room.id} className="absolute inset-0">
                      {Object.entries(reservations[room.id] || {}).map(([slot, res]) => {
                        const slotIdx = timeSlots.indexOf(slot);
                        if (slotIdx < 0) return null;
                        // 예약의 첫 슬롯만 표시
                        const prevSlot = timeSlots[slotIdx - 1];
                        if (prevSlot && reservations[room.id]?.[prevSlot]?.id === res.id) return null;

                        // 예약 길이 계산
                        let endIdx = slotIdx;
                        while (endIdx < timeSlots.length - 1 && reservations[room.id]?.[timeSlots[endIdx + 1]]?.id === res.id) {
                          endIdx++;
                        }
                        const startPercent = (slotIdx / timeSlots.length) * 100;
                        const widthPercent = ((endIdx - slotIdx + 1) / timeSlots.length) * 100;
                        const topPercent = (roomIdx / rooms.length) * 100;
                        const heightPercent = 100 / rooms.length;

                        return (
                          <div
                            key={`${room.id}-${slot}`}
                            className="absolute bg-red-300 opacity-70"
                            style={{
                              left: `${startPercent}%`,
                              width: `${widthPercent}%`,
                              top: `${topPercent}%`,
                              height: `${heightPercent}%`,
                            }}
                          />
                        );
                      })}
                    </div>
                  ))}

                  {/* 현재 선택 영역 */}
                  {selectedSlotRange && selectedRoom && (
                    <div
                      className="absolute bg-blue-500 opacity-80"
                      style={{
                        left: `${(selectedSlotRange.start / timeSlots.length) * 100}%`,
                        width: `${((selectedSlotRange.end - selectedSlotRange.start + 1) / timeSlots.length) * 100}%`,
                        top: `${(rooms.findIndex(r => r.id === selectedRoom) / rooms.length) * 100}%`,
                        height: `${100 / rooms.length}%`,
                      }}
                    />
                  )}

                  {/* 뷰포트 인디케이터 */}
                  <div
                    className="absolute top-0 bottom-0 border-2 border-blue-600 bg-blue-100 bg-opacity-30 rounded-sm pointer-events-none"
                    style={{
                      left: `${viewportPosition.left}%`,
                      width: `${viewportPosition.width}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 범례 */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex items-center justify-between transition-colors">
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-500 rounded"></div>
                  <span>가능</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span>선택</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-red-200 dark:bg-red-700 rounded"></div>
                  <span>예약됨</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-purple-200 dark:bg-purple-700 rounded"></div>
                  <span>내 예약</span>
                </div>
                {showAvailability && selectedParticipants.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 bg-orange-100 dark:bg-orange-900 rounded relative overflow-hidden">
                      <div className="absolute inset-0" style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(251, 146, 60, 0.5) 2px, rgba(251, 146, 60, 0.5) 4px)'
                      }} />
                    </div>
                    <span>참석자 바쁨</span>
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <span>드래그: 선택 · 내 예약 드래그: 이동 · 우클릭: 메뉴</span>
                <button
                  onClick={() => setShowShortcutHelp(true)}
                  className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded text-gray-600 dark:text-gray-300 font-mono transition-colors"
                  title="키보드 단축키 (? 키)"
                >
                  ?
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 예약 생성 모달 */}
      {showModal && (
        <ReservationModal onClose={() => setShowModal(false)} />
      )}

      {/* 예약 상세 모달 */}
      {viewingReservation && (
        <ReservationDetailModal
          reservation={viewingReservation}
          room={viewingRoom}
          onClose={() => {
            setViewingReservation(null);
            setViewingRoom(null);
          }}
        />
      )}

      {/* 내 예약 모달 */}
      {showMyReservations && (
        <MyReservations onClose={() => setShowMyReservations(false)} />
      )}

      {/* 컨텍스트 메뉴 */}
      {contextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 메뉴 헤더 */}
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
            <div className="text-xs font-medium text-gray-700">{contextMenu.room.name}</div>
            <div className="text-xs text-gray-500">{contextMenu.slot}</div>
          </div>

          {/* 예약 가능한 슬롯 */}
          {contextMenu.status === 'available' && (
            <>
              <button
                onClick={() => handleSelectDuration(30)}
                className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-blue-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                30분 선택
              </button>
              <button
                onClick={() => handleSelectDuration(60)}
                className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-blue-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                1시간 선택
              </button>
              <button
                onClick={() => handleSelectDuration(120)}
                className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-blue-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                2시간 선택
              </button>
              <button
                onClick={handleSelectToNextHour}
                className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-blue-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                정시까지 선택
              </button>
              <div className="border-t border-gray-100 my-1" />
              {selectedParticipants.length > 0 && optimalTimes.length > 0 && (
                <div className="px-3 py-2">
                  <div className="text-xs text-gray-500 mb-1">추천 시간:</div>
                  {optimalTimes.slice(0, 3).map((time, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        applyOptimalTime(time.startTime, time.endTime, contextMenu.roomId);
                        closeContextMenu();
                      }}
                      className="w-full px-2 py-1 text-xs text-left text-blue-600 hover:bg-blue-50 rounded"
                    >
                      {time.startTime} - {time.endTime}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* 선택된 슬롯 */}
          {contextMenu.status === 'selected' && (
            <>
              <button
                onClick={() => {
                  setShowModal(true);
                  closeContextMenu();
                }}
                className="w-full px-3 py-2 text-sm text-left text-blue-600 hover:bg-blue-50 flex items-center gap-2 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                예약하기
              </button>
              <button
                onClick={() => {
                  clearSelection();
                  closeContextMenu();
                }}
                className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                선택 해제
              </button>
            </>
          )}

          {/* 예약된 슬롯 */}
          {contextMenu.status === 'reserved' && contextMenu.reservation && (
            <>
              <div className="px-3 py-2 border-b border-gray-100">
                <div className="text-sm font-medium text-gray-900">{contextMenu.reservation.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {contextMenu.reservation.startTime} - {contextMenu.reservation.endTime}
                </div>
                <div className="text-xs text-gray-500">
                  주관: {contextMenu.reservation.organizer}
                </div>
              </div>
              <button
                onClick={() => {
                  setViewingReservation(contextMenu.reservation);
                  setViewingRoom(contextMenu.room);
                  closeContextMenu();
                }}
                className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                상세 보기
              </button>
              {contextMenu.reservation.isMyReservation && (
                <button
                  onClick={() => {
                    // 내 예약 편집으로 이동
                    setShowMyReservations(true);
                    closeContextMenu();
                  }}
                  className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  내 예약 관리
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* 키보드 단축키 도움말 모달 */}
      {showShortcutHelp && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowShortcutHelp(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">키보드 단축키</h2>
              <button
                onClick={() => setShowShortcutHelp(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-3">
                <ShortcutRow keys={['Esc']} description="모달 닫기 / 선택 해제" />
                <ShortcutRow keys={['Enter']} description="예약하기 (시간 선택 시)" />
                <ShortcutRow keys={['Delete']} description="선택 해제" />
                <div className="border-t border-gray-100 my-3" />
                <ShortcutRow keys={['←']} description="이전 날짜" />
                <ShortcutRow keys={['→']} description="다음 날짜" />
                <ShortcutRow keys={['T']} description="오늘로 이동" />
                <div className="border-t border-gray-100 my-3" />
                <ShortcutRow keys={['M']} description="내 예약 열기/닫기" />
                <ShortcutRow keys={['?']} description="단축키 도움말" />
              </div>
            </div>
            <div className="px-6 py-3 bg-gray-50 rounded-b-xl border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center">
                입력 필드에서는 단축키가 비활성화됩니다
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 단축키 행 컴포넌트
function ShortcutRow({ keys, description }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1">
        {keys.map((key, idx) => (
          <kbd
            key={idx}
            className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono text-gray-700 min-w-[28px] text-center"
          >
            {key}
          </kbd>
        ))}
      </div>
      <span className="text-sm text-gray-600">{description}</span>
    </div>
  );
}
