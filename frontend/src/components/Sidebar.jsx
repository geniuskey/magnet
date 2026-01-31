import { useState, useMemo } from 'react';
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
  } = useReservation();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('teams'); // 'teams', 'employees'
  const [addAsType, setAddAsType] = useState(attendeeTypes.REQUIRED);
  const [editingEntity, setEditingEntity] = useState(null); // { type, id }
  const [draggedEntity, setDraggedEntity] = useState(null);
  const [dragOverZone, setDragOverZone] = useState(null); // 'organizer', 'required', 'optional'

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
      case attendeeTypes.ORGANIZER: return 'bg-purple-100 text-purple-700 border-purple-300';
      case attendeeTypes.REQUIRED: return 'bg-blue-100 text-blue-700 border-blue-300';
      case attendeeTypes.OPTIONAL: return 'bg-gray-100 text-gray-600 border-gray-300';
      default: return 'bg-gray-100 text-gray-600';
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
    <aside className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">참석자 관리</h2>
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

        {/* 탭 (2개만) */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {[
            { id: 'teams', label: '팀/그룹' },
            { id: 'employees', label: '임직원' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 선택된 항목 - 드래그 앤 드롭으로 유형 변경 */}
      {selectedEntities.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">
              선택됨 ({selectedParticipants.length}명)
            </span>
            <button
              onClick={clearAttendees}
              className="text-xs text-red-500 hover:text-red-700"
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

          <p className="mt-2 text-[10px] text-gray-400">드래그하여 유형 변경 / 클릭하여 메뉴</p>
        </div>
      )}

      {/* 추가 시 참석자 유형 선택 */}
      <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
        <div className="text-xs text-gray-500 mb-1.5">추가 시 참석자 유형:</div>
        <div className="flex gap-1">
          {[
            { type: attendeeTypes.ORGANIZER, label: '주관자', color: 'purple', individualOnly: true },
            { type: attendeeTypes.REQUIRED, label: '필수', color: 'blue' },
            { type: attendeeTypes.OPTIONAL, label: '선택', color: 'gray' },
          ].map(({ type, label, color, individualOnly }) => {
            // 팀/그룹 탭에서는 주관자 선택 불가
            const disabled = individualOnly && activeTab === 'teams';

            return (
              <button
                key={type}
                onClick={() => !disabled && setAddAsType(type)}
                disabled={disabled}
                className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${
                  disabled
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : addAsType === type
                      ? `ring-1`
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
                style={{
                  backgroundColor: !disabled && addAsType === type
                    ? (color === 'purple' ? '#f3e8ff' : color === 'blue' ? '#dbeafe' : '#f3f4f6')
                    : undefined,
                  color: !disabled && addAsType === type
                    ? (color === 'purple' ? '#7c3aed' : color === 'blue' ? '#1d4ed8' : '#4b5563')
                    : undefined,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 팀/그룹 탭 */}
      {activeTab === 'teams' && (
        <div className="flex-1 overflow-y-auto">
          {/* 팀 목록 */}
          <div className="border-b border-gray-100">
            <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              조직 ({teams.length}개 팀)
            </div>
            <ul>
              {teams.map(team => {
                const added = isTeamAdded(team.id);
                // 팀은 주관자가 될 수 없으므로, 주관자 선택 시 필수로 강제
                const effectiveType = addAsType === attendeeTypes.ORGANIZER ? attendeeTypes.REQUIRED : addAsType;

                return (
                  <li
                    key={team.id}
                    className={`px-4 py-3 border-b border-gray-50 last:border-b-0 ${added ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{team.name}</div>
                        <div className="text-xs text-gray-500">{teamCounts[team.id] || 0}명</div>
                      </div>
                      {added ? (
                        <span className="px-2 py-1 text-xs text-blue-600 bg-blue-100 rounded">
                          추가됨
                        </span>
                      ) : (
                        <button
                          onClick={() => addTeamAsAttendees(team.id, effectiveType)}
                          className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                        >
                          전체 추가
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* 내 그룹 목록 */}
          <div>
            <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              내 주소록 ({myGroups.length}개 그룹)
            </div>
            <ul>
              {myGroups.map(group => {
                const addedCount = getGroupAddedCount(group.id);
                const allAdded = addedCount === group.members.length;
                // 그룹도 주관자가 될 수 없으므로, 주관자 선택 시 필수로 강제
                const effectiveType = addAsType === attendeeTypes.ORGANIZER ? attendeeTypes.REQUIRED : addAsType;

                return (
                  <li
                    key={group.id}
                    className={`px-4 py-3 border-b border-gray-50 last:border-b-0 ${allAdded ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{group.name}</span>
                          {addedCount > 0 && !allAdded && (
                            <span className="text-[10px] text-green-600 bg-green-100 px-1 rounded">
                              {addedCount}/{group.members.length}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{group.description}</div>
                        <div className="text-xs text-gray-400 truncate mt-0.5">
                          {groupMemberNames[group.id]}
                        </div>
                      </div>
                      {allAdded ? (
                        <span className="ml-2 px-2 py-1 text-xs text-green-600 bg-green-100 rounded flex-shrink-0">
                          추가됨
                        </span>
                      ) : (
                        <button
                          onClick={() => addGroupAsAttendees(group.id, effectiveType)}
                          className="ml-2 px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors flex-shrink-0"
                        >
                          추가
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* 임직원 탭 */}
      {activeTab === 'employees' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 검색 및 필터 */}
          <div className="p-3 border-b border-gray-100 space-y-2">
            <div className="relative">
              <input
                type="text"
                placeholder="이름, 부서, 이메일 검색..."
                value={employeeSearchQuery}
                onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <select
              value={selectedTeamFilter || ''}
              onChange={(e) => setSelectedTeamFilter(e.target.value || null)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체 부서</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name} ({teamCounts[team.id]}명)</option>
              ))}
            </select>
          </div>

          {/* 임직원 목록 */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500 border-b border-gray-100">
              {filteredEmployees.length}명 검색됨
            </div>
            <ul>
              {visibleEmployees.map(emp => {
                const type = getAttendeeType(emp.id);
                const isSelected = type !== null;
                return (
                  <li
                    key={emp.id}
                    onClick={() => addAttendee(emp, addAsType)}
                    className={`px-3 py-2 cursor-pointer transition-colors border-b border-gray-50 ${
                      isSelected
                        ? 'bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                        isSelected ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {emp.name.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-gray-900">{emp.name}</span>
                          {type && (
                            <span className={`px-1.5 py-0.5 text-[10px] rounded ${getTypeColor(type)}`}>
                              {getTypeLabel(type)}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
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
                className="w-full py-3 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
              >
                더 보기 ({filteredEmployees.length - visibleCount}명 남음)
              </button>
            )}
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
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      hoverBorder: 'border-purple-400',
      text: 'text-purple-700',
      label: 'text-purple-600',
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      hoverBorder: 'border-blue-400',
      text: 'text-blue-700',
      label: 'text-blue-600',
    },
    gray: {
      bg: 'bg-gray-100',
      border: 'border-gray-200',
      hoverBorder: 'border-gray-400',
      text: 'text-gray-700',
      label: 'text-gray-500',
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
          : `bg-white ${colors.border} opacity-60`
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
                  <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 min-w-[80px]">
                    {!isTeam && (
                      <button
                        onClick={() => onTypeChange(attendeeTypes.ORGANIZER)}
                        className={`w-full px-2 py-1 text-[11px] text-left hover:bg-purple-50 ${
                          entity.attendeeType === attendeeTypes.ORGANIZER ? 'font-medium text-purple-600 bg-purple-50' : 'text-gray-700'
                        }`}
                      >
                        주관자
                      </button>
                    )}
                    <button
                      onClick={() => onTypeChange(attendeeTypes.REQUIRED)}
                      className={`w-full px-2 py-1 text-[11px] text-left hover:bg-blue-50 ${
                        entity.attendeeType === attendeeTypes.REQUIRED ? 'font-medium text-blue-600 bg-blue-50' : 'text-gray-700'
                      }`}
                    >
                      필수
                    </button>
                    <button
                      onClick={() => onTypeChange(attendeeTypes.OPTIONAL)}
                      className={`w-full px-2 py-1 text-[11px] text-left hover:bg-gray-100 ${
                        entity.attendeeType === attendeeTypes.OPTIONAL ? 'font-medium text-gray-600 bg-gray-100' : 'text-gray-700'
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
          <span className="text-[10px] text-gray-400 italic">여기로 드래그</span>
        )}
      </div>
    </div>
  );
}
