import { useState, useRef, useCallback, useEffect } from 'react';
import { useReservation } from '../context/ReservationContext';
import ReservationModal from './ReservationModal';
import ReservationDetailModal from './ReservationDetailModal';

export default function RoomReservation() {
  const {
    buildings,
    floors,
    rooms,
    timeSlots,
    reservations,
    selectedBuilding,
    selectedFloor,
    selectedDate,
    selectedTimeSlots,
    selectedRoom,
    selectBuilding,
    selectFloor,
    setSelectedDate,
    selectTimeRange,
    clearSelection,
  } = useReservation();

  const [showModal, setShowModal] = useState(false);
  const [viewingReservation, setViewingReservation] = useState(null);
  const [viewingRoom, setViewingRoom] = useState(null);

  // 드래그 상태
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null); // { roomId, slotIndex }
  const [dragEnd, setDragEnd] = useState(null);

  const scrollContainerRef = useRef(null);

  const getSlotStatus = (roomId, timeSlot) => {
    if (reservations[roomId]?.[timeSlot]) {
      return 'reserved';
    }
    if (selectedTimeSlots.find(s => s.roomId === roomId && s.timeSlot === timeSlot)) {
      return 'selected';
    }
    return 'available';
  };

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

  const canCreateReservation = selectedTimeSlots.length > 0 && selectedRoom;

  // 시간 헤더용 - 정각만 표시
  const hourSlots = timeSlots.filter(slot => slot.endsWith(':00'));

  // 10분 단위로 시간 파싱
  const isHourStart = (slot) => slot.endsWith(':00');

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">회의실 예약</h1>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">날짜:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">건물:</label>
            <select
              value={selectedBuilding?.id || ''}
              onChange={(e) => {
                const building = buildings.find(b => b.id === e.target.value);
                selectBuilding(building);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]"
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
              <label className="text-sm font-medium text-gray-700">층:</label>
              <select
                value={selectedFloor?.id || ''}
                onChange={(e) => {
                  const floor = floors.find(f => f.id === e.target.value);
                  selectFloor(floor);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[100px]"
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
      </header>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 overflow-hidden p-6">
        {!selectedBuilding ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="text-lg font-medium">건물을 선택해주세요</p>
              <p className="text-sm mt-1">회의실 현황을 확인할 수 있습니다</p>
            </div>
          </div>
        ) : !selectedFloor ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-lg font-medium">층을 선택해주세요</p>
              <p className="text-sm mt-1">{selectedBuilding.name}의 회의실을 확인합니다</p>
            </div>
          </div>
        ) : rooms.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p className="text-lg font-medium">해당 층에 회의실이 없습니다</p>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden select-none">
            {/* 스크롤 가능한 그리드 영역 */}
            <div className="flex-1 overflow-auto" ref={scrollContainerRef}>
              <div className="inline-block min-w-full">
                {/* 시간 헤더 */}
                <div className="flex sticky top-0 z-20 bg-gray-50 border-b border-gray-200">
                  <div className="w-32 flex-shrink-0 px-3 py-3 font-medium text-gray-700 border-r border-gray-200 bg-gray-50 sticky left-0 z-30">
                    회의실
                  </div>
                  <div className="flex">
                    {hourSlots.map(hour => (
                      <div
                        key={hour}
                        className="flex-shrink-0 flex items-center justify-center border-r border-gray-200 bg-gray-50"
                        style={{ width: '120px' }}
                      >
                        <span className="text-xs font-semibold text-gray-700">{hour}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 회의실 행 */}
                {rooms.map(room => (
                  <div key={room.id} className="flex border-b border-gray-100 last:border-b-0">
                    <div className="w-32 flex-shrink-0 px-3 py-2 border-r border-gray-200 bg-white sticky left-0 z-10">
                      <div className="font-medium text-gray-900 text-sm truncate">{room.name}</div>
                      <div className="text-xs text-gray-500">{room.capacity}인</div>
                    </div>
                    <div className="flex">
                      {timeSlots.map((slot, slotIndex) => {
                        const status = getSlotStatus(room.id, slot);
                        const reservation = reservations[room.id]?.[slot];
                        const isHour = isHourStart(slot);
                        const inDragRange = isInDragRange(room.id, slotIndex);

                        return (
                          <div
                            key={slot}
                            onMouseDown={() => handleMouseDown(room.id, slotIndex, room)}
                            onMouseEnter={() => handleMouseEnter(room.id, slotIndex)}
                            className={`flex-shrink-0 w-5 h-10 cursor-pointer transition-colors ${
                              isHour ? 'border-l border-gray-200' : 'border-l border-gray-100'
                            } ${
                              status === 'reserved'
                                ? 'bg-red-200 hover:bg-red-300 cursor-pointer'
                                : status === 'selected'
                                ? 'bg-blue-500'
                                : inDragRange
                                ? 'bg-blue-300'
                                : 'hover:bg-blue-100'
                            }`}
                            title={`${slot} - ${reservation ? `${reservation.title} (${reservation.organizer})` : '예약 가능'}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 범례 */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-white border border-gray-300 rounded"></div>
                  <span>예약 가능</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span>선택됨</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-200 rounded"></div>
                  <span>예약됨</span>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                * 드래그하여 연속 시간 선택
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
    </div>
  );
}
