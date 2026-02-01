import { useState, useMemo, useCallback } from 'react';
import { useReservation } from '../context/ReservationContext';

export default function Sidebar() {
  const {
    employees,
    filteredEmployees,
    teams,
    myGroups,
    selectedParticipants,
    selectedEntities,
    organizer,
    requiredAttendees,
    optionalAttendees,
    attendeeTypes,
    selectionTypes,
    employeeSearchQuery,
    selectedTeamFilter,
    setEmployeeSearchQuery,
    setSelectedTeamFilter,
    addAttendee,
    addTeamAsAttendees,
    addGroupAsAttendees,
    removeEntity,
    changeEntityType,
    clearAttendees,
    // 가용시간 옵션
    employeeSchedules,
    timeSlots,
    selectedRoom,
    selectTimeRange,
    findOptimalTimes,
    showAvailability,
    setShowAvailability,
    meetingDuration,
    setMeetingDuration,
  } = useReservation();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [addAsType, setAddAsType] = useState(attendeeTypes.REQUIRED);
  const [editingEntity, setEditingEntity] = useState(null); // { type, id }
  const [draggedEntity, setDraggedEntity] = useState(null);
  const [dragOverZone, setDragOverZone] = useState(null); // 'organizer', 'required', 'optional'
  const [isTeamsFolded, setIsTeamsFolded] = useState(true);
  const [isGroupsFolded, setIsGroupsFolded] = useState(true);
  const [isEmployeesFolded, setIsEmployeesFolded] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null); // 추천 시간 상세 모달

  // 최적 시간 계산
  const optimalTimes = useMemo(() => {
    if (!findOptimalTimes || selectedParticipants.length === 0) return [];
    return findOptimalTimes(meetingDuration);
  }, [findOptimalTimes, selectedParticipants, meetingDuration]);

  // 최적 시간 적용 (회의실 선택 포함)
  const applyOptimalTime = useCallback((startTime, endTime, roomId) => {
    if (selectTimeRange && roomId) {
      const endIdx = timeSlots.findIndex(s => s >= endTime);
      const lastSlot = endIdx > 0 ? timeSlots[endIdx - 1] : timeSlots[timeSlots.length - 1];
      selectTimeRange(roomId, startTime, lastSlot);
      setSelectedRecommendation(null); // 모달 닫기
    }
  }, [selectTimeRange, timeSlots]);

  // 팀별 인원수
  const teamCounts = useMemo(() => {
    const counts = {};
    employees.forEach(emp => {
      counts[emp.teamId] = (counts[emp.teamId] || 0) + 1;
    });
    return counts;
  }, [employees]);

  // 그룹별 멤버 정보
  const groupMemberNames = useMemo(() => {
    const names = {};
    myGroups.forEach(group => {
      const members = employees.filter(e => group.members.includes(e.id));
      names[group.id] = members.slice(0, 3).map(m => m.name).join(', ') + (members.length > 3 ? ` 외 ${members.length - 3}명` : '');
    });
    return names;
  }, [myGroups, employees]);

  // 검색 필터링된 팀
  const filteredTeams = useMemo(() => {
    if (!employeeSearchQuery) return teams;
    const query = employeeSearchQuery.toLowerCase();
    return teams.filter(team => team.name.toLowerCase().includes(query));
  }, [teams, employeeSearchQuery]);

  // 검색 필터링된 그룹
  const filteredGroups = useMemo(() => {
    if (!employeeSearchQuery) return myGroups;
    const query = employeeSearchQuery.toLowerCase();
    return myGroups.filter(group =>
      group.name.toLowerCase().includes(query) ||
      group.description?.toLowerCase().includes(query) ||
      groupMemberNames[group.id]?.toLowerCase().includes(query)
    );
  }, [myGroups, employeeSearchQuery, groupMemberNames]);

  // 현재 표시할 임직원 목록 (페이지네이션)
  const [visibleCount, setVisibleCount] = useState(50);
  const visibleEmployees = filteredEmployees.slice(0, visibleCount);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 50);
  };

  const getAttendeeType = (empId) => {
    if (organizer?.id === empId) return attendeeTypes.ORGANIZER;
    if (requiredAttendees.find(a => a.id === empId)) return attendeeTypes.REQUIRED;
    if (optionalAttendees.find(a => a.id === empId)) return attendeeTypes.OPTIONAL;
    return null;
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case attendeeTypes.ORGANIZER: return '주관';
      case attendeeTypes.REQUIRED: return '필수';
      case attendeeTypes.OPTIONAL: return '선택';
      default: return '';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case attendeeTypes.ORGANIZER: return 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700';
      case attendeeTypes.REQUIRED: return 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700';
      case attendeeTypes.OPTIONAL: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
    }
  };

  const getEntityIcon = (entityType) => {
    switch (entityType) {
      case selectionTypes.TEAM:
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      default:
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
    }
  };

  // 이미 팀이 추가되었는지 확인
  const isTeamAdded = (teamId) => selectedEntities.some(e => e.type === selectionTypes.TEAM && e.id === teamId);

  // 그룹 내 멤버 중 몇 명이 추가되었는지 확인
  const getGroupAddedCount = (groupId) => {
    const group = myGroups.find(g => g.id === groupId);
    if (!group) return 0;
    return group.members.filter(memberId =>
      selectedEntities.some(e => e.type === selectionTypes.INDIVIDUAL && e.id === memberId)
    ).length;
  };

  // Entity 클릭시 유형 변경 핸들러
  const handleEntityClick = (entity) => {
    setEditingEntity({ type: entity.type, id: entity.id });
  };

  const handleTypeChange = (newType) => {
    if (editingEntity) {
      changeEntityType(editingEntity.type, editingEntity.id, newType);
      setEditingEntity(null);
    }
  };

  if (isCollapsed) {
    return (
      <aside className="w-12 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col items-center py-4 transition-colors">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
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
    <aside className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-colors">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">참석자 관리</h2>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            title="접기"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* 통합 검색 */}
        <div className="relative">
          <input
            type="text"
            placeholder="팀, 그룹, 임직원 검색..."
            value={employeeSearchQuery}
            onChange={(e) => setEmployeeSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {employeeSearchQuery && (
            <button
              onClick={() => setEmployeeSearchQuery('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
            >
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 선택된 항목 - 드래그 앤 드롭으로 유형 변경 */}
      {selectedEntities.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              선택됨 ({selectedParticipants.length}명)
            </span>
            <button
              onClick={clearAttendees}
              className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              전체 삭제
            </button>
          </div>

          {/* 드래그 드롭 영역들 */}
          <div className="space-y-2">
            {/* 주관자 영역 */}
            <DropZone
              type={attendeeTypes.ORGANIZER}
              label="주관자"
              color="purple"
              entities={selectedEntities.filter(e => e.attendeeType === attendeeTypes.ORGANIZER)}
              dragOverZone={dragOverZone}
              draggedEntity={draggedEntity}
              selectionTypes={selectionTypes}
              attendeeTypes={attendeeTypes}
              onDragStart={(entity) => setDraggedEntity(entity)}
              onDragEnd={() => { setDraggedEntity(null); setDragOverZone(null); }}
              onDragOver={(zone) => setDragOverZone(zone)}
              onDrop={(targetType) => {
                if (draggedEntity) {
                  // 팀은 주관자가 될 수 없음
                  if (draggedEntity.type === selectionTypes.TEAM && targetType === attendeeTypes.ORGANIZER) {
                    return;
                  }
                  changeEntityType(draggedEntity.type, draggedEntity.id, targetType);
                }
                setDraggedEntity(null);
                setDragOverZone(null);
              }}
              onEntityClick={handleEntityClick}
              onRemove={removeEntity}
              editingEntity={editingEntity}
              onEditClose={() => setEditingEntity(null)}
              onTypeChange={handleTypeChange}
              getEntityIcon={getEntityIcon}
              getTypeColor={getTypeColor}
            />

            {/* 필수 참석자 영역 */}
            <DropZone
              type={attendeeTypes.REQUIRED}
              label="필수"
              color="blue"
              entities={selectedEntities.filter(e => e.attendeeType === attendeeTypes.REQUIRED)}
              dragOverZone={dragOverZone}
              draggedEntity={draggedEntity}
              selectionTypes={selectionTypes}
              attendeeTypes={attendeeTypes}
              onDragStart={(entity) => setDraggedEntity(entity)}
              onDragEnd={() => { setDraggedEntity(null); setDragOverZone(null); }}
              onDragOver={(zone) => setDragOverZone(zone)}
              onDrop={(targetType) => {
                if (draggedEntity) {
                  changeEntityType(draggedEntity.type, draggedEntity.id, targetType);
                }
                setDraggedEntity(null);
                setDragOverZone(null);
              }}
              onEntityClick={handleEntityClick}
              onRemove={removeEntity}
              editingEntity={editingEntity}
              onEditClose={() => setEditingEntity(null)}
              onTypeChange={handleTypeChange}
              getEntityIcon={getEntityIcon}
              getTypeColor={getTypeColor}
            />

            {/* 선택 참석자 영역 */}
            <DropZone
              type={attendeeTypes.OPTIONAL}
              label="선택"
              color="gray"
              entities={selectedEntities.filter(e => e.attendeeType === attendeeTypes.OPTIONAL)}
              dragOverZone={dragOverZone}
              draggedEntity={draggedEntity}
              selectionTypes={selectionTypes}
              attendeeTypes={attendeeTypes}
              onDragStart={(entity) => setDraggedEntity(entity)}
              onDragEnd={() => { setDraggedEntity(null); setDragOverZone(null); }}
              onDragOver={(zone) => setDragOverZone(zone)}
              onDrop={(targetType) => {
                if (draggedEntity) {
                  changeEntityType(draggedEntity.type, draggedEntity.id, targetType);
                }
                setDraggedEntity(null);
                setDragOverZone(null);
              }}
              onEntityClick={handleEntityClick}
              onRemove={removeEntity}
              editingEntity={editingEntity}
              onEditClose={() => setEditingEntity(null)}
              onTypeChange={handleTypeChange}
              getEntityIcon={getEntityIcon}
              getTypeColor={getTypeColor}
            />
          </div>

          <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">드래그하여 유형 변경 / 클릭하여 메뉴</p>

          {/* 가용시간 옵션 */}
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showAvailability}
                onChange={(e) => setShowAvailability(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
              />
              바쁜 시간 표시
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">회의 시간:</span>
              <select
                value={meetingDuration}
                onChange={(e) => setMeetingDuration(Number(e.target.value))}
                className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">추천 시간:</div>
              <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                {optimalTimes.slice(0, 5).map((time, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedRecommendation(time)}
                    className={`w-full px-2 py-1.5 text-xs rounded transition-colors text-left flex items-center justify-between ${
                      time.isAllRequiredAvailable
                        ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50'
                        : 'bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/50'
                    }`}
                  >
                    <span>{time.startTime} - {time.endTime}</span>
                    <span className="text-[10px] opacity-70">
                      {time.isAllRequiredAvailable ? '전원 가능' : `${time.requiredScore}/${time.requiredScore + time.unavailableRequired.length}명`}
                      {' · '}{time.availableRooms.length}실
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {optimalTimes.length === 0 && selectedParticipants.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
              {meetingDuration}분 회의 가능한 시간/회의실 없음
            </div>
          )}
        </div>
      )}

      {/* 추가 시 참석자 유형 선택 */}
      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">추가 시 참석자 유형:</div>
        <div className="flex gap-1">
          {[
            { type: attendeeTypes.ORGANIZER, label: '주관자', color: 'purple' },
            { type: attendeeTypes.REQUIRED, label: '필수', color: 'blue' },
            { type: attendeeTypes.OPTIONAL, label: '선택', color: 'gray' },
          ].map(({ type, label, color }) => (
            <button
              key={type}
              onClick={() => setAddAsType(type)}
              className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${
                addAsType === type
                  ? 'ring-1'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
              style={{
                backgroundColor: addAsType === type
                  ? (color === 'purple' ? '#f3e8ff' : color === 'blue' ? '#dbeafe' : '#f3f4f6')
                  : undefined,
                color: addAsType === type
                  ? (color === 'purple' ? '#7c3aed' : color === 'blue' ? '#1d4ed8' : '#4b5563')
                  : undefined,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 통합된 팀/그룹/임직원 목록 */}
      <div className="flex-1 overflow-y-auto">
        {/* 팀 목록 */}
        {filteredTeams.length > 0 && (
          <div className="border-b border-gray-100 dark:border-gray-700">
            <button
              onClick={() => setIsTeamsFolded(!isTeamsFolded)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                조직 ({filteredTeams.length}개 팀)
              </div>
              <svg
                className={`w-4 h-4 transition-transform ${isTeamsFolded ? '-rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {!isTeamsFolded && (
              <ul>
                {filteredTeams.map(team => {
                  const added = isTeamAdded(team.id);
                  const effectiveType = addAsType === attendeeTypes.ORGANIZER ? attendeeTypes.REQUIRED : addAsType;

                  return (
                    <li
                      key={team.id}
                      className={`px-4 py-3 border-b border-gray-50 dark:border-gray-700 last:border-b-0 ${added ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{team.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{teamCounts[team.id] || 0}명</div>
                        </div>
                        {added ? (
                          <span className="px-2 py-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 rounded">
                            추가됨
                          </span>
                        ) : (
                          <button
                            onClick={() => addTeamAsAttendees(team.id, effectiveType)}
                            className="px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                          >
                            전체 추가
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* 내 그룹 목록 */}
        {filteredGroups.length > 0 && (
          <div className="border-b border-gray-100 dark:border-gray-700">
            <button
              onClick={() => setIsGroupsFolded(!isGroupsFolded)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                내 주소록 ({filteredGroups.length}개 그룹)
              </div>
              <svg
                className={`w-4 h-4 transition-transform ${isGroupsFolded ? '-rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {!isGroupsFolded && (
              <ul>
                {filteredGroups.map(group => {
                  const addedCount = getGroupAddedCount(group.id);
                  const allAdded = addedCount === group.members.length;
                  const effectiveType = addAsType === attendeeTypes.ORGANIZER ? attendeeTypes.REQUIRED : addAsType;

                  return (
                    <li
                      key={group.id}
                      className={`px-4 py-3 border-b border-gray-50 dark:border-gray-700 last:border-b-0 ${allAdded ? 'bg-green-50 dark:bg-green-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{group.name}</span>
                            {addedCount > 0 && !allAdded && (
                              <span className="text-[10px] text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-1 rounded">
                                {addedCount}/{group.members.length}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{group.description}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                            {groupMemberNames[group.id]}
                          </div>
                        </div>
                        {allAdded ? (
                          <span className="ml-2 px-2 py-1 text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 rounded flex-shrink-0">
                            추가됨
                          </span>
                        ) : (
                          <button
                            onClick={() => addGroupAsAttendees(group.id, effectiveType)}
                            className="ml-2 px-2 py-1 text-xs bg-green-50 dark:bg-green-900/50 text-green-600 dark:text-green-400 rounded hover:bg-green-100 dark:hover:bg-green-900 transition-colors flex-shrink-0"
                          >
                            추가
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* 임직원 목록 */}
        <div>
          <button
            onClick={() => setIsEmployeesFolded(!isEmployeesFolded)}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              임직원 ({filteredEmployees.length}명)
            </div>
            <svg
              className={`w-4 h-4 transition-transform ${isEmployeesFolded ? '-rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {!isEmployeesFolded && (
            <>
              {/* 부서 필터 */}
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                <select
                  value={selectedTeamFilter || ''}
                  onChange={(e) => setSelectedTeamFilter(e.target.value || null)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">전체 부서</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name} ({teamCounts[team.id]}명)</option>
                  ))}
                </select>
              </div>
              <ul>
                {visibleEmployees.map(emp => {
                  const type = getAttendeeType(emp.id);
                  const isSelected = type !== null;
                  return (
                    <li
                      key={emp.id}
                      onClick={() => addAttendee(emp, addAsType)}
                      className={`px-3 py-2 cursor-pointer transition-colors border-b border-gray-50 dark:border-gray-700 ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/30'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                          isSelected ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                        }`}>
                          {emp.name.slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{emp.name}</span>
                            {type && (
                              <span className={`px-1.5 py-0.5 text-[10px] rounded ${getTypeColor(type)}`}>
                                {getTypeLabel(type)}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {emp.department} · {emp.position}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {visibleCount < filteredEmployees.length && (
                <button
                  onClick={handleLoadMore}
                  className="w-full py-3 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                >
                  더 보기 ({filteredEmployees.length - visibleCount}명 남음)
                </button>
              )}
            </>
          )}
        </div>

        {/* 검색 결과 없음 */}
        {employeeSearchQuery && filteredTeams.length === 0 && filteredGroups.length === 0 && filteredEmployees.length === 0 && (
          <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
            "{employeeSearchQuery}" 검색 결과가 없습니다
          </div>
        )}
      </div>

      {/* 추천 시간 상세 모달 */}
      {selectedRecommendation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedRecommendation(null)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[400px] max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedRecommendation.startTime} - {selectedRecommendation.endTime}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {meetingDuration}분 회의
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRecommendation(null)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 모달 본문 */}
            <div className="px-5 py-4 max-h-[60vh] overflow-y-auto space-y-4">
              {/* 필수 참석자 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">필수 참석자</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    selectedRecommendation.isAllRequiredAvailable
                      ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                      : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300'
                  }`}>
                    {selectedRecommendation.requiredScore}/{selectedRecommendation.requiredScore + selectedRecommendation.unavailableRequired.length}명 참석 가능
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedRecommendation.availableRequired.map(p => (
                    <span key={p.id} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {p.name}
                    </span>
                  ))}
                  {selectedRecommendation.unavailableRequired.map(p => (
                    <span key={p.id} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-full">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* 선택 참석자 */}
              {(selectedRecommendation.availableOptional.length > 0 || selectedRecommendation.unavailableOptional.length > 0) && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">선택 참석자</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                      {selectedRecommendation.optionalScore}/{selectedRecommendation.optionalScore + selectedRecommendation.unavailableOptional.length}명 참석 가능
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRecommendation.availableOptional.map(p => (
                      <span key={p.id} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full border border-green-200 dark:border-green-800">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {p.name}
                      </span>
                    ))}
                    {selectedRecommendation.unavailableOptional.map(p => (
                      <span key={p.id} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 예약 가능 회의실 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">예약 가능 회의실</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                    {selectedRecommendation.availableRooms.length}개
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {selectedRecommendation.availableRooms.map(room => (
                    <button
                      key={room.id}
                      onClick={() => applyOptimalTime(selectedRecommendation.startTime, selectedRecommendation.endTime, room.id)}
                      className="flex flex-col items-start p-2.5 text-left bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 transition-colors group"
                    >
                      <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300">
                        {room.name}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        {room.capacity}인 · {room.floorId}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
                회의실을 클릭하면 해당 시간대가 자동 선택됩니다
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

// 드래그 앤 드롭 영역 컴포넌트
function DropZone({
  type,
  label,
  color,
  entities,
  dragOverZone,
  draggedEntity,
  selectionTypes,
  attendeeTypes,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onEntityClick,
  onRemove,
  editingEntity,
  onEditClose,
  onTypeChange,
  getEntityIcon,
  getTypeColor,
}) {
  const isOver = dragOverZone === type;
  const canDropHere = draggedEntity && (
    type !== attendeeTypes.ORGANIZER || draggedEntity.type !== selectionTypes.TEAM
  );

  const colorClasses = {
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/30',
      border: 'border-purple-200 dark:border-purple-700',
      hoverBorder: 'border-purple-400 dark:border-purple-500',
      text: 'text-purple-700 dark:text-purple-300',
      label: 'text-purple-600 dark:text-purple-400',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/30',
      border: 'border-blue-200 dark:border-blue-700',
      hoverBorder: 'border-blue-400 dark:border-blue-500',
      text: 'text-blue-700 dark:text-blue-300',
      label: 'text-blue-600 dark:text-blue-400',
    },
    gray: {
      bg: 'bg-gray-100 dark:bg-gray-700',
      border: 'border-gray-200 dark:border-gray-600',
      hoverBorder: 'border-gray-400 dark:border-gray-500',
      text: 'text-gray-700 dark:text-gray-300',
      label: 'text-gray-500 dark:text-gray-400',
    },
  };

  const colors = colorClasses[color];

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (canDropHere) onDragOver(type);
      }}
      onDragLeave={() => onDragOver(null)}
      onDrop={(e) => {
        e.preventDefault();
        if (canDropHere) onDrop(type);
      }}
      className={`p-2 rounded-lg border-2 border-dashed transition-all min-h-[36px] ${
        isOver && canDropHere
          ? `${colors.bg} ${colors.hoverBorder} scale-[1.02]`
          : entities.length > 0
          ? `${colors.bg} ${colors.border}`
          : `bg-white dark:bg-gray-800 ${colors.border} opacity-60`
      }`}
    >
      <div className={`text-[10px] font-medium mb-1 ${colors.label}`}>
        {label} {entities.length > 0 && `(${entities.reduce((sum, e) => sum + e.memberCount, 0)})`}
      </div>
      <div className="flex flex-wrap gap-1">
        {entities.map(entity => {
          const isEditing = editingEntity?.type === entity.type && editingEntity?.id === entity.id;
          const isTeam = entity.type === selectionTypes.TEAM;

          return (
            <div key={`${entity.type}_${entity.id}`} className="relative">
              <div
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  onDragStart(entity);
                }}
                onDragEnd={onDragEnd}
                onClick={() => onEntityClick(entity)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border cursor-grab active:cursor-grabbing hover:ring-1 hover:ring-offset-1 ${getTypeColor(entity.attendeeType)}`}
              >
                {getEntityIcon(entity.type)}
                <span className="max-w-[80px] truncate text-[11px]">
                  {entity.name}
                  {entity.memberCount > 1 && (
                    <span className="text-[9px] opacity-70 ml-0.5">
                      ({entity.memberCount})
                    </span>
                  )}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(entity.type, entity.id);
                  }}
                  className="hover:bg-black/10 rounded-full"
                >
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 유형 변경 드롭다운 */}
              {isEditing && (
                <>
                  <div className="fixed inset-0 z-10" onClick={onEditClose} />
                  <div className="absolute left-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20 min-w-[80px]">
                    {!isTeam && (
                      <button
                        onClick={() => onTypeChange(attendeeTypes.ORGANIZER)}
                        className={`w-full px-2 py-1 text-[11px] text-left hover:bg-purple-50 dark:hover:bg-purple-900/30 ${
                          entity.attendeeType === attendeeTypes.ORGANIZER ? 'font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        주관자
                      </button>
                    )}
                    <button
                      onClick={() => onTypeChange(attendeeTypes.REQUIRED)}
                      className={`w-full px-2 py-1 text-[11px] text-left hover:bg-blue-50 dark:hover:bg-blue-900/30 ${
                        entity.attendeeType === attendeeTypes.REQUIRED ? 'font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      필수
                    </button>
                    <button
                      onClick={() => onTypeChange(attendeeTypes.OPTIONAL)}
                      className={`w-full px-2 py-1 text-[11px] text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        entity.attendeeType === attendeeTypes.OPTIONAL ? 'font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      선택
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
        {entities.length === 0 && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">여기로 드래그</span>
        )}
      </div>
    </div>
  );
}
