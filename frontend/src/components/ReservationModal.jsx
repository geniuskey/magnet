import { useState, useEffect, useRef, useMemo } from 'react';
import { useReservation } from '../context/ReservationContext';

export default function ReservationModal({ onClose }) {
  const {
    rooms,
    selectedRoom,
    selectedTimeSlots,
    selectedParticipants,
    selectedEntities,
    selectionTypes,
    organizer,
    requiredAttendees,
    optionalAttendees,
    attendeeTypes,
    selectedDate,
    meetingTitle,
    setMeetingTitle,
    recurrence,
    setRecurrence,
    recurrenceEndDate,
    setRecurrenceEndDate,
    recurrenceTypes,
    createReservation,
    clearSelection,
    clearAttendees,
    reservations,
    getRecurringDates,
  } = useReservation();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef(null);

  const room = rooms.find(r => r.id === selectedRoom);

  // Ctrl+Enter로 제출
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const sortedSlots = [...selectedTimeSlots].sort((a, b) =>
    a.timeSlot.localeCompare(b.timeSlot)
  );

  const startTime = sortedSlots[0]?.timeSlot || '';
  const endTime = sortedSlots.length > 0 ? addMinutes(sortedSlots[sortedSlots.length - 1].timeSlot, 10) : '';
  const duration = sortedSlots.length * 10;

  function addMinutes(time, minutes) {
    const [h, m] = time.split(':').map(Number);
    const totalMinutes = h * 60 + m + minutes;
    const newH = Math.floor(totalMinutes / 60);
    const newM = totalMinutes % 60;
    return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
  }

  const recurrenceLabels = {
    [recurrenceTypes.NONE]: '반복 안함',
    [recurrenceTypes.DAILY]: '매일',
    [recurrenceTypes.WEEKLY]: '매주',
    [recurrenceTypes.BIWEEKLY]: '격주',
    [recurrenceTypes.MONTHLY]: '매월',
  };

  // 빠른 종료 날짜 설정
  const setQuickEndDate = (months) => {
    const date = new Date(selectedDate);
    date.setMonth(date.getMonth() + months);
    setRecurrenceEndDate(date.toISOString().split('T')[0]);
  };

  // 반복 예약될 날짜 목록
  const recurringDates = useMemo(() => {
    if (recurrence === recurrenceTypes.NONE || !recurrenceEndDate) return [];
    return getRecurringDates(selectedDate, recurrenceEndDate, recurrence);
  }, [selectedDate, recurrenceEndDate, recurrence, recurrenceTypes.NONE, getRecurringDates]);

  // 충돌 감지 (기존 예약과 겹치는 날짜)
  const conflicts = useMemo(() => {
    if (recurringDates.length === 0 || !selectedRoom) return [];

    const roomReservations = reservations[selectedRoom] || {};
    const conflictDates = [];

    // 선택된 시간 슬롯들
    const selectedSlots = selectedTimeSlots
      .filter(s => s.roomId === selectedRoom)
      .map(s => s.timeSlot);

    recurringDates.forEach(date => {
      // 해당 날짜에 선택된 시간대에 기존 예약이 있는지 확인
      // (reservations 구조가 roomId -> timeSlot -> reservation 이므로
      //  날짜별로 확인하려면 각 예약의 date를 확인해야 함)
      selectedSlots.forEach(slot => {
        const existing = roomReservations[slot];
        if (existing && existing.date === date && !existing.isMyReservation) {
          if (!conflictDates.includes(date)) {
            conflictDates.push(date);
          }
        }
      });
    });

    return conflictDates;
  }, [recurringDates, selectedRoom, reservations, selectedTimeSlots]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!meetingTitle.trim()) {
      setError('회의 제목을 입력해주세요.');
      return;
    }

    if (recurrence !== recurrenceTypes.NONE && !recurrenceEndDate) {
      setError('반복 종료 날짜를 선택해주세요.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const result = await createReservation();
      if (result.success) {
        onClose();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('예약 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    clearSelection();
    clearAttendees();
    setRecurrence(recurrenceTypes.NONE);
    setRecurrenceEndDate('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">회의실 예약</h2>
        </div>

        <form ref={formRef} onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                {error}
              </div>
            )}

            {/* 회의실 정보 */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{room?.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">수용 인원: {room?.capacity}명</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">날짜:</span>
                  <span className="ml-2 text-gray-900 dark:text-white font-medium">{selectedDate}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">시간:</span>
                  <span className="ml-2 text-gray-900 dark:text-white font-medium">{startTime} - {endTime}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500 dark:text-gray-400">소요 시간:</span>
                  <span className="ml-2 text-gray-900 dark:text-white font-medium">
                    {duration >= 60 ? `${Math.floor(duration / 60)}시간 ${duration % 60 > 0 ? `${duration % 60}분` : ''}` : `${duration}분`}
                  </span>
                </div>
              </div>
            </div>

            {/* 회의 제목 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                회의 제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="회의 제목을 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                autoFocus
              />
            </div>

            {/* 반복 설정 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                반복
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {Object.entries(recurrenceLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* 반복 종료 날짜 */}
            {recurrence !== recurrenceTypes.NONE && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  반복 종료 날짜 <span className="text-red-500">*</span>
                </label>
                {/* 빠른 선택 버튼 */}
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setQuickEndDate(1)}
                    className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    1개월
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickEndDate(3)}
                    className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    3개월
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickEndDate(6)}
                    className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    6개월
                  </button>
                </div>
                <input
                  type="date"
                  value={recurrenceEndDate}
                  onChange={(e) => setRecurrenceEndDate(e.target.value)}
                  min={selectedDate}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {recurrence === recurrenceTypes.DAILY && '매일 반복됩니다.'}
                  {recurrence === recurrenceTypes.WEEKLY && '매주 같은 요일에 반복됩니다.'}
                  {recurrence === recurrenceTypes.BIWEEKLY && '격주 같은 요일에 반복됩니다.'}
                  {recurrence === recurrenceTypes.MONTHLY && '매월 같은 날짜에 반복됩니다.'}
                  {recurringDates.length > 0 && ` (총 ${recurringDates.length}회)`}
                </p>

                {/* 충돌 경고 */}
                {conflicts.length > 0 && (
                  <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 font-medium flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {conflicts.length}개 날짜에 기존 예약이 있습니다
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      {conflicts.slice(0, 3).join(', ')}{conflicts.length > 3 && ` 외 ${conflicts.length - 3}건`}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 참석자 (Entity 기반으로 표시) */}
            {selectedEntities.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  참석자 ({selectedParticipants.length}명)
                </label>
                <div className="space-y-2">
                  {/* 주관자 */}
                  {selectedEntities.filter(e => e.attendeeType === attendeeTypes.ORGANIZER).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-xs text-purple-600 dark:text-purple-400 font-medium mr-1">주관:</span>
                      {selectedEntities.filter(e => e.attendeeType === attendeeTypes.ORGANIZER).map(entity => (
                        <EntityChip key={`${entity.type}_${entity.id}`} entity={entity} selectionTypes={selectionTypes} color="purple" />
                      ))}
                    </div>
                  )}

                  {/* 필수 참석자 */}
                  {selectedEntities.filter(e => e.attendeeType === attendeeTypes.REQUIRED).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium mr-1">필수:</span>
                      {selectedEntities.filter(e => e.attendeeType === attendeeTypes.REQUIRED).map(entity => (
                        <EntityChip key={`${entity.type}_${entity.id}`} entity={entity} selectionTypes={selectionTypes} color="blue" />
                      ))}
                    </div>
                  )}

                  {/* 선택 참석자 */}
                  {selectedEntities.filter(e => e.attendeeType === attendeeTypes.OPTIONAL).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium mr-1">선택:</span>
                      {selectedEntities.filter(e => e.attendeeType === attendeeTypes.OPTIONAL).map(entity => (
                        <EntityChip key={`${entity.type}_${entity.id}`} entity={entity} selectionTypes={selectionTypes} color="gray" />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-[10px]">Ctrl</kbd>
              +
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-[10px]">Enter</kbd>
              로 제출
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                disabled={isSubmitting}
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? '예약 중...' : '예약하기'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Entity Chip 컴포넌트 (TEAM 또는 INDIVIDUAL만 사용)
function EntityChip({ entity, selectionTypes, color }) {
  const getIcon = () => {
    if (entity.type === selectionTypes.TEAM) {
      return (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
    }
    // INDIVIDUAL (개인)
    return (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    );
  };

  const colorClasses = {
    purple: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
    blue: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
    gray: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${colorClasses[color]}`}>
      {getIcon()}
      <span>{entity.name}</span>
      {entity.memberCount > 1 && (
        <span className="text-[10px] opacity-70">({entity.memberCount})</span>
      )}
    </span>
  );
}
