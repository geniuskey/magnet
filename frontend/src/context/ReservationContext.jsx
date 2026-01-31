import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';

const ReservationContext = createContext(null);

const STORAGE_KEY = 'meeting_scheduler_preferences';
const MY_RESERVATIONS_KEY = 'my_reservations';

// 한국 이름 생성용 데이터
const LAST_NAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍'];
const FIRST_NAMES = ['민준', '서준', '도윤', '예준', '시우', '하준', '주원', '지호', '지훈', '준서', '준우', '현우', '건우', '우진', '지민', '서연', '서윤', '지우', '서현', '민서', '하은', '하윤', '윤서', '지유', '채원', '수아', '지아', '지윤', '다은', '은서', '수빈', '예은', '소율', '유진', '예진', '수현', '채은', '지원', '소연', '유나'];
const POSITIONS = ['인턴', '사원', '주임', '대리', '과장', '차장', '부장', '팀장'];

// 팀 정의
const MOCK_TEAMS = [
  { id: 'team_dev', name: '개발팀', memberCount: 100 },
  { id: 'team_eng', name: '설계팀', memberCount: 200 },
  { id: 'team_design', name: '디자인팀', memberCount: 50 },
  { id: 'team_plan', name: '기획팀', memberCount: 20 },
  { id: 'team_marketing', name: '마케팅팀', memberCount: 30 },
  { id: 'team_hr', name: '인사팀', memberCount: 10 },
];

// 직원 생성 함수
const generateEmployees = () => {
  const employees = [];
  let empId = 1;

  MOCK_TEAMS.forEach(team => {
    for (let i = 0; i < team.memberCount; i++) {
      const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const position = i === 0 ? '팀장' : POSITIONS[Math.floor(Math.random() * (POSITIONS.length - 1))];

      employees.push({
        id: `emp_${String(empId).padStart(4, '0')}`,
        name: `${lastName}${firstName}`,
        department: team.name,
        teamId: team.id,
        position,
        email: `user${empId}@company.com`,
      });
      empId++;
    }
  });

  return employees;
};

const MOCK_EMPLOYEES = generateEmployees();

// 내 주소록 그룹 생성 (10개 그룹, 각 10명씩)
const generateMyGroups = (employees) => {
  const groups = [
    { id: 'grp_001', name: '프로젝트 A팀', description: '신규 서비스 개발' },
    { id: 'grp_002', name: '프로젝트 B팀', description: '레거시 마이그레이션' },
    { id: 'grp_003', name: '주간 회의 멤버', description: '매주 월요일 정기 회의' },
    { id: 'grp_004', name: '디자인 리뷰어', description: 'UI/UX 리뷰 담당자' },
    { id: 'grp_005', name: '코드 리뷰어', description: '코드 리뷰 담당자' },
    { id: 'grp_006', name: '팀장 모임', description: '각 팀 팀장들' },
    { id: 'grp_007', name: '신입 교육 담당', description: '신입사원 멘토링' },
    { id: 'grp_008', name: '해외 출장팀', description: '해외 파트너사 미팅' },
    { id: 'grp_009', name: '긴급 대응팀', description: '장애 대응 담당' },
    { id: 'grp_010', name: '워크샵 참석자', description: '분기별 워크샵' },
  ];

  // 각 그룹에 랜덤 10명 배정
  const shuffled = [...employees].sort(() => Math.random() - 0.5);
  let idx = 0;

  return groups.map(group => ({
    ...group,
    members: shuffled.slice(idx, idx += 10).map(e => e.id),
  }));
};

const MOCK_MY_GROUPS = generateMyGroups(MOCK_EMPLOYEES);

// 직원별 바쁜 시간대 생성 (랜덤)
const generateEmployeeSchedules = (employees) => {
  const schedules = {};
  const today = new Date().toISOString().split('T')[0];
  const meetingTitles = ['팀 미팅', '1:1 면담', '코드 리뷰', '설계 검토', '스프린트 계획', '기획 회의', '디자인 리뷰', '고객 미팅', '교육', '워크샵'];

  employees.forEach(emp => {
    // 30% 확률로 일정 생성
    if (Math.random() < 0.3) {
      const numMeetings = Math.floor(Math.random() * 3) + 1;
      schedules[emp.id] = [];

      for (let i = 0; i < numMeetings; i++) {
        const startHour = 9 + Math.floor(Math.random() * 8);
        const duration = [30, 60, 90, 120][Math.floor(Math.random() * 4)];
        const startTime = `${startHour.toString().padStart(2, '0')}:00`;
        const endHour = startHour + Math.floor(duration / 60);
        const endMin = duration % 60;
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;

        schedules[emp.id].push({
          date: today,
          startTime,
          endTime,
          title: meetingTitles[Math.floor(Math.random() * meetingTitles.length)],
        });
      }
    }
  });

  return schedules;
};

const MOCK_EMPLOYEE_SCHEDULES = generateEmployeeSchedules(MOCK_EMPLOYEES);

// 참석자 유형
const ATTENDEE_TYPES = {
  ORGANIZER: 'organizer',      // 주관자
  REQUIRED: 'required',        // 필수 참석자
  OPTIONAL: 'optional',        // 선택 참석자
};

// 선택 항목 유형 (팀, 그룹, 개인)
const SELECTION_TYPES = {
  TEAM: 'team',
  GROUP: 'group',
  INDIVIDUAL: 'individual',
};

const MOCK_BUILDINGS = [
  { id: 'building_a', name: '본관' },
  { id: 'building_b', name: '별관' },
  { id: 'building_c', name: '신관' },
];

const MOCK_FLOORS = {
  building_a: [
    { id: 'floor_a_1', name: '1층', buildingId: 'building_a' },
    { id: 'floor_a_2', name: '2층', buildingId: 'building_a' },
    { id: 'floor_a_3', name: '3층', buildingId: 'building_a' },
  ],
  building_b: [
    { id: 'floor_b_1', name: '1층', buildingId: 'building_b' },
    { id: 'floor_b_2', name: '2층', buildingId: 'building_b' },
  ],
  building_c: [
    { id: 'floor_c_1', name: '1층', buildingId: 'building_c' },
    { id: 'floor_c_2', name: '2층', buildingId: 'building_c' },
    { id: 'floor_c_3', name: '3층', buildingId: 'building_c' },
    { id: 'floor_c_4', name: '4층', buildingId: 'building_c' },
  ],
};

const MOCK_ROOMS = {
  floor_a_1: [
    { id: 'room_a1_1', name: '회의실 A', capacity: 6, floorId: 'floor_a_1', buildingId: 'building_a', buildingName: '본관', floorName: '1층' },
    { id: 'room_a1_2', name: '회의실 B', capacity: 8, floorId: 'floor_a_1', buildingId: 'building_a', buildingName: '본관', floorName: '1층' },
  ],
  floor_a_2: [
    { id: 'room_a2_1', name: '대회의실', capacity: 20, floorId: 'floor_a_2', buildingId: 'building_a', buildingName: '본관', floorName: '2층' },
    { id: 'room_a2_2', name: '소회의실 1', capacity: 4, floorId: 'floor_a_2', buildingId: 'building_a', buildingName: '본관', floorName: '2층' },
    { id: 'room_a2_3', name: '소회의실 2', capacity: 4, floorId: 'floor_a_2', buildingId: 'building_a', buildingName: '본관', floorName: '2층' },
  ],
  floor_a_3: [
    { id: 'room_a3_1', name: '임원회의실', capacity: 12, floorId: 'floor_a_3', buildingId: 'building_a', buildingName: '본관', floorName: '3층' },
  ],
  floor_b_1: [
    { id: 'room_b1_1', name: '미팅룸 1', capacity: 6, floorId: 'floor_b_1', buildingId: 'building_b', buildingName: '별관', floorName: '1층' },
    { id: 'room_b1_2', name: '미팅룸 2', capacity: 6, floorId: 'floor_b_1', buildingId: 'building_b', buildingName: '별관', floorName: '1층' },
  ],
  floor_b_2: [
    { id: 'room_b2_1', name: '세미나실', capacity: 30, floorId: 'floor_b_2', buildingId: 'building_b', buildingName: '별관', floorName: '2층' },
  ],
  floor_c_1: [
    { id: 'room_c1_1', name: '상담실 1', capacity: 4, floorId: 'floor_c_1', buildingId: 'building_c', buildingName: '신관', floorName: '1층' },
    { id: 'room_c1_2', name: '상담실 2', capacity: 4, floorId: 'floor_c_1', buildingId: 'building_c', buildingName: '신관', floorName: '1층' },
  ],
  floor_c_2: [
    { id: 'room_c2_1', name: '프로젝트룸 A', capacity: 8, floorId: 'floor_c_2', buildingId: 'building_c', buildingName: '신관', floorName: '2층' },
    { id: 'room_c2_2', name: '프로젝트룸 B', capacity: 8, floorId: 'floor_c_2', buildingId: 'building_c', buildingName: '신관', floorName: '2층' },
  ],
  floor_c_3: [
    { id: 'room_c3_1', name: '교육장', capacity: 40, floorId: 'floor_c_3', buildingId: 'building_c', buildingName: '신관', floorName: '3층' },
  ],
  floor_c_4: [
    { id: 'room_c4_1', name: '스튜디오', capacity: 10, floorId: 'floor_c_4', buildingId: 'building_c', buildingName: '신관', floorName: '4층' },
  ],
};

const ALL_ROOMS = Object.values(MOCK_ROOMS).flat();

// 시간 슬롯 생성 (06:00 ~ 24:00, 10분 단위)
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 6; hour < 24; hour++) {
    for (let min = 0; min < 60; min += 10) {
      slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

// Mock 예약 데이터 생성
const generateMockReservations = () => {
  const reservations = {};
  const rooms = Object.values(MOCK_ROOMS).flat();

  rooms.forEach(room => {
    reservations[room.id] = {};
    TIME_SLOTS.forEach(slot => {
      if (Math.random() < 0.03) {
        const duration = [30, 60, 90][Math.floor(Math.random() * 3)];
        reservations[room.id][slot] = {
          id: `res_${room.id}_${slot}`,
          roomId: room.id,
          startTime: slot,
          endTime: addMinutes(slot, duration),
          title: ['팀 회의', '프로젝트 회의', '고객 미팅', '교육'][Math.floor(Math.random() * 4)],
          organizer: MOCK_EMPLOYEES[Math.floor(Math.random() * MOCK_EMPLOYEES.length)].name,
          participants: [],
          isMyReservation: false,
        };
      }
    });
  });

  return reservations;
};

const addMinutes = (time, minutes) => {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
};

const timeToMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

// localStorage 유틸
const loadPreferences = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
};

const savePreferences = (buildingId, floorId) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ buildingId, floorId }));
  } catch (e) {}
};

const loadMyReservations = () => {
  try {
    const saved = localStorage.getItem(MY_RESERVATIONS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
};

const saveMyReservations = (reservations) => {
  try {
    localStorage.setItem(MY_RESERVATIONS_KEY, JSON.stringify(reservations));
  } catch (e) {}
};

// 반복 패턴
const RECURRENCE_TYPES = {
  NONE: 'none',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
};

export function ReservationProvider({ children }) {
  // 선택된 항목 (팀, 그룹, 개인 단위로 관리)
  // { type: 'team'|'group'|'individual', id, name, attendeeType, memberIds }
  const [selectedEntities, setSelectedEntities] = useState([]);

  // 참석자 상태 (유형별로 관리) - 개별 직원 레벨
  const [organizer, setOrganizer] = useState(null); // 주관자 (1명)
  const [requiredAttendees, setRequiredAttendees] = useState([]); // 필수 참석자
  const [optionalAttendees, setOptionalAttendees] = useState([]); // 선택 참석자

  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [reservations, setReservations] = useState(() => generateMockReservations());
  const [myReservations, setMyReservations] = useState(() => loadMyReservations());
  const [meetingTitle, setMeetingTitle] = useState('');
  const [recurrence, setRecurrence] = useState(RECURRENCE_TYPES.NONE);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [showMyReservations, setShowMyReservations] = useState(false);

  // 검색/필터 상태
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState(null);

  const employees = MOCK_EMPLOYEES;
  const employeeSchedules = MOCK_EMPLOYEE_SCHEDULES;
  const teams = MOCK_TEAMS;
  const myGroups = MOCK_MY_GROUPS;
  const buildings = MOCK_BUILDINGS;
  const floors = selectedBuilding ? (MOCK_FLOORS[selectedBuilding.id] || []) : [];
  const rooms = selectedFloor ? (MOCK_ROOMS[selectedFloor.id] || []) : [];
  const allRooms = ALL_ROOMS;
  const timeSlots = TIME_SLOTS;
  const recurrenceTypes = RECURRENCE_TYPES;
  const attendeeTypes = ATTENDEE_TYPES;
  const selectionTypes = SELECTION_TYPES;

  // 필터링된 직원 목록
  const filteredEmployees = useMemo(() => {
    let result = employees;

    // 팀 필터
    if (selectedTeamFilter) {
      result = result.filter(e => e.teamId === selectedTeamFilter);
    }

    // 검색어 필터
    if (employeeSearchQuery.trim()) {
      const query = employeeSearchQuery.toLowerCase();
      result = result.filter(e =>
        e.name.toLowerCase().includes(query) ||
        e.department.toLowerCase().includes(query) ||
        e.email.toLowerCase().includes(query)
      );
    }

    return result;
  }, [employees, selectedTeamFilter, employeeSearchQuery]);

  // 모든 선택된 참석자 (하위 호환성)
  const selectedParticipants = useMemo(() => {
    const all = [];
    if (organizer) all.push({ ...organizer, attendeeType: ATTENDEE_TYPES.ORGANIZER });
    requiredAttendees.forEach(a => all.push({ ...a, attendeeType: ATTENDEE_TYPES.REQUIRED }));
    optionalAttendees.forEach(a => all.push({ ...a, attendeeType: ATTENDEE_TYPES.OPTIONAL }));
    return all;
  }, [organizer, requiredAttendees, optionalAttendees]);

  // 초기 로드
  useEffect(() => {
    const prefs = loadPreferences();
    if (prefs) {
      const building = MOCK_BUILDINGS.find(b => b.id === prefs.buildingId);
      if (building) {
        setSelectedBuilding(building);
        if (prefs.floorId) {
          const floorList = MOCK_FLOORS[building.id] || [];
          const floor = floorList.find(f => f.id === prefs.floorId);
          if (floor) setSelectedFloor(floor);
        }
      }
    }
    setIsInitialized(true);
  }, []);

  // 내 예약 저장
  useEffect(() => {
    if (isInitialized) {
      saveMyReservations(myReservations);
    }
  }, [myReservations, isInitialized]);

  // 개인 추가 (entity로도 추적) - addAttendee 보다 먼저 정의되어야 함
  const addIndividualAttendee = useCallback((employee, type = ATTENDEE_TYPES.REQUIRED) => {
    // 이미 추가된 경우 무시
    if (organizer?.id === employee.id) return;
    if (requiredAttendees.find(a => a.id === employee.id)) return;
    if (optionalAttendees.find(a => a.id === employee.id)) return;

    // 선택 항목에 개인 추가
    setSelectedEntities(prev => [...prev, {
      type: SELECTION_TYPES.INDIVIDUAL,
      id: employee.id,
      name: employee.name,
      attendeeType: type,
      memberIds: [employee.id],
      memberCount: 1,
      department: employee.department,
    }]);

    // 새로 추가
    switch (type) {
      case ATTENDEE_TYPES.ORGANIZER:
        setOrganizer(employee);
        break;
      case ATTENDEE_TYPES.REQUIRED:
        setRequiredAttendees(prev => [...prev, employee]);
        break;
      case ATTENDEE_TYPES.OPTIONAL:
        setOptionalAttendees(prev => [...prev, employee]);
        break;
    }
  }, [organizer, requiredAttendees, optionalAttendees]);

  // 참석자 추가 (타입 지정) - 토글 방식
  const addAttendee = useCallback((employee, type = ATTENDEE_TYPES.REQUIRED) => {
    // 이미 추가된 경우 제거 (entity도 함께 제거)
    if (organizer?.id === employee.id) {
      setOrganizer(null);
      setSelectedEntities(prev => prev.filter(e => !(e.type === SELECTION_TYPES.INDIVIDUAL && e.id === employee.id)));
      return;
    }
    if (requiredAttendees.find(a => a.id === employee.id)) {
      setRequiredAttendees(prev => prev.filter(a => a.id !== employee.id));
      setSelectedEntities(prev => prev.filter(e => !(e.type === SELECTION_TYPES.INDIVIDUAL && e.id === employee.id)));
      return;
    }
    if (optionalAttendees.find(a => a.id === employee.id)) {
      setOptionalAttendees(prev => prev.filter(a => a.id !== employee.id));
      setSelectedEntities(prev => prev.filter(e => !(e.type === SELECTION_TYPES.INDIVIDUAL && e.id === employee.id)));
      return;
    }

    // 새로 추가 (entity tracking 포함)
    addIndividualAttendee(employee, type);
  }, [organizer, requiredAttendees, optionalAttendees, addIndividualAttendee]);

  // 참석자 제거
  const removeAttendee = useCallback((employeeId) => {
    if (organizer?.id === employeeId) {
      setOrganizer(null);
      return;
    }
    setRequiredAttendees(prev => prev.filter(a => a.id !== employeeId));
    setOptionalAttendees(prev => prev.filter(a => a.id !== employeeId));
  }, [organizer]);

  // 참석자 타입 변경
  const changeAttendeeType = useCallback((employeeId, newType) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;

    // 기존에서 제거
    setOrganizer(prev => prev?.id === employeeId ? null : prev);
    setRequiredAttendees(prev => prev.filter(a => a.id !== employeeId));
    setOptionalAttendees(prev => prev.filter(a => a.id !== employeeId));

    // 새 타입으로 추가
    switch (newType) {
      case ATTENDEE_TYPES.ORGANIZER:
        setOrganizer(employee);
        break;
      case ATTENDEE_TYPES.REQUIRED:
        setRequiredAttendees(prev => [...prev, employee]);
        break;
      case ATTENDEE_TYPES.OPTIONAL:
        setOptionalAttendees(prev => [...prev, employee]);
        break;
    }
  }, [employees]);

  // 팀 전체 추가
  const addTeamAsAttendees = useCallback((teamId, type = ATTENDEE_TYPES.REQUIRED) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    // 이미 같은 팀이 추가되어 있는지 확인
    const existingEntity = selectedEntities.find(
      e => e.type === SELECTION_TYPES.TEAM && e.id === teamId
    );
    if (existingEntity) return;

    const teamMembers = employees.filter(e => e.teamId === teamId);
    const existingIds = new Set([
      organizer?.id,
      ...requiredAttendees.map(a => a.id),
      ...optionalAttendees.map(a => a.id),
    ].filter(Boolean));

    const newMembers = teamMembers.filter(m => !existingIds.has(m.id));

    // 선택 항목에 팀 추가
    setSelectedEntities(prev => [...prev, {
      type: SELECTION_TYPES.TEAM,
      id: teamId,
      name: team.name,
      attendeeType: type,
      memberIds: teamMembers.map(m => m.id),
      memberCount: teamMembers.length,
    }]);

    if (type === ATTENDEE_TYPES.REQUIRED) {
      setRequiredAttendees(prev => [...prev, ...newMembers]);
    } else if (type === ATTENDEE_TYPES.OPTIONAL) {
      setOptionalAttendees(prev => [...prev, ...newMembers]);
    }
  }, [employees, teams, organizer, requiredAttendees, optionalAttendees, selectedEntities]);

  // 그룹 전체 추가 (개별 인원으로 추가, 그룹 단위 X)
  const addGroupAsAttendees = useCallback((groupId, type = ATTENDEE_TYPES.REQUIRED) => {
    const group = myGroups.find(g => g.id === groupId);
    if (!group) return;

    const groupMembers = employees.filter(e => group.members.includes(e.id));
    const existingIds = new Set([
      organizer?.id,
      ...requiredAttendees.map(a => a.id),
      ...optionalAttendees.map(a => a.id),
    ].filter(Boolean));

    const newMembers = groupMembers.filter(m => !existingIds.has(m.id));

    // 각 멤버를 개별 entity로 추가
    const newEntities = newMembers.map(member => ({
      type: SELECTION_TYPES.INDIVIDUAL,
      id: member.id,
      name: member.name,
      attendeeType: type,
      memberIds: [member.id],
      memberCount: 1,
      department: member.department,
    }));

    setSelectedEntities(prev => [...prev, ...newEntities]);

    if (type === ATTENDEE_TYPES.REQUIRED) {
      setRequiredAttendees(prev => [...prev, ...newMembers]);
    } else if (type === ATTENDEE_TYPES.OPTIONAL) {
      setOptionalAttendees(prev => [...prev, ...newMembers]);
    }
  }, [employees, myGroups, organizer, requiredAttendees, optionalAttendees]);

  // 선택 항목 제거 (팀/개인)
  const removeEntity = useCallback((entityType, entityId) => {
    const entity = selectedEntities.find(e => e.type === entityType && e.id === entityId);
    if (!entity) return;

    // 선택 항목에서 제거
    setSelectedEntities(prev => prev.filter(e => !(e.type === entityType && e.id === entityId)));

    // 해당 멤버들 제거
    const memberIdsToRemove = new Set(entity.memberIds);

    if (organizer && memberIdsToRemove.has(organizer.id)) {
      setOrganizer(null);
    }
    setRequiredAttendees(prev => prev.filter(a => !memberIdsToRemove.has(a.id)));
    setOptionalAttendees(prev => prev.filter(a => !memberIdsToRemove.has(a.id)));
  }, [selectedEntities, organizer]);

  // 선택된 항목의 참석자 유형 변경
  const changeEntityType = useCallback((entityType, entityId, newAttendeeType) => {
    const entity = selectedEntities.find(e => e.type === entityType && e.id === entityId);
    if (!entity) return;

    // 팀은 주관자가 될 수 없음
    if (entityType === SELECTION_TYPES.TEAM && newAttendeeType === ATTENDEE_TYPES.ORGANIZER) {
      return;
    }

    // 개인이 주관자가 되는 경우, 기존 주관자 처리
    if (entityType === SELECTION_TYPES.INDIVIDUAL && newAttendeeType === ATTENDEE_TYPES.ORGANIZER) {
      // 기존 주관자가 있으면 필수 참석자로 변경
      if (organizer) {
        setRequiredAttendees(prev => [...prev, organizer]);
        // 기존 주관자 entity의 타입도 변경
        setSelectedEntities(prev => prev.map(e =>
          e.type === SELECTION_TYPES.INDIVIDUAL && e.id === organizer.id
            ? { ...e, attendeeType: ATTENDEE_TYPES.REQUIRED }
            : e
        ));
      }

      // 새 주관자 설정
      const emp = employees.find(e => e.id === entityId);
      if (emp) {
        setOrganizer(emp);
        // 기존 참석자 목록에서 제거
        setRequiredAttendees(prev => prev.filter(a => a.id !== entityId));
        setOptionalAttendees(prev => prev.filter(a => a.id !== entityId));
      }
    } else {
      // 주관자에서 다른 타입으로 변경
      if (entity.attendeeType === ATTENDEE_TYPES.ORGANIZER) {
        setOrganizer(null);
        const emp = employees.find(e => e.id === entityId);
        if (emp) {
          if (newAttendeeType === ATTENDEE_TYPES.REQUIRED) {
            setRequiredAttendees(prev => [...prev, emp]);
          } else {
            setOptionalAttendees(prev => [...prev, emp]);
          }
        }
      } else {
        // 필수 <-> 선택 변경
        const memberIds = entity.memberIds;
        const members = employees.filter(e => memberIds.includes(e.id));

        if (newAttendeeType === ATTENDEE_TYPES.REQUIRED) {
          setOptionalAttendees(prev => prev.filter(a => !memberIds.includes(a.id)));
          setRequiredAttendees(prev => [...prev.filter(a => !memberIds.includes(a.id)), ...members]);
        } else {
          setRequiredAttendees(prev => prev.filter(a => !memberIds.includes(a.id)));
          setOptionalAttendees(prev => [...prev.filter(a => !memberIds.includes(a.id)), ...members]);
        }
      }
    }

    // entity의 attendeeType 업데이트
    setSelectedEntities(prev => prev.map(e =>
      e.type === entityType && e.id === entityId
        ? { ...e, attendeeType: newAttendeeType }
        : e
    ));
  }, [selectedEntities, employees, organizer]);

  // 참석자 전체 초기화
  const clearAttendees = useCallback(() => {
    setSelectedEntities([]);
    setOrganizer(null);
    setRequiredAttendees([]);
    setOptionalAttendees([]);
  }, []);

  // 하위 호환성을 위한 toggleParticipant
  const toggleParticipant = useCallback((employee) => {
    addAttendee(employee, ATTENDEE_TYPES.REQUIRED);
  }, [addAttendee]);

  const selectBuilding = useCallback((building) => {
    setSelectedBuilding(building);
    setSelectedFloor(null);
    setSelectedRoom(null);
    setSelectedTimeSlots([]);
    if (building) savePreferences(building.id, null);
  }, []);

  const selectFloor = useCallback((floor) => {
    setSelectedFloor(floor);
    setSelectedRoom(null);
    setSelectedTimeSlots([]);
    if (floor && selectedBuilding) savePreferences(selectedBuilding.id, floor.id);
  }, [selectedBuilding]);

  const toggleTimeSlot = useCallback((roomId, timeSlot) => {
    if (reservations[roomId]?.[timeSlot]) return;
    setSelectedRoom(roomId);
    setSelectedTimeSlots(prev => {
      const key = `${roomId}_${timeSlot}`;
      const exists = prev.find(s => s.key === key);
      if (exists) {
        const filtered = prev.filter(s => s.key !== key);
        if (filtered.length === 0) setSelectedRoom(null);
        return filtered;
      }
      const sameRoom = prev.filter(s => s.roomId === roomId);
      return [...sameRoom, { key, roomId, timeSlot }];
    });
  }, [reservations]);

  const selectTimeRange = useCallback((roomId, startSlot, endSlot) => {
    const startIdx = TIME_SLOTS.indexOf(startSlot);
    const endIdx = TIME_SLOTS.indexOf(endSlot);
    if (startIdx === -1 || endIdx === -1) return;

    const minIdx = Math.min(startIdx, endIdx);
    const maxIdx = Math.max(startIdx, endIdx);

    const newSlots = [];
    for (let i = minIdx; i <= maxIdx; i++) {
      const slot = TIME_SLOTS[i];
      if (!reservations[roomId]?.[slot]) {
        newSlots.push({ key: `${roomId}_${slot}`, roomId, timeSlot: slot });
      }
    }

    if (newSlots.length > 0) {
      setSelectedRoom(roomId);
      setSelectedTimeSlots(newSlots);
    }
  }, [reservations]);

  const clearSelection = useCallback(() => {
    setSelectedTimeSlots([]);
    setSelectedRoom(null);
  }, []);

  // 반복 일정 날짜 계산
  const getRecurringDates = useCallback((startDate, endDate, pattern) => {
    const dates = [startDate];
    if (pattern === RECURRENCE_TYPES.NONE || !endDate) return dates;

    let current = new Date(startDate);
    const end = new Date(endDate);

    while (current < end) {
      switch (pattern) {
        case RECURRENCE_TYPES.DAILY:
          current.setDate(current.getDate() + 1);
          break;
        case RECURRENCE_TYPES.WEEKLY:
          current.setDate(current.getDate() + 7);
          break;
        case RECURRENCE_TYPES.BIWEEKLY:
          current.setDate(current.getDate() + 14);
          break;
        case RECURRENCE_TYPES.MONTHLY:
          current.setMonth(current.getMonth() + 1);
          break;
        default:
          return dates;
      }
      if (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
      }
    }
    return dates;
  }, []);

  // 예약 생성
  const createReservation = useCallback(async (options = {}) => {
    const {
      title = meetingTitle,
      roomId = selectedRoom,
      slots = selectedTimeSlots,
      date = selectedDate,
      recurrencePattern = recurrence,
      recurrenceEnd = recurrenceEndDate,
      meetingOrganizer = organizer,
      meetingRequired = requiredAttendees,
      meetingOptional = optionalAttendees,
    } = options;

    if (!roomId || slots.length === 0 || !title) {
      return { success: false, error: '필수 정보를 입력해주세요.' };
    }

    const sortedSlots = [...slots].sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
    const startTime = sortedSlots[0].timeSlot;
    const endTime = addMinutes(sortedSlots[sortedSlots.length - 1].timeSlot, 10);

    const room = allRooms.find(r => r.id === roomId);
    const dates = getRecurringDates(date, recurrenceEnd, recurrencePattern);

    const newReservations = dates.map((d, idx) => ({
      id: `res_${Date.now()}_${idx}`,
      roomId,
      roomName: room?.name || '',
      buildingName: room?.buildingName || '',
      floorName: room?.floorName || '',
      startTime,
      endTime,
      title,
      // 주관자
      organizer: meetingOrganizer ? meetingOrganizer.name : '나',
      organizerId: meetingOrganizer?.id || null,
      // 필수 참석자
      requiredAttendees: meetingRequired.map(p => ({ id: p.id, name: p.name })),
      // 선택 참석자
      optionalAttendees: meetingOptional.map(p => ({ id: p.id, name: p.name })),
      // 모든 참석자 (하위 호환)
      participants: [
        meetingOrganizer?.name,
        ...meetingRequired.map(p => p.name),
        ...meetingOptional.map(p => p.name),
      ].filter(Boolean),
      participantIds: [
        meetingOrganizer?.id,
        ...meetingRequired.map(p => p.id),
        ...meetingOptional.map(p => p.id),
      ].filter(Boolean),
      date: d,
      isMyReservation: true,
      recurrence: recurrencePattern,
      recurrenceGroupId: dates.length > 1 ? `group_${Date.now()}` : null,
    }));

    // 예약 추가 (회의실 예약)
    setReservations(prev => {
      const updated = { ...prev };
      newReservations.forEach(res => {
        if (!updated[roomId]) updated[roomId] = {};
        sortedSlots.forEach(slot => {
          updated[roomId][slot.timeSlot] = res;
        });
      });
      return updated;
    });

    // 내 예약에 추가
    setMyReservations(prev => [...prev, ...newReservations]);

    // TODO: 여기서 캘린더 API를 호출하여 각 참석자의 일정에 등록
    // await calendarApi.createEvent(newReservations, participantIds);

    // 초기화
    clearSelection();
    clearAttendees(); // selectedEntities도 함께 초기화됨
    setMeetingTitle('');
    setRecurrence(RECURRENCE_TYPES.NONE);
    setRecurrenceEndDate('');

    return { success: true, reservations: newReservations };
  }, [selectedRoom, selectedTimeSlots, meetingTitle, selectedDate, recurrence, recurrenceEndDate, organizer, requiredAttendees, optionalAttendees, allRooms, getRecurringDates, clearSelection, clearAttendees]);

  // 예약 삭제
  const deleteReservation = useCallback((reservationId, deleteAll = false) => {
    const reservation = myReservations.find(r => r.id === reservationId);
    if (!reservation) return;

    let idsToDelete = [reservationId];
    if (deleteAll && reservation.recurrenceGroupId) {
      idsToDelete = myReservations
        .filter(r => r.recurrenceGroupId === reservation.recurrenceGroupId)
        .map(r => r.id);
    }

    setMyReservations(prev => prev.filter(r => !idsToDelete.includes(r.id)));

    setReservations(prev => {
      const updated = { ...prev };
      idsToDelete.forEach(id => {
        const res = myReservations.find(r => r.id === id);
        if (res && updated[res.roomId]) {
          Object.keys(updated[res.roomId]).forEach(slot => {
            if (updated[res.roomId][slot]?.id === id) {
              delete updated[res.roomId][slot];
            }
          });
        }
      });
      return updated;
    });
  }, [myReservations]);

  // 예약 수정
  const updateReservation = useCallback((reservationId, updates) => {
    setMyReservations(prev =>
      prev.map(r => r.id === reservationId ? { ...r, ...updates } : r)
    );

    setReservations(prev => {
      const updated = { ...prev };
      const reservation = myReservations.find(r => r.id === reservationId);
      if (reservation && updated[reservation.roomId]) {
        Object.keys(updated[reservation.roomId]).forEach(slot => {
          if (updated[reservation.roomId][slot]?.id === reservationId) {
            updated[reservation.roomId][slot] = {
              ...updated[reservation.roomId][slot],
              ...updates,
            };
          }
        });
      }
      return updated;
    });
  }, [myReservations]);

  // 참여자들의 공통 가능 시간 찾기 (정시 단위로 추천)
  const findOptimalTimes = useCallback((participantIds, date, durationMinutes = 60) => {
    if (participantIds.length === 0) return [];

    const busySlots = new Set();

    // 각 참여자의 바쁜 시간대 수집
    participantIds.forEach(empId => {
      const schedule = employeeSchedules[empId] || [];
      schedule
        .filter(s => s.date === date)
        .forEach(s => {
          const startMin = timeToMinutes(s.startTime);
          const endMin = timeToMinutes(s.endTime);
          for (let t = startMin; t < endMin; t += 10) {
            const h = Math.floor(t / 60);
            const m = t % 60;
            busySlots.add(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
          }
        });
    });

    // 정시(00분) 시작 시간만 필터링
    const hourlySlotIndices = TIME_SLOTS
      .map((slot, idx) => ({ slot, idx }))
      .filter(({ slot }) => slot.endsWith(':00'))
      .map(({ idx }) => idx);

    // 연속된 빈 시간대 찾기 (정시 단위로만)
    const slotsNeeded = Math.ceil(durationMinutes / 10);
    const availableRanges = [];

    for (const startIdx of hourlySlotIndices) {
      // 범위를 벗어나면 스킵
      if (startIdx + slotsNeeded > TIME_SLOTS.length) continue;

      let allFree = true;
      for (let j = 0; j < slotsNeeded; j++) {
        if (busySlots.has(TIME_SLOTS[startIdx + j])) {
          allFree = false;
          break;
        }
      }
      if (allFree) {
        const startTime = TIME_SLOTS[startIdx];
        const endTime = addMinutes(TIME_SLOTS[startIdx + slotsNeeded - 1], 10);
        // 업무 시간 내 (09:00 ~ 18:00) 우선
        const startHour = parseInt(startTime.split(':')[0]);
        const priority = startHour >= 9 && startHour < 18 ? 1 : 2;
        availableRanges.push({ startTime, endTime, priority });
      }
    }

    // 우선순위 정렬 후 상위 5개 반환
    return availableRanges
      .sort((a, b) => a.priority - b.priority || a.startTime.localeCompare(b.startTime))
      .slice(0, 5);
  }, [employeeSchedules]);

  // LLM 제어용 함수들
  const setParticipantsByNames = useCallback((names, type = ATTENDEE_TYPES.REQUIRED) => {
    const participants = employees.filter(e =>
      names.some(name => e.name.includes(name) || name.includes(e.name))
    );
    // 기존 참석자 초기화 후 추가
    if (type === ATTENDEE_TYPES.REQUIRED) {
      setRequiredAttendees(participants);
    } else if (type === ATTENDEE_TYPES.OPTIONAL) {
      setOptionalAttendees(participants);
    }
    return participants;
  }, [employees]);

  const setBuildingByName = useCallback((name) => {
    const building = buildings.find(b => b.name.includes(name) || name.includes(b.name));
    if (building) {
      selectBuilding(building);
      return building;
    }
    return null;
  }, [buildings, selectBuilding]);

  const setFloorByName = useCallback((floorName, buildingName) => {
    let targetBuilding = selectedBuilding;
    if (buildingName) {
      targetBuilding = buildings.find(b => b.name.includes(buildingName));
      if (targetBuilding && targetBuilding.id !== selectedBuilding?.id) {
        setSelectedBuilding(targetBuilding);
      }
    }
    if (targetBuilding) {
      const floorList = MOCK_FLOORS[targetBuilding.id] || [];
      const floor = floorList.find(f => f.name.includes(floorName) || floorName.includes(f.name));
      if (floor) {
        selectFloor(floor);
        return floor;
      }
    }
    return null;
  }, [selectedBuilding, buildings, selectFloor]);

  const setRoomByName = useCallback((roomName) => {
    const room = allRooms.find(r => r.name.includes(roomName) || roomName.includes(r.name));
    if (room) {
      const building = buildings.find(b => b.id === room.buildingId);
      const floor = MOCK_FLOORS[room.buildingId]?.find(f => f.id === room.floorId);
      if (building) setSelectedBuilding(building);
      if (floor) setSelectedFloor(floor);
      setSelectedRoom(room.id);
      return room;
    }
    return null;
  }, [allRooms, buildings]);

  const setTimeByRange = useCallback((startTime, endTime, roomId) => {
    const targetRoomId = roomId || selectedRoom;
    if (!targetRoomId) return false;

    const startIdx = TIME_SLOTS.indexOf(startTime);
    const endIdx = TIME_SLOTS.findIndex(s => s === endTime) - 1;

    if (startIdx === -1 || endIdx < startIdx) return false;

    const newSlots = [];
    for (let i = startIdx; i <= endIdx; i++) {
      const slot = TIME_SLOTS[i];
      if (!reservations[targetRoomId]?.[slot]) {
        newSlots.push({ key: `${targetRoomId}_${slot}`, roomId: targetRoomId, timeSlot: slot });
      }
    }

    if (newSlots.length > 0) {
      setSelectedRoom(targetRoomId);
      setSelectedTimeSlots(newSlots);
      return true;
    }
    return false;
  }, [selectedRoom, reservations]);

  // 참여자 일정 조회
  const getParticipantSchedules = useCallback((participantIds, date) => {
    return participantIds.map(id => ({
      employee: employees.find(e => e.id === id),
      schedule: (employeeSchedules[id] || []).filter(s => s.date === date),
    }));
  }, [employees, employeeSchedules]);

  const value = {
    // 데이터
    employees,
    filteredEmployees,
    employeeSchedules,
    teams,
    myGroups,
    buildings,
    floors,
    rooms,
    allRooms,
    timeSlots,
    reservations,
    myReservations,
    recurrenceTypes,
    attendeeTypes,
    selectionTypes,
    isInitialized,

    // 선택된 상태
    selectedParticipants, // 하위 호환 (모든 참석자)
    selectedEntities, // 선택된 항목 (팀/그룹/개인 단위)
    organizer,
    requiredAttendees,
    optionalAttendees,
    selectedBuilding,
    selectedFloor,
    selectedDate,
    selectedTimeSlots,
    selectedRoom,
    meetingTitle,
    recurrence,
    recurrenceEndDate,
    showMyReservations,
    employeeSearchQuery,
    selectedTeamFilter,

    // 참석자 관리
    addAttendee,
    removeAttendee,
    changeAttendeeType,
    addTeamAsAttendees,
    addGroupAsAttendees,
    addIndividualAttendee,
    removeEntity,
    changeEntityType,
    clearAttendees,
    toggleParticipant, // 하위 호환

    // 액션
    selectBuilding,
    selectFloor,
    setSelectedDate,
    toggleTimeSlot,
    selectTimeRange,
    clearSelection,
    setMeetingTitle,
    setRecurrence,
    setRecurrenceEndDate,
    setShowMyReservations,
    setEmployeeSearchQuery,
    setSelectedTeamFilter,
    createReservation,
    deleteReservation,
    updateReservation,

    // 분석/추천
    findOptimalTimes,
    getParticipantSchedules,

    // LLM 제어용
    setParticipantsByNames,
    setBuildingByName,
    setFloorByName,
    setRoomByName,
    setTimeByRange,
  };

  return (
    <ReservationContext.Provider value={value}>
      {children}
    </ReservationContext.Provider>
  );
}

export function useReservation() {
  const context = useContext(ReservationContext);
  if (!context) {
    throw new Error('useReservation must be used within a ReservationProvider');
  }
  return context;
}
