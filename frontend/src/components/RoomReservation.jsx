import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
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
    filteredRooms,
    amenities,
    timeSlots,
    displayTimeSlots,
    timeSlotInterval,
    reservations,
    myReservations,
    selectedBuilding,
    selectedFloors,
    selectedDate,
    selectedTimeSlots,
    selectedRoom,
    selectedParticipants,
    employeeSchedules,
    showAvailability,
    setShowAvailability,
    meetingDuration,
    setMeetingDuration,
    setTimeSlotInterval,
    roomFilters,
    favoriteRooms,
    hiddenRooms,
    toggleFavoriteRoom,
    toggleHiddenRoom,
    selectBuilding,
    toggleFloor,
    setSelectedDate,
    selectTimeRange,
    clearSelection,
    findOptimalTimes,
    moveReservation,
    setRoomFilters,
    scrollTargetTime,
    clearScrollTarget,
  } = useReservation();

  const { isDark, toggleTheme } = useTheme();
  const toast = useToast();

  const [showModal, setShowModal] = useState(false);
  const [showMyReservations, setShowMyReservations] = useState(false);
  const [viewingReservation, setViewingReservation] = useState(null);
  const [viewingRoom, setViewingRoom] = useState(null);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false); // 단축키 도움말

  // 예약 리사이즈 상태
  const [resizingReservation, setResizingReservation] = useState(null);
  // { reservation, roomId, edge: 'start'|'end', originalStartIdx, originalEndIdx }
  const [resizePreviewSlot, setResizePreviewSlot] = useState(null);

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
  const [isMinimapDragging, setIsMinimapDragging] = useState(false);
  const [minimapDragStart, setMinimapDragStart] = useState(null); // { mouseX, scrollLeft }

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
    return findOptimalTimes(meetingDuration);
  }, [selectedParticipants, meetingDuration, findOptimalTimes]);

  // 시간 -> 분 변환 헬퍼
  function timeToMinutes(time) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  // 슬롯 너비 계산 (간격에 따라 - 큰 간격일수록 컴팩트하게)
  const slotWidth = useMemo(() => {
    // 10분: 20px, 30분: 36px, 60분: 48px
    const widthMap = { 10: 20, 30: 36, 60: 48 };
    return widthMap[timeSlotInterval] || 20;
  }, [timeSlotInterval]);

  // displaySlot에 해당하는 내부 슬롯들 가져오기
  const getInternalSlotsForDisplay = useCallback((displaySlot) => {
    const displayIdx = displayTimeSlots.indexOf(displaySlot);
    if (displayIdx < 0) return [displaySlot];

    // 다음 displaySlot의 시작 시간 계산
    const nextDisplaySlot = displayTimeSlots[displayIdx + 1];
    const startMin = timeToMinutes(displaySlot);
    const endMin = nextDisplaySlot ? timeToMinutes(nextDisplaySlot) : startMin + timeSlotInterval;

    // 해당 범위의 내부 슬롯들 반환
    return timeSlots.filter(slot => {
      const slotMin = timeToMinutes(slot);
      return slotMin >= startMin && slotMin < endMin;
    });
  }, [displayTimeSlots, timeSlots, timeSlotInterval]);

  const getSlotStatus = useCallback((roomId, displaySlot) => {
    const internalSlots = getInternalSlotsForDisplay(displaySlot);

    // 범위 내 어떤 슬롯이라도 예약되어 있으면 'reserved'
    if (internalSlots.some(slot => reservations[roomId]?.[slot])) {
      return 'reserved';
    }
    // 범위 내 어떤 슬롯이라도 선택되어 있으면 'selected'
    if (internalSlots.some(slot => selectedTimeSlots.find(s => s.roomId === roomId && s.timeSlot === slot))) {
      return 'selected';
    }
    return 'available';
  }, [getInternalSlotsForDisplay, reservations, selectedTimeSlots]);

  // 참석자 바쁜 시간대 여부 확인
  const isParticipantBusy = useCallback((displaySlot) => {
    const internalSlots = getInternalSlotsForDisplay(displaySlot);
    return internalSlots.some(slot => participantBusySlots.has(slot));
  }, [getInternalSlotsForDisplay, participantBusySlots]);

  // 추천 시간 적용
  const applyOptimalTime = (startTime, endTime, roomId) => {
    if (!roomId && rooms.length > 0) {
      roomId = rooms[0].id;
    }
    if (roomId) {
      // endTime 직전 슬롯 찾기 (endTime은 회의 종료 시간)
      const endIdx = timeSlots.findIndex(s => s >= endTime);
      const lastSlot = endIdx > 0 ? timeSlots[endIdx - 1] : timeSlots[timeSlots.length - 1];
      selectTimeRange(roomId, startTime, lastSlot);

      // 해당 시간대가 중앙에 오도록 스크롤 (DOM 업데이트 후 실행)
      requestAnimationFrame(() => {
        const container = scrollContainerRef.current;
        if (container) {
          const startIdx = displayTimeSlots.indexOf(startTime);
          const roomNameWidth = 128; // w-32 = 128px
          const containerWidth = container.clientWidth;

          // 선택된 시간대의 중앙 위치 계산
          const selectionCenter = startIdx * slotWidth + ((endIdx - startIdx) * slotWidth) / 2;
          // 컨테이너 중앙에 오도록 스크롤 위치 계산 (room name 영역 고려)
          const scrollTarget = selectionCenter - (containerWidth - roomNameWidth) / 2;

          container.scrollTo({
            left: Math.max(0, scrollTarget),
            behavior: 'smooth'
          });
        }
      });
    }
  };

  // 컨텍스트 메뉴 열기 (displaySlotIndex 사용)
  const handleContextMenu = (e, roomId, displaySlotIndex, room) => {
    e.preventDefault();
    const slot = displayTimeSlots[displaySlotIndex];
    const status = getSlotStatus(roomId, slot);
    const internalSlots = getInternalSlotsForDisplay(slot);
    const reservation = internalSlots.map(s => reservations[roomId]?.[s]).find(r => r);

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      roomId,
      slotIndex: displaySlotIndex,
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
    const { roomId, slot } = contextMenu;
    // 시작 슬롯 (내부 슬롯 기준)
    const startSlot = slot;
    const startIdx = timeSlots.indexOf(startSlot);
    const slotsNeeded = Math.ceil(duration / 10);
    const endIdx = Math.min(startIdx + slotsNeeded - 1, timeSlots.length - 1);
    selectTimeRange(roomId, timeSlots[startIdx], timeSlots[endIdx]);
    closeContextMenu();
  };

  // 컨텍스트 메뉴 - 정시까지 선택
  const handleSelectToNextHour = () => {
    if (!contextMenu) return;
    const { roomId, slot } = contextMenu;
    const startIdx = timeSlots.indexOf(slot);
    const currentMin = parseInt(slot.split(':')[1]);
    const slotsToHour = currentMin === 0 ? 6 : Math.ceil((60 - currentMin) / 10);
    const endIdx = Math.min(startIdx + slotsToHour - 1, timeSlots.length - 1);
    selectTimeRange(roomId, timeSlots[startIdx], timeSlots[endIdx]);
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

  // 드래그 범위 내 슬롯인지 확인 (displaySlotIndex 사용)
  const isInDragRange = (roomId, displaySlotIndex) => {
    if (!isDragging || !dragStart || dragStart.roomId !== roomId) return false;
    const endIndex = dragEnd?.slotIndex ?? dragStart.slotIndex;
    const minIdx = Math.min(dragStart.slotIndex, endIndex);
    const maxIdx = Math.max(dragStart.slotIndex, endIndex);
    return displaySlotIndex >= minIdx && displaySlotIndex <= maxIdx;
  };

  // 마우스 다운 - 드래그 시작 (displaySlotIndex 사용)
  const handleMouseDown = (roomId, displaySlotIndex, room) => {
    const slot = displayTimeSlots[displaySlotIndex];
    const status = getSlotStatus(roomId, slot);

    // 예약된 슬롯 클릭 시 상세 모달 표시
    if (status === 'reserved') {
      const internalSlots = getInternalSlotsForDisplay(slot);
      const reservation = internalSlots.map(s => reservations[roomId]?.[s]).find(r => r);
      setViewingReservation(reservation);
      setViewingRoom(room);
      return;
    }

    // 다른 곳 클릭 시 이전 선택 초기화
    clearSelection();

    setIsDragging(true);
    setDragStart({ roomId, slotIndex: displaySlotIndex });
    setDragEnd({ roomId, slotIndex: displaySlotIndex });
  };

  // 마우스 이동 - 드래그 중 (displaySlotIndex 사용)
  const handleMouseEnter = (roomId, displaySlotIndex) => {
    if (!isDragging || !dragStart) return;

    // 같은 방에서만 드래그 가능
    if (dragStart.roomId !== roomId) return;

    setDragEnd({ roomId, slotIndex: displaySlotIndex });
  };

  // 마우스 업 - 드래그 종료
  const handleMouseUp = useCallback(() => {
    if (!isDragging || !dragStart) {
      setIsDragging(false);
      return;
    }

    const endIndex = dragEnd?.slotIndex ?? dragStart.slotIndex;

    // displaySlots에서 범위 찾기
    const startDisplaySlot = displayTimeSlots[dragStart.slotIndex];
    const endDisplaySlot = displayTimeSlots[endIndex];

    // 각 displaySlot의 내부 슬롯 가져오기
    const startInternalSlots = getInternalSlotsForDisplay(startDisplaySlot);
    const endInternalSlots = getInternalSlotsForDisplay(endDisplaySlot);

    // 첫 내부슬롯부터 마지막 내부슬롯까지 선택
    const startSlot = startInternalSlots[0];
    const endSlot = endInternalSlots[endInternalSlots.length - 1];

    // 범위 선택
    selectTimeRange(dragStart.roomId, startSlot, endSlot);

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }, [isDragging, dragStart, dragEnd, displayTimeSlots, getInternalSlotsForDisplay, selectTimeRange]);

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
  }, [filteredRooms, selectedFloors]);

  // 미니맵 클릭으로 스크롤
  const handleMinimapClick = (e) => {
    // 드래그 중이면 클릭 무시
    if (isMinimapDragging) return;

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

  // 미니맵 뷰포트 드래그 시작
  const handleMinimapDragStart = (e) => {
    e.stopPropagation();
    const container = scrollContainerRef.current;
    if (!container) return;

    setIsMinimapDragging(true);
    setMinimapDragStart({
      mouseX: e.clientX,
      scrollLeft: container.scrollLeft,
    });
  };

  // 미니맵 뷰포트 드래그 중
  const handleMinimapDragMove = useCallback((e) => {
    if (!isMinimapDragging || !minimapDragStart) return;

    const minimap = minimapRef.current;
    const container = scrollContainerRef.current;
    if (!minimap || !container) return;

    const rect = minimap.getBoundingClientRect();
    const deltaX = e.clientX - minimapDragStart.mouseX;

    // 미니맵 이동량을 실제 스크롤 이동량으로 변환
    const totalScrollWidth = container.scrollWidth - 128;
    const scrollDelta = (deltaX / rect.width) * totalScrollWidth;

    const newScrollLeft = Math.max(0, Math.min(
      minimapDragStart.scrollLeft + scrollDelta,
      container.scrollWidth - container.clientWidth
    ));

    container.scrollLeft = newScrollLeft;
  }, [isMinimapDragging, minimapDragStart]);

  // 미니맵 뷰포트 드래그 종료
  const handleMinimapDragEnd = useCallback(() => {
    setIsMinimapDragging(false);
    setMinimapDragStart(null);
  }, []);

  // 미니맵 드래그 전역 이벤트
  useEffect(() => {
    if (isMinimapDragging) {
      window.addEventListener('mousemove', handleMinimapDragMove);
      window.addEventListener('mouseup', handleMinimapDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleMinimapDragMove);
        window.removeEventListener('mouseup', handleMinimapDragEnd);
      };
    }
  }, [isMinimapDragging, handleMinimapDragMove, handleMinimapDragEnd]);

  // 선택 영역의 시작/끝 슬롯 인덱스 (displayTimeSlots 기준)
  const selectedSlotRange = useMemo(() => {
    if (selectedTimeSlots.length === 0 || !selectedRoom) return null;

    // 내부 슬롯 인덱스 가져오기
    const internalIndices = selectedTimeSlots
      .filter(s => s.roomId === selectedRoom)
      .map(s => timeSlots.indexOf(s.timeSlot))
      .filter(i => i >= 0)
      .sort((a, b) => a - b);

    if (internalIndices.length === 0) return null;

    // 내부 인덱스를 displayTimeSlots 인덱스로 변환
    const startSlot = timeSlots[internalIndices[0]];
    const endSlot = timeSlots[internalIndices[internalIndices.length - 1]];

    // displayTimeSlots에서 해당 슬롯을 포함하는 인덱스 찾기
    const startDisplayIdx = displayTimeSlots.findIndex((s, i) => {
      const nextSlot = displayTimeSlots[i + 1];
      const startMin = timeToMinutes(s);
      const endMin = nextSlot ? timeToMinutes(nextSlot) : startMin + timeSlotInterval;
      const slotMin = timeToMinutes(startSlot);
      return slotMin >= startMin && slotMin < endMin;
    });

    const endDisplayIdx = displayTimeSlots.findIndex((s, i) => {
      const nextSlot = displayTimeSlots[i + 1];
      const startMin = timeToMinutes(s);
      const endMin = nextSlot ? timeToMinutes(nextSlot) : startMin + timeSlotInterval;
      const slotMin = timeToMinutes(endSlot);
      return slotMin >= startMin && slotMin < endMin;
    });

    if (startDisplayIdx < 0 || endDisplayIdx < 0) return null;
    return { start: startDisplayIdx, end: endDisplayIdx };
  }, [selectedTimeSlots, selectedRoom, timeSlots, displayTimeSlots, timeSlotInterval]);

  // 리사이즈 시작
  const handleResizeStart = (edge, e) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeEdge(edge);
  };

  // 리사이즈 중 마우스 이동 (displaySlotIndex 사용)
  const handleResizeMove = useCallback((roomId, displaySlotIndex) => {
    if (!isResizing || !selectedSlotRange || roomId !== selectedRoom) return;

    const { start, end } = selectedSlotRange;
    let newStart = start;
    let newEnd = end;

    if (resizeEdge === 'start') {
      newStart = Math.min(displaySlotIndex, end);
    } else if (resizeEdge === 'end') {
      newEnd = Math.max(displaySlotIndex, start);
    }

    if (newStart !== start || newEnd !== end) {
      // displayTimeSlots 인덱스를 내부 슬롯으로 변환
      const startDisplaySlot = displayTimeSlots[newStart];
      const endDisplaySlot = displayTimeSlots[newEnd];
      const startInternalSlots = getInternalSlotsForDisplay(startDisplaySlot);
      const endInternalSlots = getInternalSlotsForDisplay(endDisplaySlot);
      selectTimeRange(roomId, startInternalSlots[0], endInternalSlots[endInternalSlots.length - 1]);
    }
  }, [isResizing, selectedSlotRange, selectedRoom, resizeEdge, displayTimeSlots, getInternalSlotsForDisplay, selectTimeRange]);

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

  // 슬롯이 선택 영역의 가장자리인지 확인 (displaySlotIndex 사용)
  const getSlotEdge = (roomId, displaySlotIndex) => {
    if (!selectedSlotRange || roomId !== selectedRoom) return null;
    if (displaySlotIndex === selectedSlotRange.start) return 'start';
    if (displaySlotIndex === selectedSlotRange.end) return 'end';
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

  // 예약 리사이즈 시작 (내 예약만)
  const handleReservationResizeStart = (reservation, roomId, edge, e) => {
    if (!reservation.isMyReservation) return;
    e.stopPropagation();

    const startIdx = timeSlots.indexOf(reservation.startTime);
    // endTime은 슬롯 끝 시간이므로 해당 슬롯 인덱스 찾기
    let endIdx = timeSlots.findIndex(s => s === reservation.endTime);
    if (endIdx < 0) {
      // endTime이 슬롯에 없으면 마지막 슬롯 계산
      const [eh, em] = reservation.endTime.split(':').map(Number);
      const endMinutes = eh * 60 + em;
      endIdx = timeSlots.findIndex(s => {
        const [sh, sm] = s.split(':').map(Number);
        return sh * 60 + sm >= endMinutes;
      }) - 1;
    }
    if (endIdx < 0) endIdx = startIdx;

    setResizingReservation({
      reservation,
      roomId,
      edge,
      originalStartIdx: startIdx,
      originalEndIdx: endIdx,
    });
    setResizePreviewSlot(edge === 'start' ? startIdx : endIdx);
  };

  // 예약 리사이즈 이동
  const handleReservationResizeMove = useCallback((roomId, slotIndex) => {
    if (!resizingReservation || roomId !== resizingReservation.roomId) return;
    setResizePreviewSlot(slotIndex);
  }, [resizingReservation]);

  // 예약 리사이즈 완료
  const handleReservationResizeEnd = useCallback(async () => {
    if (!resizingReservation || resizePreviewSlot === null) {
      setResizingReservation(null);
      setResizePreviewSlot(null);
      return;
    }

    const { reservation, roomId, edge, originalStartIdx, originalEndIdx } = resizingReservation;

    let newStartIdx = originalStartIdx;
    let newEndIdx = originalEndIdx;

    if (edge === 'start') {
      newStartIdx = Math.min(resizePreviewSlot, originalEndIdx);
    } else {
      newEndIdx = Math.max(resizePreviewSlot, originalStartIdx);
    }

    // 최소 1슬롯(10분) 유지
    if (newEndIdx < newStartIdx) {
      newEndIdx = newStartIdx;
    }

    // 변경이 없으면 무시
    if (newStartIdx === originalStartIdx && newEndIdx === originalEndIdx) {
      setResizingReservation(null);
      setResizePreviewSlot(null);
      return;
    }

    // 충돌 체크 (자기 자신 제외)
    for (let i = newStartIdx; i <= newEndIdx; i++) {
      const slot = timeSlots[i];
      const existing = reservations[roomId]?.[slot];
      if (existing && existing.id !== reservation.id) {
        toast.error('해당 시간에 다른 예약이 있습니다.');
        setResizingReservation(null);
        setResizePreviewSlot(null);
        return;
      }
    }

    // 새 시간 계산
    const newStartTime = timeSlots[newStartIdx];
    const lastSlot = timeSlots[newEndIdx];
    const [lh, lm] = lastSlot.split(':').map(Number);
    const endMinutes = lh * 60 + lm + 10;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const newEndTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

    // 예약 시간 변경
    if (moveReservation) {
      const result = await moveReservation(reservation.id, roomId, newStartTime, newEndTime);
      if (result.success) {
        toast.success('예약 시간이 변경되었습니다.');
      } else {
        toast.error(result.error || '예약 시간 변경에 실패했습니다.');
      }
    }

    setResizingReservation(null);
    setResizePreviewSlot(null);
  }, [resizingReservation, resizePreviewSlot, timeSlots, reservations, moveReservation, toast]);

  // 예약 리사이즈 전역 마우스 업
  useEffect(() => {
    if (resizingReservation) {
      window.addEventListener('mouseup', handleReservationResizeEnd);
      return () => window.removeEventListener('mouseup', handleReservationResizeEnd);
    }
  }, [resizingReservation, handleReservationResizeEnd]);

  // scrollTargetTime이 설정되면 해당 시간으로 스크롤
  useEffect(() => {
    if (scrollTargetTime && scrollContainerRef.current) {
      const { startTime, endTime } = scrollTargetTime;
      const startIdx = displayTimeSlots.indexOf(startTime);
      const endIdx = displayTimeSlots.findIndex(s => s >= endTime);

      if (startIdx >= 0) {
        const roomNameWidth = 128; // w-32 = 128px
        const container = scrollContainerRef.current;
        const containerWidth = container.clientWidth;

        // 선택된 시간대의 중앙 위치 계산
        const selectionCenter = startIdx * slotWidth + ((endIdx - startIdx) * slotWidth) / 2;
        // 컨테이너 중앙에 오도록 스크롤 위치 계산
        const scrollTarget = selectionCenter - (containerWidth - roomNameWidth) / 2;

        container.scrollTo({
          left: Math.max(0, scrollTarget),
          behavior: 'smooth'
        });
      }

      // 스크롤 후 초기화
      clearScrollTarget();
    }
  }, [scrollTargetTime, displayTimeSlots, slotWidth, clearScrollTarget]);

  // 예약 리사이즈 미리보기 범위 계산
  const getReservationResizePreview = (roomId) => {
    if (!resizingReservation || resizingReservation.roomId !== roomId || resizePreviewSlot === null) return null;

    const { edge, originalStartIdx, originalEndIdx } = resizingReservation;
    let start = originalStartIdx;
    let end = originalEndIdx;

    if (edge === 'start') {
      start = Math.min(resizePreviewSlot, originalEndIdx);
    } else {
      end = Math.max(resizePreviewSlot, originalStartIdx);
    }

    return { start, end };
  };

  // 슬롯이 예약의 첫/마지막 슬롯인지 확인
  const getReservationEdge = (roomId, slotIndex, reservation) => {
    if (!reservation || !reservation.isMyReservation) return null;

    const startIdx = timeSlots.indexOf(reservation.startTime);
    let endIdx = timeSlots.findIndex(s => s === reservation.endTime);
    if (endIdx < 0) {
      const [eh, em] = reservation.endTime.split(':').map(Number);
      const endMinutes = eh * 60 + em;
      endIdx = timeSlots.findIndex(s => {
        const [sh, sm] = s.split(':').map(Number);
        return sh * 60 + sm >= endMinutes;
      }) - 1;
    }
    if (endIdx < 0) endIdx = startIdx;

    if (slotIndex === startIdx) return 'start';
    if (slotIndex === endIdx) return 'end';
    return null;
  };

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
  const hourSlots = displayTimeSlots.filter(slot => slot.endsWith(':00'));

  // 슬롯이 시간의 시작인지 확인 (간격에 따라)
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
              aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
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
              aria-label={myReservations.length > 0 ? `내 예약 ${myReservations.length}건` : '내 예약'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              내 예약
              {myReservations.length > 0 && (
                <span className="px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full" aria-hidden="true">
                  {myReservations.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">날짜:</label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const date = new Date(selectedDate);
                  date.setDate(date.getDate() - 1);
                  setSelectedDate(date.toISOString().split('T')[0]);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="이전 날짜"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => {
                  const date = new Date(selectedDate);
                  date.setDate(date.getDate() + 1);
                  setSelectedDate(date.toISOString().split('T')[0]);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="다음 날짜"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="ml-1 px-2.5 py-1 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                오늘
              </button>
            </div>
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
                value=""
                onChange={(e) => {
                  const floor = floors.find(f => f.id === e.target.value);
                  if (floor) toggleFloor(floor);
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[100px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">층 추가...</option>
                {floors.filter(f => !selectedFloors.has(f.id)).map(floor => (
                  <option key={floor.id} value={floor.id}>
                    {floor.name}
                  </option>
                ))}
              </select>
              {/* 선택된 층 태그 */}
              <div className="flex flex-wrap gap-1">
                {Array.from(selectedFloors).map(floorId => {
                  const floor = floors.find(f => f.id === floorId);
                  return floor ? (
                    <span
                      key={floorId}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm rounded-lg"
                    >
                      {floor.name}
                      <button
                        onClick={() => toggleFloor(floor)}
                        className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded p-0.5"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
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

        {/* 회의실 필터 영역 */}
        {selectedFloors.size > 0 && (
          <div className="flex items-center gap-4 mt-3">
            {/* 시간 간격 */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">간격:</label>
              <select
                value={timeSlotInterval}
                onChange={(e) => setTimeSlotInterval(Number(e.target.value))}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={10}>10분</option>
                <option value={30}>30분</option>
                <option value={60}>1시간</option>
              </select>
            </div>

            {/* 인원 필터 */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">인원:</label>
              <select
                value={roomFilters.minCapacity || ''}
                onChange={(e) => setRoomFilters({ ...roomFilters, minCapacity: e.target.value ? parseInt(e.target.value) : null })}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">전체</option>
                <option value="4">4인 이상</option>
                <option value="8">8인 이상</option>
                <option value="20">20인 이상</option>
              </select>
            </div>

            {/* 장비 필터 */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">장비:</label>
              <div className="flex items-center gap-2">
                {amenities.map(amenity => (
                  <label key={amenity.id} className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roomFilters.amenities.includes(amenity.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRoomFilters({ ...roomFilters, amenities: [...roomFilters.amenities, amenity.id] });
                        } else {
                          setRoomFilters({ ...roomFilters, amenities: roomFilters.amenities.filter(a => a !== amenity.id) });
                        }
                      }}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    {amenity.name}
                  </label>
                ))}
              </div>
            </div>

            {/* 필터 결과 카운트 & 초기화 */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {filteredRooms.length}/{rooms.length}개 회의실
              </span>
              {(roomFilters.minCapacity || roomFilters.amenities.length > 0) && (
                <button
                  onClick={() => setRoomFilters({ ...roomFilters, minCapacity: null, amenities: [] })}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  초기화
                </button>
              )}
            </div>
          </div>
        )}

        {/* 참석자 가용시간 & 추천 시간 */}
        {selectedParticipants.length > 0 && (
          <div className="flex items-center gap-6 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            {/* 바쁜 시간 표시 토글 */}
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showAvailability}
                onChange={(e) => setShowAvailability(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              바쁜 시간 표시
            </label>

            {/* 회의 시간 선택 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">회의 시간:</span>
              <select
                value={meetingDuration}
                onChange={(e) => setMeetingDuration(Number(e.target.value))}
                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={30}>30분</option>
                <option value={60}>1시간</option>
                <option value={90}>1시간 30분</option>
                <option value={120}>2시간</option>
              </select>
            </div>

            {/* 추천 시간 */}
            {optimalTimes.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">추천 시간:</span>
                <div className="flex gap-1">
                  {optimalTimes.slice(0, 5).map((time, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (time.availableRooms.length > 0) {
                          applyOptimalTime(time.startTime, time.endTime, time.availableRooms[0].id);
                        }
                      }}
                      className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                        time.isAllRequiredAvailable
                          ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800'
                          : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800'
                      }`}
                      title={`${time.isAllRequiredAvailable ? '전원 가능' : `${time.requiredScore}명 가능`} · ${time.availableRooms.length}개 회의실`}
                    >
                      {time.startTime}~{time.endTime}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {optimalTimes.length === 0 && (
              <span className="text-sm text-gray-400 dark:text-gray-500">
                {meetingDuration}분 회의 가능한 시간/회의실 없음
              </span>
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
        ) : filteredRooms.length === 0 && rooms.length > 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <p className="text-lg font-medium">
                {rooms.length === 0 ? '해당 층에 회의실이 없습니다' : '검색 조건에 맞는 회의실이 없습니다'}
              </p>
              {rooms.length > 0 && (
                <button
                  onClick={() => setRoomFilters({ ...roomFilters, minCapacity: null, amenities: [] })}
                  className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  필터 초기화
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden select-none transition-colors">
            {/* 스크롤 가능한 그리드 영역 */}
            <div className="flex-1 overflow-auto overscroll-contain" ref={scrollContainerRef}>
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
                        style={{ width: `${slotWidth * (60 / timeSlotInterval)}px` }}
                      >
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{hour}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 회의실 행 - 층별 그룹화 */}
                {selectedFloors.size === 0 ? (
                  <div className="flex items-center justify-center py-16 text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <p className="font-medium">층을 선택해주세요</p>
                      <p className="text-sm mt-1">{selectedBuilding?.name}의 회의실을 확인합니다</p>
                    </div>
                  </div>
                ) : Array.from(selectedFloors).map(floorId => {
                  const floor = floors.find(f => f.id === floorId);
                  const floorRooms = filteredRooms.filter(r => r.floorId === floorId);
                  if (floorRooms.length === 0) return null;

                  return (
                    <React.Fragment key={floorId}>
                      {/* 층 구분 헤더 (멀티플로어일 때만 표시) */}
                      {selectedFloors.size > 1 && (
                        <div className="flex bg-blue-50 dark:bg-blue-900/30 border-b-2 border-blue-200 dark:border-blue-700">
                          <div className="w-32 flex-shrink-0 px-3 py-2 border-r border-blue-200 dark:border-blue-700 sticky left-0 z-10 bg-blue-50 dark:bg-blue-900/30">
                            <span className="font-semibold text-blue-700 dark:text-blue-300 text-sm">{floor?.name}</span>
                          </div>
                          <div className="flex-1" />
                        </div>
                      )}

                      {floorRooms.map(room => {
                        const movePreview = getMovePreviewRange(room.id);
                        const isHidden = hiddenRooms.has(room.id);

                        // 숨김 처리된 회의실은 얇게 표시
                        if (isHidden) {
                          return (
                            <div
                              key={room.id}
                              className="flex border-b border-gray-100 dark:border-gray-700 last:border-b-0 bg-gray-50 dark:bg-gray-900/50 opacity-50 hover:opacity-100 transition-opacity group"
                            >
                              <div className="w-32 flex-shrink-0 px-3 py-1 border-r border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 sticky left-0 z-10">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => toggleHiddenRoom(room.id)}
                                    className="flex-shrink-0 p-0.5 -ml-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    title="숨김 해제"
                                  >
                                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                  </button>
                                  <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{room.name}</span>
                                </div>
                              </div>
                              <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800/50" />
                            </div>
                          );
                        }

                        return (
                          <div key={room.id} className="flex border-b border-gray-100 dark:border-gray-700 last:border-b-0 group/room">
                            <div className="w-32 flex-shrink-0 px-3 py-2 border-r border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 sticky left-0 z-10">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => toggleFavoriteRoom(room.id)}
                                  className="flex-shrink-0 p-0.5 -ml-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                  title={favoriteRooms.has(room.id) ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                                >
                                  <svg
                                    className={`w-4 h-4 ${favoriteRooms.has(room.id) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                                    fill={favoriteRooms.has(room.id) ? 'currentColor' : 'none'}
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleHiddenRoom(room.id)}
                                  className="flex-shrink-0 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-0 group-hover/room:opacity-100"
                                  title="이 회의실 숨기기"
                                >
                                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                                <div className="font-medium text-gray-900 dark:text-white text-sm truncate">{room.name}</div>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 ml-5">{room.capacity}인</div>
                            </div>
                    <div className="flex">
                      {displayTimeSlots.map((slot, displaySlotIndex) => {
                        // displaySlot에 해당하는 원본 timeSlots 인덱스 찾기
                        const slotIndex = timeSlots.indexOf(slot);
                        const status = getSlotStatus(room.id, slot);
                        // 예약 정보는 해당 범위 내 첫 예약을 가져옴
                        const internalSlots = getInternalSlotsForDisplay(slot);
                        const reservation = internalSlots.map(s => reservations[room.id]?.[s]).find(r => r);
                        const isHour = isHourStart(slot);
                        const inDragRange = isInDragRange(room.id, displaySlotIndex);
                        const isBusy = showAvailability && isParticipantBusy(slot);
                        const edge = getSlotEdge(room.id, displaySlotIndex);
                        const reservationEdge = getReservationEdge(room.id, slotIndex, reservation);
                        const resizePreview = getReservationResizePreview(room.id);
                        const inResizePreview = resizePreview && slotIndex >= resizePreview.start && slotIndex <= resizePreview.end;
                        const slotLabel = `${slot} - ${reservation ? `${reservation.title} (${reservation.organizer})${reservation.isMyReservation ? ' - 드래그하여 이동, 가장자리 드래그로 시간 조정' : ''}` : isBusy ? '참석자 일정 있음' : '예약 가능'}`;

                        return (
                          <div
                            key={slot}
                            role="button"
                            tabIndex={0}
                            aria-label={slotLabel}
                            onMouseDown={(e) => {
                              // 리사이즈 핸들 클릭이 아닌 경우에만 일반 드래그 시작
                              if (!e.target.classList.contains('resize-handle')) {
                                handleMouseDown(room.id, displaySlotIndex, room);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleMouseDown(room.id, displaySlotIndex, room);
                              }
                            }}
                            onMouseEnter={() => {
                              if (resizingReservation) {
                                handleReservationResizeMove(room.id, slotIndex);
                              } else if (movingReservation) {
                                handleReservationDragMove(room.id, slotIndex);
                              } else if (isResizing) {
                                handleResizeMove(room.id, displaySlotIndex);
                              } else {
                                handleMouseEnter(room.id, displaySlotIndex);
                              }
                            }}
                            onContextMenu={(e) => handleContextMenu(e, room.id, displaySlotIndex, room)}
                            style={{ width: `${slotWidth}px` }}
                            className={`flex-shrink-0 h-10 cursor-pointer transition-colors relative focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
                              isHour ? 'border-l border-gray-200 dark:border-gray-600' : 'border-l border-gray-100 dark:border-gray-700'
                            } ${
                              // 리사이즈 미리보기
                              inResizePreview
                                ? 'bg-purple-400 dark:bg-purple-500'
                              // 이동 미리보기
                              : movePreview && slotIndex >= movePreview.start && slotIndex <= movePreview.end
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
                            title={slotLabel}
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
                            {/* 리사이즈 핸들 - 내 예약 가장자리 */}
                            {status === 'reserved' && reservation?.isMyReservation && reservationEdge === 'start' && (
                              <div
                                className="resize-handle absolute left-0 top-0 bottom-0 w-1.5 bg-purple-600 cursor-ew-resize hover:bg-purple-700 z-10"
                                onMouseDown={(e) => handleReservationResizeStart(reservation, room.id, 'start', e)}
                              />
                            )}
                            {status === 'reserved' && reservation?.isMyReservation && reservationEdge === 'end' && (
                              <div
                                className="resize-handle absolute right-0 top-0 bottom-0 w-1.5 bg-purple-600 cursor-ew-resize hover:bg-purple-700 z-10"
                                onMouseDown={(e) => handleReservationResizeStart(reservation, room.id, 'end', e)}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* 미니맵 - 수평 스크롤 역할 */}
            <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
              <div
                ref={minimapRef}
                role="slider"
                aria-label="타임라인 미니맵"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(viewportPosition.left)}
                tabIndex={0}
                onClick={handleMinimapClick}
                onKeyDown={(e) => {
                  const container = scrollContainerRef.current;
                  if (!container) return;
                  const step = container.clientWidth * 0.2;
                  if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    container.scrollBy({ left: -step, behavior: 'smooth' });
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    container.scrollBy({ left: step, behavior: 'smooth' });
                  }
                }}
                className="h-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 relative cursor-pointer overflow-hidden touch-none focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  {filteredRooms.map((room, roomIdx) => (
                    <div key={room.id} className="absolute inset-0">
                      {Object.entries(reservations[room.id] || {}).map(([slot, res]) => {
                        const slotIdx = displayTimeSlots.indexOf(slot);
                        if (slotIdx < 0) return null;
                        // 예약의 첫 슬롯만 표시
                        const prevSlot = displayTimeSlots[slotIdx - 1];
                        if (prevSlot && reservations[room.id]?.[prevSlot]?.id === res.id) return null;

                        // 예약 길이 계산
                        let endIdx = slotIdx;
                        while (endIdx < displayTimeSlots.length - 1 && reservations[room.id]?.[displayTimeSlots[endIdx + 1]]?.id === res.id) {
                          endIdx++;
                        }
                        const startPercent = (slotIdx / displayTimeSlots.length) * 100;
                        const widthPercent = ((endIdx - slotIdx + 1) / displayTimeSlots.length) * 100;
                        const topPercent = (roomIdx / filteredRooms.length) * 100;
                        const heightPercent = 100 / filteredRooms.length;

                        return (
                          <div
                            key={`${room.id}-${slot}`}
                            className={`absolute ${res.isMyReservation ? 'bg-purple-300' : 'bg-red-300'} opacity-70`}
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
                  {selectedSlotRange && selectedRoom && filteredRooms.findIndex(r => r.id === selectedRoom) >= 0 && (
                    <div
                      className="absolute bg-blue-500 opacity-80"
                      style={{
                        left: `${(selectedSlotRange.start / displayTimeSlots.length) * 100}%`,
                        width: `${((selectedSlotRange.end - selectedSlotRange.start + 1) / displayTimeSlots.length) * 100}%`,
                        top: `${(filteredRooms.findIndex(r => r.id === selectedRoom) / filteredRooms.length) * 100}%`,
                        height: `${100 / filteredRooms.length}%`,
                      }}
                    />
                  )}

                  {/* 뷰포트 인디케이터 - 드래그 가능 */}
                  <div
                    className={`absolute top-0 bottom-0 border-2 border-blue-600 bg-blue-100 bg-opacity-30 rounded-sm ${
                      isMinimapDragging ? 'cursor-grabbing' : 'cursor-grab'
                    }`}
                    style={{
                      left: `${viewportPosition.left}%`,
                      width: `${viewportPosition.width}%`,
                    }}
                    onMouseDown={handleMinimapDragStart}
                  />
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
          role="menu"
          aria-label="시간 슬롯 메뉴"
          className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 메뉴 헤더 */}
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-200">{contextMenu.room.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{contextMenu.slot}</div>
          </div>

          {/* 예약 가능한 슬롯 */}
          {contextMenu.status === 'available' && (
            <>
              <button
                role="menuitem"
                onClick={() => handleSelectDuration(30)}
                className="w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                30분 선택
              </button>
              <button
                role="menuitem"
                onClick={() => handleSelectDuration(60)}
                className="w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                1시간 선택
              </button>
              <button
                role="menuitem"
                onClick={() => handleSelectDuration(120)}
                className="w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                2시간 선택
              </button>
              <button
                role="menuitem"
                onClick={handleSelectToNextHour}
                className="w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                정시까지 선택
              </button>
              <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
              {selectedParticipants.length > 0 && optimalTimes.length > 0 && (
                <div className="px-3 py-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">추천 시간:</div>
                  {optimalTimes.slice(0, 3).map((time, idx) => (
                    <button
                      key={idx}
                      role="menuitem"
                      onClick={() => {
                        applyOptimalTime(time.startTime, time.endTime, contextMenu.roomId);
                        closeContextMenu();
                      }}
                      className="w-full px-2 py-1 text-xs text-left text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded"
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
                role="menuitem"
                onClick={() => {
                  setShowModal(true);
                  closeContextMenu();
                }}
                className="w-full px-3 py-2 text-sm text-left text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 flex items-center gap-2 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                예약하기
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  clearSelection();
                  closeContextMenu();
                }}
                className="w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                선택 해제
              </button>
            </>
          )}

          {/* 예약된 슬롯 */}
          {contextMenu.status === 'reserved' && contextMenu.reservation && (
            <>
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{contextMenu.reservation.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {contextMenu.reservation.startTime} - {contextMenu.reservation.endTime}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  주관: {contextMenu.reservation.organizer}
                </div>
              </div>
              <button
                role="menuitem"
                onClick={() => {
                  setViewingReservation(contextMenu.reservation);
                  setViewingRoom(contextMenu.room);
                  closeContextMenu();
                }}
                className="w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                상세 보기
              </button>
              {contextMenu.reservation.isMyReservation && (
                <button
                  role="menuitem"
                  onClick={() => {
                    // 내 예약 편집으로 이동
                    setShowMyReservations(true);
                    closeContextMenu();
                  }}
                  className="w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity"
          onClick={() => setShowShortcutHelp(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcut-help-title"
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 transform transition-all"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                // 포커스 트랩: 모달 내부에서만 탭 이동
                const focusable = e.currentTarget.querySelectorAll('button');
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 id="shortcut-help-title" className="text-lg font-semibold text-gray-900 dark:text-white">키보드 단축키</h2>
              <button
                onClick={() => setShowShortcutHelp(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="닫기"
                autoFocus
              >
                <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-3">
                <ShortcutRow keys={['Esc']} description="모달 닫기 / 선택 해제" />
                <ShortcutRow keys={['Enter']} description="예약하기 (시간 선택 시)" />
                <ShortcutRow keys={['Delete']} description="선택 해제" />
                <div className="border-t border-gray-100 dark:border-gray-700 my-3" />
                <ShortcutRow keys={['←']} description="이전 날짜" />
                <ShortcutRow keys={['→']} description="다음 날짜" />
                <ShortcutRow keys={['T']} description="오늘로 이동" />
                <div className="border-t border-gray-100 dark:border-gray-700 my-3" />
                <ShortcutRow keys={['M']} description="내 예약 열기/닫기" />
                <ShortcutRow keys={['?']} description="단축키 도움말" />
              </div>
            </div>
            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 rounded-b-xl border-t border-gray-100 dark:border-gray-600">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
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
            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm font-mono text-gray-700 dark:text-gray-200 min-w-[28px] text-center"
          >
            {key}
          </kbd>
        ))}
      </div>
      <span className="text-sm text-gray-600 dark:text-gray-300">{description}</span>
    </div>
  );
}
