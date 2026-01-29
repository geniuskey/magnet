import { useState } from 'react';
import { useReservation } from '../context/ReservationContext';

export default function Sidebar() {
  const {
    employees,
    selectedParticipants,
    toggleParticipant,
  } = useReservation();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const filteredEmployees = employees.filter(emp =>
    emp.name.includes(searchQuery) ||
    emp.department.includes(searchQuery) ||
    emp.position.includes(searchQuery)
  );

  // 부서별 그룹핑
  const groupedByDept = filteredEmployees.reduce((acc, emp) => {
    if (!acc[emp.department]) {
      acc[emp.department] = [];
    }
    acc[emp.department].push(emp);
    return acc;
  }, {});

  if (isCollapsed) {
    return (
      <aside className="w-12 bg-white border-r border-gray-200 flex flex-col items-center py-4">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          title="참여자 목록 열기"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>
        {selectedParticipants.length > 0 && (
          <div className="mt-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
            {selectedParticipants.length}
          </div>
        )}
      </aside>
    );
  }

  return (
    <aside className="w-72 bg-white border-r border-gray-200 flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">참여자 선택</h2>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            title="접기"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* 검색 */}
        <div className="relative">
          <input
            type="text"
            placeholder="이름, 부서, 직책 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* 선택된 참여자 */}
      {selectedParticipants.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-200 bg-blue-50">
          <div className="text-xs font-medium text-blue-700 mb-2">
            선택된 참여자 ({selectedParticipants.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedParticipants.map(emp => (
              <span
                key={emp.id}
                className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full cursor-pointer hover:bg-blue-200"
                onClick={() => toggleParticipant(emp)}
              >
                {emp.name}
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 직원 목록 */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedByDept).map(([dept, emps]) => (
          <div key={dept} className="border-b border-gray-100 last:border-b-0">
            <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {dept}
            </div>
            <ul>
              {emps.map(emp => {
                const isSelected = selectedParticipants.some(p => p.id === emp.id);
                return (
                  <li
                    key={emp.id}
                    onClick={() => toggleParticipant(emp)}
                    className={`px-4 py-2.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border-l-2 border-blue-500'
                        : 'hover:bg-gray-50 border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          isSelected ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {emp.name[0]}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                          <div className="text-xs text-gray-500">{emp.position}</div>
                        </div>
                      </div>
                      {isSelected && (
                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
