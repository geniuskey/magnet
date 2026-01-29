import { useState } from 'react';
import { useReservation } from '../context/ReservationContext';

export default function ReservationModal({ onClose }) {
  const {
    rooms,
    selectedRoom,
    selectedTimeSlots,
    selectedParticipants,
    selectedDate,
    meetingTitle,
    setMeetingTitle,
    createReservation,
    clearSelection,
  } = useReservation();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const room = rooms.find(r => r.id === selectedRoom);
  const sortedSlots = [...selectedTimeSlots].sort((a, b) =>
    a.timeSlot.localeCompare(b.timeSlot)
  );

  const startTime = sortedSlots[0]?.timeSlot || '';
  const endTime = sortedSlots.length > 0 ? addMinutes(sortedSlots[sortedSlots.length - 1].timeSlot, 10) : '';
  const duration = sortedSlots.length * 10; // 분 단위

  function addMinutes(time, minutes) {
    const [h, m] = time.split(':').map(Number);
    const totalMinutes = h * 60 + m + minutes;
    const newH = Math.floor(totalMinutes / 60);
    const newM = totalMinutes % 60;
    return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!meetingTitle.trim()) {
      setError('회의 제목을 입력해주세요.');
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
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">회의실 예약</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            {/* 에러 메시지 */}
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                {error}
              </div>
            )}

            {/* 회의실 정보 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{room?.name}</div>
                  <div className="text-sm text-gray-500">수용 인원: {room?.capacity}명</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">날짜:</span>
                  <span className="ml-2 text-gray-900 font-medium">{selectedDate}</span>
                </div>
                <div>
                  <span className="text-gray-500">시간:</span>
                  <span className="ml-2 text-gray-900 font-medium">{startTime} - {endTime}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">소요 시간:</span>
                  <span className="ml-2 text-gray-900 font-medium">
                    {duration >= 60 ? `${Math.floor(duration / 60)}시간 ${duration % 60 > 0 ? `${duration % 60}분` : ''}` : `${duration}분`}
                  </span>
                </div>
              </div>
            </div>

            {/* 회의 제목 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                회의 제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="회의 제목을 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {/* 참여자 */}
            {selectedParticipants.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  참여자 ({selectedParticipants.length}명)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {selectedParticipants.map(p => (
                    <span
                      key={p.id}
                      className="inline-flex items-center px-2.5 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 푸터 */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
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
        </form>
      </div>
    </div>
  );
}
