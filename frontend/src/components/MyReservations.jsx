import { useState } from 'react';
import { useReservation } from '../context/ReservationContext';

export default function MyReservations({ onClose }) {
  const {
    myReservations,
    deleteReservation,
    recurrenceTypes,
  } = useReservation();

  const [filter, setFilter] = useState('upcoming'); // 'upcoming', 'past', 'all'
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  const filteredReservations = myReservations
    .filter(r => {
      if (filter === 'upcoming') return r.date >= today;
      if (filter === 'past') return r.date < today;
      return true;
    })
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });

  const recurrenceLabels = {
    [recurrenceTypes.NONE]: '',
    [recurrenceTypes.DAILY]: '매일',
    [recurrenceTypes.WEEKLY]: '매주',
    [recurrenceTypes.BIWEEKLY]: '격주',
    [recurrenceTypes.MONTHLY]: '매월',
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${date.getMonth() + 1}/${date.getDate()} (${days[date.getDay()]})`;
  };

  const handleDelete = (reservation, deleteAll = false) => {
    deleteReservation(reservation.id, deleteAll);
    setDeleteConfirm(null);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">내 예약</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 필터 */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700 flex gap-2">
          {[
            { value: 'upcoming', label: '예정된 예약' },
            { value: 'past', label: '지난 예약' },
            { value: 'all', label: '전체' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                filter === value
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 예약 목록 */}
        <div className="flex-1 overflow-y-auto">
          {filteredReservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <svg className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-lg font-medium">예약이 없습니다</p>
              <p className="text-sm mt-1">새로운 회의를 예약해보세요</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredReservations.map(reservation => (
                <div
                  key={reservation.id}
                  className={`px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    reservation.date < today ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">{reservation.title}</h3>
                        {reservation.recurrence !== recurrenceTypes.NONE && (
                          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                            {recurrenceLabels[reservation.recurrence]}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatDate(reservation.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {reservation.startTime} - {reservation.endTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {reservation.buildingName} {reservation.floorName} {reservation.roomName}
                        </div>
                        {reservation.participants?.length > 0 && (
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {reservation.participants.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 삭제 버튼 */}
                    {reservation.date >= today && (
                      <div className="ml-4">
                        {deleteConfirm === reservation.id ? (
                          <div className="flex items-center gap-2">
                            {reservation.recurrenceGroupId ? (
                              <>
                                <button
                                  onClick={() => handleDelete(reservation, false)}
                                  className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900"
                                >
                                  이것만
                                </button>
                                <button
                                  onClick={() => handleDelete(reservation, true)}
                                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                  모두
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleDelete(reservation, false)}
                                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                삭제
                              </button>
                            )}
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(reservation.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="삭제"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-500 dark:text-gray-400">
          총 {filteredReservations.length}개의 예약
        </div>
      </div>
    </div>
  );
}
