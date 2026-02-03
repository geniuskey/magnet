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

// 직원별 바쁜 시간대 생성 (랜덤) - 날짜를 인자로 받음
const generateEmployeeSchedules = (employees, targetDate) => {
  const schedules = {};
  const meetingTitles = ['팀 미팅', '1:1 면담', '코드 리뷰', '설계 검토', '스프린트 계획', '기획 회의', '디자인 리뷰', '고객 미팅', '교육', '워크샵'];

  // 날짜를 시드로 사용하여 같은 날짜면 같은 스케줄 생성
  const dateSeed = targetDate.split('-').join('');

  employees.forEach((emp, empIdx) => {
    // 시드 기반 의사 난수 (날짜+직원ID 조합)
    const seed = parseInt(dateSeed) + empIdx * 1000;
    const seededRandom = (n) => {
      const x = Math.sin(seed + n) * 10000;
      return x - Math.floor(x);
    };

    // 30% 확률로 일정 생성
    if (seededRandom(0) < 0.3) {
      const numMeetings = Math.floor(seededRandom(1) * 3) + 1;
      schedules[emp.id] = [];

      for (let i = 0; i < numMeetings; i++) {
        const startHour = 9 + Math.floor(seededRandom(i * 10 + 2) * 8);
        const duration = [30, 60, 90, 120][Math.floor(seededRandom(i * 10 + 3) * 4)];
        const startTime = `${startHour.toString().padStart(2, '0')}:00`;
        const endHour = startHour + Math.floor(duration / 60);
        const endMin = duration % 60;
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;

        schedules[emp.id].push({
          date: targetDate,
          startTime,
          endTime,
          title: meetingTitles[Math.floor(seededRandom(i * 10 + 4) * meetingTitles.length)],
        });
      }
    }
  });

  return schedules;
};

// 현재 날짜 가져오기 함수 (로컬 타임존 기준)
const getCurrentDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

// 편의시설 목록
const AMENITIES = [
  { id: 'projector', name: '프로젝터' },
  { id: 'whiteboard', name: '화이트보드' },
  { id: 'videoConference', name: '화상회의' },
  { id: 'tv', name: 'TV' },
];

// 회의실 이름 프리픽스
const ROOM_PREFIXES = ['회의실', '미팅룸', '소회의실', '대회의실', '세미나실', '프로젝트룸', '스튜디오'];
const ROOM_SUFFIXES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const CAPACITIES = [4, 6, 8, 10, 12, 15, 20, 30];

// 층 데이터 생성 (각 건물 10층)
const generateFloors = () => {
  const floors = {};
  MOCK_BUILDINGS.forEach(building => {
    floors[building.id] = [];
    for (let i = 1; i <= 10; i++) {
      floors[building.id].push({
        id: `floor_${building.id}_${i}`,
        name: `${i}층`,
        buildingId: building.id,
      });
    }
  });
  return floors;
};

const MOCK_FLOORS = generateFloors();

// 회의실 데이터 생성 (각 층 4~8개)
const generateRooms = () => {
  const rooms = {};
  const seededRandom = (seed) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  let seed = 12345;
  const nextRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  MOCK_BUILDINGS.forEach(building => {
    MOCK_FLOORS[building.id].forEach((floor, floorIdx) => {
      const floorId = floor.id;
      const roomCount = 4 + Math.floor(nextRandom() * 5); // 4~8개
      rooms[floorId] = [];

      for (let i = 0; i < roomCount; i++) {
        const prefix = ROOM_PREFIXES[Math.floor(nextRandom() * ROOM_PREFIXES.length)];
        const suffix = ROOM_SUFFIXES[i];
        const capacity = CAPACITIES[Math.floor(nextRandom() * CAPACITIES.length)];

        // 랜덤 편의시설 (0~4개)
        const amenityCount = Math.floor(nextRandom() * 5);
        const amenityIds = ['projector', 'whiteboard', 'videoConference', 'tv'];
        const shuffled = amenityIds.sort(() => nextRandom() - 0.5);
        const roomAmenities = shuffled.slice(0, amenityCount);

        rooms[floorId].push({
          id: `room_${building.id}_${floorIdx + 1}_${i + 1}`,
          name: `${prefix} ${suffix}`,
          capacity,
          floorId,
          buildingId: building.id,
          buildingName: building.name,
          floorName: floor.name,
          amenities: roomAmenities,
        });
      }
    });
  });
  return rooms;
};

const MOCK_ROOMS = generateRooms();

const ALL_ROOMS = Object.values(MOCK_ROOMS).flat();

// 시간 슬롯 생성 (06:00 ~ 24:00)
const generateTimeSlots = (intervalMinutes = 10) => {
  const slots = [];
  for (let hour = 6; hour < 24; hour++) {
    for (let min = 0; min < 60; min += intervalMinutes) {
      slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    }
  }
  return slots;
};

// 기본 10분 단위 슬롯 (내부 처리용)
const TIME_SLOTS_10MIN = generateTimeSlots(10);
// 하위 호환성을 위한 기본 슬롯
const TIME_SLOTS = TIME_SLOTS_10MIN;

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

const savePreferences = (buildingId, floorIds) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ buildingId, floorIds }));
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
  const [selectedFloors, setSelectedFloors] = useState(new Set());
  const [selectedDate, setSelectedDate] = useState(() => getCurrentDate());

  // 회의실 필터 상태
  const [roomFilters, setRoomFilters] = useState({
    nameSearch: '',
    minCapacity: null,
    amenities: [],
  });
  const [selectedTimeSlots, setSelectedTimeSlots] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [reservations, setReservations] = useState(() => generateMockReservations());
  const [myReservations, setMyReservations] = useState(() => loadMyReservations());
  const [meetingTitle, setMeetingTitle] = useState('');
  const [recurrence, setRecurrence] = useState(RECURRENCE_TYPES.NONE);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [showMyReservations, setShowMyReservations] = useState(false);
  const [showAvailability, setShowAvailability] = useState(true);
  const [meetingDuration, setMeetingDuration] = useState(60);
  const [scrollTargetTime, setScrollTargetTime] = useState(null); // { startTime, endTime } - 스크롤 대상 시간
  const [timeSlotInterval, setTimeSlotInterval] = useState(60); // 10, 30, 60분 (default: 1시간)

  // 검색/필터 상태
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState(null);

  const employees = MOCK_EMPLOYEES;
  // 선택된 날짜에 맞는 직원 스케줄 생성 (날짜 변경 시 재생성)
  const employeeSchedules = useMemo(() => {
    return generateEmployeeSchedules(MOCK_EMPLOYEES, selectedDate);
  }, [selectedDate]);
  const teams = MOCK_TEAMS;
  const myGroups = MOCK_MY_GROUPS;
  const buildings = MOCK_BUILDINGS;
  const amenities = AMENITIES;
  const floors = selectedBuilding ? (MOCK_FLOORS[selectedBuilding.id] || []) : [];

  // 멀티플로어: 선택된 층들의 회의실 합치기
  const rooms = useMemo(() => {
    if (selectedFloors.size === 0) return [];
    return Array.from(selectedFloors).flatMap(floorId => MOCK_ROOMS[floorId] || []);
  }, [selectedFloors]);

  // 필터링된 회의실 목록
  const filteredRooms = useMemo(() => {
    let result = rooms;
    // 이름 검색
    if (roomFilters.nameSearch) {
      result = result.filter(r => r.name.toLowerCase().includes(roomFilters.nameSearch.toLowerCase()));
    }
    // 최소 수용인원
    if (roomFilters.minCapacity) {
      result = result.filter(r => r.capacity >= roomFilters.minCapacity);
    }
    // 편의시설 필터
    if (roomFilters.amenities.length > 0) {
      result = result.filter(r => roomFilters.amenities.every(a => r.amenities?.includes(a)));
    }
    return result;
  }, [rooms, roomFilters]);

  const allRooms = ALL_ROOMS;
  const timeSlots = TIME_SLOTS; // 10분 단위 (내부 처리용)

  // 화면 표시용 시간 슬롯 (선택한 간격에 따라)
  const displayTimeSlots = useMemo(() => {
    return generateTimeSlots(timeSlotInterval);
  }, [timeSlotInterval]);

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
        // 멀티플로어 지원 (floorIds 배열) + 하위 호환 (floorId 단일)
        const floorList = MOCK_FLOORS[building.id] || [];
        if (prefs.floorIds && Array.isArray(prefs.floorIds)) {
          const validFloorIds = prefs.floorIds.filter(fid => floorList.some(f => f.id === fid));
          if (validFloorIds.length > 0) {
            setSelectedFloors(new Set(validFloorIds));
          }
        } else if (prefs.floorId) {
          // 하위 호환: 단일 floorId
          const floor = floorList.find(f => f.id === prefs.floorId);
          if (floor) setSelectedFloors(new Set([floor.id]));
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
    setSelectedFloors(new Set());
    setSelectedRoom(null);
    setSelectedTimeSlots([]);
    if (building) savePreferences(building.id, []);
  }, []);

  // 단일 층 선택 (하위 호환성)
  const selectFloor = useCallback((floor) => {
    if (floor) {
      setSelectedFloors(new Set([floor.id]));
      if (selectedBuilding) savePreferences(selectedBuilding.id, [floor.id]);
    } else {
      setSelectedFloors(new Set());
      if (selectedBuilding) savePreferences(selectedBuilding.id, []);
    }
    setSelectedRoom(null);
    setSelectedTimeSlots([]);
  }, [selectedBuilding]);

  // 멀티 층 토글
  const toggleFloor = useCallback((floor) => {
    setSelectedFloors(prev => {
      const next = new Set(prev);
      if (next.has(floor.id)) {
        next.delete(floor.id);
      } else {
        if (next.size >= 4) {
          return prev; // 최대 4개
        }
        next.add(floor.id);
      }
      // 변경된 층 목록 저장
      if (selectedBuilding) {
        savePreferences(selectedBuilding.id, Array.from(next));
      }
      return next;
    });
    setSelectedRoom(null);
    setSelectedTimeSlots([]);
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

  // 예약 이동 (시간/회의실 변경)
  const moveReservation = useCallback(async (reservationId, newRoomId, newStartTime, newEndTime) => {
    const reservation = myReservations.find(r => r.id === reservationId);
    if (!reservation) {
      return { success: false, error: '예약을 찾을 수 없습니다.' };
    }

    // 기존 예약 슬롯 계산
    const oldStartIdx = TIME_SLOTS.indexOf(reservation.startTime);
    const oldEndIdx = TIME_SLOTS.findIndex(s => s === reservation.endTime) - 1 || oldStartIdx;

    // 새 예약 슬롯 계산
    const newStartIdx = TIME_SLOTS.indexOf(newStartTime);
    let newEndIdx = TIME_SLOTS.findIndex(s => s === newEndTime);
    if (newEndIdx < 0) {
      // endTime이 정확히 슬롯에 없으면 계산
      const [eh, em] = newEndTime.split(':').map(Number);
      const endMinutes = eh * 60 + em;
      newEndIdx = TIME_SLOTS.findIndex(s => {
        const [sh, sm] = s.split(':').map(Number);
        return sh * 60 + sm >= endMinutes;
      }) - 1;
    }
    if (newEndIdx < newStartIdx) newEndIdx = newStartIdx;

    // 새 endTime 계산 (슬롯 + 10분)
    const lastSlot = TIME_SLOTS[newEndIdx];
    const [lh, lm] = lastSlot.split(':').map(Number);
    const endMinutes = lh * 60 + lm + 10;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const calculatedEndTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

    // 충돌 체크 (자기 자신 제외)
    for (let i = newStartIdx; i <= newEndIdx; i++) {
      const slot = TIME_SLOTS[i];
      const existing = reservations[newRoomId]?.[slot];
      if (existing && existing.id !== reservationId) {
        return { success: false, error: '해당 시간에 다른 예약이 있습니다.' };
      }
    }

    // 예약 업데이트
    const room = allRooms.find(r => r.id === newRoomId);
    const updatedReservation = {
      ...reservation,
      roomId: newRoomId,
      roomName: room?.name || reservation.roomName,
      startTime: newStartTime,
      endTime: calculatedEndTime,
    };

    // myReservations 업데이트
    setMyReservations(prev =>
      prev.map(r => r.id === reservationId ? updatedReservation : r)
    );

    // reservations 업데이트 (기존 슬롯 삭제 후 새 슬롯에 추가)
    setReservations(prev => {
      const updated = { ...prev };

      // 기존 슬롯에서 삭제
      if (updated[reservation.roomId]) {
        Object.keys(updated[reservation.roomId]).forEach(slot => {
          if (updated[reservation.roomId][slot]?.id === reservationId) {
            delete updated[reservation.roomId][slot];
          }
        });
      }

      // 새 슬롯에 추가
      if (!updated[newRoomId]) updated[newRoomId] = {};
      for (let i = newStartIdx; i <= newEndIdx; i++) {
        const slot = TIME_SLOTS[i];
        updated[newRoomId][slot] = {
          ...updatedReservation,
          isMyReservation: true,
        };
      }

      return updated;
    });

    return { success: true };
  }, [myReservations, reservations, allRooms]);

  // 참여자들의 공통 가능 시간 찾기 (점수 기반 추천)
  const findOptimalTimes = useCallback((durationMinutes = 60) => {
    // 필수 참석자 (주관자 + 필수)
    const requiredList = [
      ...(organizer ? [organizer] : []),
      ...requiredAttendees,
    ];
    // 선택 참석자
    const optionalList = [...optionalAttendees];

    if (requiredList.length === 0 && optionalList.length === 0) return [];

    // 각 참여자별 바쁜 시간대 계산
    const getBusySlotsForPerson = (empId) => {
      const busy = new Set();
      const schedule = employeeSchedules[empId] || [];
      schedule
        .filter(s => s.date === selectedDate)
        .forEach(s => {
          const startMin = timeToMinutes(s.startTime);
          const endMin = timeToMinutes(s.endTime);
          for (let t = startMin; t < endMin; t += 10) {
            const h = Math.floor(t / 60);
            const m = t % 60;
            busy.add(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
          }
        });
      return busy;
    };

    // 참여자별 바쁜 시간 캐싱
    const busyByPerson = {};
    [...requiredList, ...optionalList].forEach(p => {
      busyByPerson[p.id] = getBusySlotsForPerson(p.id);
    });

    // 시간대가 특정 참여자에게 가능한지 확인
    const isAvailableFor = (personId, startIdx, slotsNeeded) => {
      const busy = busyByPerson[personId];
      for (let j = 0; j < slotsNeeded; j++) {
        if (busy.has(TIME_SLOTS[startIdx + j])) {
          return false;
        }
      }
      return true;
    };

    // 시간대에 예약 가능한 회의실 찾기
    const getAvailableRooms = (startIdx, slotsNeeded) => {
      const availableRooms = [];
      // 선택된 층의 회의실만 확인
      const roomsToCheck = rooms.length > 0 ? rooms : allRooms;

      for (const room of roomsToCheck) {
        let roomAvailable = true;
        for (let j = 0; j < slotsNeeded; j++) {
          const slot = TIME_SLOTS[startIdx + j];
          if (reservations[room.id]?.[slot]) {
            roomAvailable = false;
            break;
          }
        }
        if (roomAvailable) {
          availableRooms.push(room);
        }
      }
      return availableRooms;
    };

    // 정시(00분) 시작 시간만 필터링
    const hourlySlotIndices = TIME_SLOTS
      .map((slot, idx) => ({ slot, idx }))
      .filter(({ slot }) => slot.endsWith(':00'))
      .map(({ idx }) => idx);

    const slotsNeeded = Math.ceil(durationMinutes / 10);
    const candidates = [];

    for (const startIdx of hourlySlotIndices) {
      if (startIdx + slotsNeeded > TIME_SLOTS.length) continue;

      const startTime = TIME_SLOTS[startIdx];
      const endTime = addMinutes(TIME_SLOTS[startIdx + slotsNeeded - 1], 10);

      // 참석 가능/불가 분류
      const availableRequired = requiredList.filter(p => isAvailableFor(p.id, startIdx, slotsNeeded));
      const unavailableRequired = requiredList.filter(p => !isAvailableFor(p.id, startIdx, slotsNeeded));
      const availableOptional = optionalList.filter(p => isAvailableFor(p.id, startIdx, slotsNeeded));
      const unavailableOptional = optionalList.filter(p => !isAvailableFor(p.id, startIdx, slotsNeeded));

      // 예약 가능한 회의실
      const availableRooms = getAvailableRooms(startIdx, slotsNeeded);

      // 회의실이 없으면 스킵
      if (availableRooms.length === 0) continue;

      // 점수 계산: 필수 참석자 수 * 1000 + 선택 참석자 수
      const requiredScore = availableRequired.length;
      const optionalScore = availableOptional.length;
      const totalScore = requiredScore * 1000 + optionalScore;

      // 업무 시간 보너스 (09:00~18:00)
      const startHour = parseInt(startTime.split(':')[0]);
      const workHourBonus = (startHour >= 9 && startHour < 18) ? 10000 : 0;

      candidates.push({
        startTime,
        endTime,
        requiredScore,
        optionalScore,
        totalScore: totalScore + workHourBonus,
        availableRequired,
        unavailableRequired,
        availableOptional,
        unavailableOptional,
        availableRooms,
        isAllRequiredAvailable: unavailableRequired.length === 0,
      });
    }

    // 점수순 정렬 후 상위 10개 반환
    return candidates
      .sort((a, b) => b.totalScore - a.totalScore || a.startTime.localeCompare(b.startTime))
      .slice(0, 10);
  }, [employeeSchedules, organizer, requiredAttendees, optionalAttendees, selectedDate, rooms, allRooms, reservations]);

  // LLM 제어용 함수들
  const setParticipantsByNames = useCallback((names, type = ATTENDEE_TYPES.REQUIRED) => {
    console.log('%c[setParticipantsByNames]', 'color: #9C27B0; font-weight: bold;', { names, type });

    const newParticipants = employees.filter(e =>
      names.some(name => e.name.includes(name) || name.includes(e.name))
    );
    console.log('  Found participants:', newParticipants.map(p => p.name));

    // 기존 참석자에 추가 (중복 제거) + selectedEntities도 함께 업데이트
    const existingIds = new Set([
      organizer?.id,
      ...requiredAttendees.map(p => p.id),
      ...optionalAttendees.map(p => p.id),
    ].filter(Boolean));

    const toAdd = newParticipants.filter(p => !existingIds.has(p.id));
    console.log('  To add (after dedup):', toAdd.map(p => p.name));

    if (toAdd.length > 0) {
      // selectedEntities에 개인 추가
      const newEntities = toAdd.map(emp => ({
        type: SELECTION_TYPES.INDIVIDUAL,
        id: emp.id,
        name: emp.name,
        attendeeType: type,
        memberIds: [emp.id],
        memberCount: 1,
        department: emp.department,
      }));
      setSelectedEntities(prev => [...prev, ...newEntities]);

      // 참석자 목록에 추가
      if (type === ATTENDEE_TYPES.REQUIRED) {
        setRequiredAttendees(prev => [...prev, ...toAdd]);
      } else if (type === ATTENDEE_TYPES.OPTIONAL) {
        setOptionalAttendees(prev => [...prev, ...toAdd]);
      }
    }

    return newParticipants;
  }, [employees, organizer, requiredAttendees, optionalAttendees]);

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
        savePreferences(targetBuilding.id, []);
      }
    }
    if (targetBuilding) {
      const floorList = MOCK_FLOORS[targetBuilding.id] || [];
      const floor = floorList.find(f => f.name.includes(floorName) || floorName.includes(f.name));
      if (floor) {
        setSelectedFloors(new Set([floor.id]));
        savePreferences(targetBuilding.id, [floor.id]);
        setSelectedRoom(null);
        setSelectedTimeSlots([]);
        return floor;
      }
    }
    return null;
  }, [selectedBuilding, buildings]);

  const setRoomByName = useCallback((roomName) => {
    const room = allRooms.find(r => r.name.includes(roomName) || roomName.includes(r.name));
    if (room) {
      const building = buildings.find(b => b.id === room.buildingId);
      const floor = MOCK_FLOORS[room.buildingId]?.find(f => f.id === room.floorId);
      if (building) setSelectedBuilding(building);
      if (floor) {
        setSelectedFloors(new Set([floor.id]));
        if (building) savePreferences(building.id, [floor.id]);
      }
      setSelectedRoom(room.id);
      return room;
    }
    return null;
  }, [allRooms, buildings]);

  const setTimeByRange = useCallback((startTime, endTime, roomId) => {
    const targetRoomId = roomId || selectedRoom;
    if (!targetRoomId) return null;

    const startIdx = TIME_SLOTS.indexOf(startTime);
    // endTime이 슬롯에 정확히 없으면 endTime 이상인 첫 슬롯 찾기
    let endIdx = TIME_SLOTS.findIndex(s => s === endTime);
    if (endIdx === -1) {
      // endTime보다 크거나 같은 첫 슬롯 찾기
      endIdx = TIME_SLOTS.findIndex(s => s >= endTime);
    }
    endIdx = endIdx - 1; // endTime 직전 슬롯까지 선택

    if (startIdx === -1 || endIdx < startIdx) return null;

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
      // 스크롤 대상 시간 설정
      setScrollTargetTime({ startTime, endTime });
      return newSlots; // 슬롯 배열 반환
    }
    return null;
  }, [selectedRoom, reservations]);

  // 주관자 설정 (이름으로)
  const setOrganizerByName = useCallback((name) => {
    const employee = employees.find(e =>
      e.name.includes(name) || name.includes(e.name)
    );
    if (employee) {
      // 기존 주관자가 있으면 필수 참석자로 변경
      if (organizer) {
        setRequiredAttendees(prev => [...prev.filter(a => a.id !== organizer.id), organizer]);
        // 기존 주관자 entity를 필수 참석자로 변경
        setSelectedEntities(prev => prev.map(e =>
          e.type === SELECTION_TYPES.INDIVIDUAL && e.id === organizer.id
            ? { ...e, attendeeType: ATTENDEE_TYPES.REQUIRED }
            : e
        ));
      }

      // 새 주관자가 이미 참석자 목록에 있으면 제거
      setRequiredAttendees(prev => prev.filter(a => a.id !== employee.id));
      setOptionalAttendees(prev => prev.filter(a => a.id !== employee.id));

      // selectedEntities에서 기존 entity 제거 후 주관자로 추가
      setSelectedEntities(prev => {
        const filtered = prev.filter(e => !(e.type === SELECTION_TYPES.INDIVIDUAL && e.id === employee.id));
        return [...filtered, {
          type: SELECTION_TYPES.INDIVIDUAL,
          id: employee.id,
          name: employee.name,
          attendeeType: ATTENDEE_TYPES.ORGANIZER,
          memberIds: [employee.id],
          memberCount: 1,
          department: employee.department,
        }];
      });

      setOrganizer(employee);
      return employee;
    }
    return null;
  }, [employees, organizer]);

  // 날짜 설정 (문자열 파싱)
  const setDateByString = useCallback((dateStr) => {
    const today = new Date();
    let targetDate = null;

    // 상대적 날짜 처리
    const lowerStr = dateStr.toLowerCase().trim();
    if (lowerStr === '오늘' || lowerStr === 'today') {
      targetDate = today;
    } else if (lowerStr === '내일' || lowerStr === 'tomorrow') {
      targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (lowerStr === '모레') {
      targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + 2);
    } else if (lowerStr.includes('다음 주') || lowerStr.includes('next week')) {
      targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + 7);
    } else if (lowerStr.includes('월요일') || lowerStr.includes('monday')) {
      targetDate = new Date(today);
      const dayOfWeek = targetDate.getDay();
      const daysUntilMonday = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 7 : 8 - dayOfWeek);
      targetDate.setDate(targetDate.getDate() + daysUntilMonday);
    } else if (lowerStr.includes('화요일') || lowerStr.includes('tuesday')) {
      targetDate = new Date(today);
      const dayOfWeek = targetDate.getDay();
      const daysUntil = ((2 - dayOfWeek + 7) % 7) || 7;
      targetDate.setDate(targetDate.getDate() + daysUntil);
    } else if (lowerStr.includes('수요일') || lowerStr.includes('wednesday')) {
      targetDate = new Date(today);
      const dayOfWeek = targetDate.getDay();
      const daysUntil = ((3 - dayOfWeek + 7) % 7) || 7;
      targetDate.setDate(targetDate.getDate() + daysUntil);
    } else if (lowerStr.includes('목요일') || lowerStr.includes('thursday')) {
      targetDate = new Date(today);
      const dayOfWeek = targetDate.getDay();
      const daysUntil = ((4 - dayOfWeek + 7) % 7) || 7;
      targetDate.setDate(targetDate.getDate() + daysUntil);
    } else if (lowerStr.includes('금요일') || lowerStr.includes('friday')) {
      targetDate = new Date(today);
      const dayOfWeek = targetDate.getDay();
      const daysUntil = ((5 - dayOfWeek + 7) % 7) || 7;
      targetDate.setDate(targetDate.getDate() + daysUntil);
    } else {
      // YYYY-MM-DD 형식 시도
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        targetDate = parsed;
      }
    }

    if (targetDate) {
      const formatted = targetDate.toISOString().split('T')[0];
      setSelectedDate(formatted);
      return formatted;
    }
    return null;
  }, []);

  // 예약 가능 회의실 조회
  const getAvailableRooms = useCallback((startTime, endTime, date = selectedDate) => {
    const startIdx = TIME_SLOTS.indexOf(startTime);
    const endIdx = TIME_SLOTS.findIndex(s => s >= endTime);
    if (startIdx === -1 || endIdx === -1) return [];

    const slotsToCheck = TIME_SLOTS.slice(startIdx, endIdx);
    const roomsToCheck = rooms.length > 0 ? rooms : allRooms;

    return roomsToCheck.filter(room => {
      return slotsToCheck.every(slot => !reservations[room.id]?.[slot]);
    }).map(room => ({
      id: room.id,
      name: room.name,
      capacity: room.capacity,
      floor: room.floorId,
      amenities: room.amenities || [],
    }));
  }, [selectedDate, rooms, allRooms, reservations]);

  // 임직원 검색
  const searchEmployees = useCallback((query) => {
    if (!query || query.length < 1) return [];
    const lowerQuery = query.toLowerCase();
    return employees.filter(e =>
      e.name.toLowerCase().includes(lowerQuery) ||
      e.department?.toLowerCase().includes(lowerQuery) ||
      e.position?.toLowerCase().includes(lowerQuery) ||
      e.email?.toLowerCase().includes(lowerQuery)
    ).slice(0, 20).map(e => ({
      id: e.id,
      name: e.name,
      department: e.department,
      position: e.position,
      email: e.email,
    }));
  }, [employees]);

  // 간편 예약 생성 (이름 기반)
  const createQuickReservation = useCallback(async ({
    title,
    organizerName,
    requiredNames = [],
    optionalNames = [],
    roomName,
    date,
    startTime,
    endTime,
    recurrenceType,
    recurrenceEnd,
  }) => {
    // 1. 날짜 설정
    if (date) {
      const parsedDate = setDateByString(date);
      if (!parsedDate) return { success: false, error: '날짜 파싱 실패' };
    }

    // 2. 참석자 설정
    if (organizerName) {
      const org = setOrganizerByName(organizerName);
      if (!org) return { success: false, error: `주관자 "${organizerName}" 찾을 수 없음` };
    }
    if (requiredNames.length > 0) {
      setParticipantsByNames(requiredNames, ATTENDEE_TYPES.REQUIRED);
    }
    if (optionalNames.length > 0) {
      setParticipantsByNames(optionalNames, ATTENDEE_TYPES.OPTIONAL);
    }

    // 3. 회의실 설정
    let targetRoom = null;
    if (roomName) {
      targetRoom = setRoomByName(roomName);
      if (!targetRoom) return { success: false, error: `회의실 "${roomName}" 찾을 수 없음` };
    }

    // 4. 시간 설정 및 슬롯 가져오기
    let timeSlots = null;
    if (startTime && endTime && targetRoom) {
      timeSlots = setTimeByRange(startTime, endTime, targetRoom.id);
      if (!timeSlots) return { success: false, error: '해당 시간은 이미 예약됨' };
    }

    // 5. 반복 설정
    if (recurrenceType) {
      setRecurrence(recurrenceType);
      if (recurrenceEnd) {
        setRecurrenceEndDate(recurrenceEnd);
      }
    }

    // 6. 제목 설정
    if (title) {
      setMeetingTitle(title);
    }

    // 7. 예약 생성 (슬롯을 직접 전달하여 state 동기화 문제 해결)
    const result = await createReservation({
      title: title || '회의',
      roomId: targetRoom?.id,
      slots: timeSlots,
    });
    return result;
  }, [setDateByString, setOrganizerByName, setParticipantsByNames, setRoomByName, setTimeByRange, setRecurrence, setRecurrenceEndDate, setMeetingTitle, createReservation]);

  // 내 예약 조회
  const getMyReservationList = useCallback((date = null) => {
    let list = myReservations;
    if (date) {
      list = list.filter(r => r.date === date);
    }
    return list.map(r => ({
      id: r.id,
      title: r.title,
      date: r.date,
      startTime: r.startTime,
      endTime: r.endTime,
      roomId: r.roomId,
      roomName: allRooms.find(room => room.id === r.roomId)?.name || r.roomId,
      participants: r.participants?.length || 0,
      isRecurring: !!r.recurrenceGroupId,
    }));
  }, [myReservations, allRooms]);

  // 시간/회의실로 예약 취소
  const cancelReservationByTime = useCallback((roomName, startTime, date = selectedDate) => {
    const room = allRooms.find(r =>
      r.name.includes(roomName) || roomName.includes(r.name)
    );
    if (!room) return { success: false, error: `회의실 "${roomName}" 찾을 수 없음` };

    const reservation = myReservations.find(r =>
      r.roomId === room.id &&
      r.date === date &&
      r.startTime === startTime
    );
    if (!reservation) return { success: false, error: '해당 예약을 찾을 수 없음' };

    deleteReservation(reservation.id);
    return { success: true, deletedReservation: reservation };
  }, [allRooms, myReservations, selectedDate, deleteReservation]);

  // 현재 상태 요약
  const getCurrentState = useCallback(() => {
    return {
      // 참석자
      organizer: organizer ? { id: organizer.id, name: organizer.name } : null,
      requiredAttendees: requiredAttendees.map(a => ({ id: a.id, name: a.name })),
      optionalAttendees: optionalAttendees.map(a => ({ id: a.id, name: a.name })),
      totalParticipants: selectedParticipants.length,

      // 장소
      building: selectedBuilding ? { id: selectedBuilding.id, name: selectedBuilding.name } : null,
      floors: Array.from(selectedFloors),
      room: selectedRoom ? {
        id: selectedRoom,
        name: allRooms.find(r => r.id === selectedRoom)?.name,
      } : null,

      // 시간
      date: selectedDate,
      timeSlots: selectedTimeSlots.length > 0 ? {
        start: selectedTimeSlots[0]?.timeSlot,
        end: selectedTimeSlots[selectedTimeSlots.length - 1]?.timeSlot,
        count: selectedTimeSlots.length,
        durationMinutes: selectedTimeSlots.length * 10,
      } : null,

      // 회의 정보
      title: meetingTitle,
      recurrence: recurrence,
      recurrenceEndDate: recurrenceEndDate,

      // 추천
      optimalTimesCount: findOptimalTimes(meetingDuration).length,
    };
  }, [organizer, requiredAttendees, optionalAttendees, selectedParticipants, selectedBuilding, selectedFloors, selectedRoom, allRooms, selectedDate, selectedTimeSlots, meetingTitle, recurrence, recurrenceEndDate, findOptimalTimes, meetingDuration]);

  // 반복 일정 설정 (문자열)
  const setRecurrenceByString = useCallback((typeStr, endDateStr = null) => {
    const lowerType = typeStr.toLowerCase();
    let recurrenceType = RECURRENCE_TYPES.NONE;

    if (lowerType.includes('매일') || lowerType.includes('daily')) {
      recurrenceType = RECURRENCE_TYPES.DAILY;
    } else if (lowerType.includes('매주') || lowerType.includes('weekly')) {
      recurrenceType = RECURRENCE_TYPES.WEEKLY;
    } else if (lowerType.includes('격주') || lowerType.includes('biweekly')) {
      recurrenceType = RECURRENCE_TYPES.BIWEEKLY;
    } else if (lowerType.includes('매월') || lowerType.includes('monthly')) {
      recurrenceType = RECURRENCE_TYPES.MONTHLY;
    }

    setRecurrence(recurrenceType);

    if (endDateStr) {
      const endDate = setDateByString(endDateStr);
      if (endDate) {
        setRecurrenceEndDate(endDate);
      }
    }

    return recurrenceType;
  }, [setDateByString]);

  // 참여자 일정 조회
  const getParticipantSchedules = useCallback((participantIds, date) => {
    return participantIds.map(id => ({
      employee: employees.find(e => e.id === id),
      schedule: (employeeSchedules[id] || []).filter(s => s.date === date),
    }));
  }, [employees, employeeSchedules]);

  // 첫 번째 선택된 층 (하위 호환성)
  const selectedFloor = useMemo(() => {
    if (selectedFloors.size === 0) return null;
    const firstFloorId = Array.from(selectedFloors)[0];
    return floors.find(f => f.id === firstFloorId) || null;
  }, [selectedFloors, floors]);

  const value = {
    // 데이터
    employees,
    filteredEmployees,
    employeeSchedules,
    teams,
    myGroups,
    buildings,
    amenities,
    floors,
    rooms,
    filteredRooms,
    allRooms,
    timeSlots,
    displayTimeSlots,
    timeSlotInterval,
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
    selectedFloor, // 하위 호환
    selectedFloors, // 멀티 플로어
    selectedDate,
    selectedTimeSlots,
    selectedRoom,
    meetingTitle,
    recurrence,
    recurrenceEndDate,
    showMyReservations,
    showAvailability,
    meetingDuration,
    scrollTargetTime,
    clearScrollTarget: () => setScrollTargetTime(null),
    employeeSearchQuery,
    selectedTeamFilter,
    roomFilters,

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
    toggleFloor,
    setSelectedDate,
    toggleTimeSlot,
    selectTimeRange,
    clearSelection,
    setMeetingTitle,
    setRecurrence,
    setRecurrenceEndDate,
    setShowMyReservations,
    setShowAvailability,
    setMeetingDuration,
    setTimeSlotInterval,
    setEmployeeSearchQuery,
    setSelectedTeamFilter,
    setRoomFilters,
    createReservation,
    deleteReservation,
    updateReservation,
    moveReservation,

    // 분석/추천
    findOptimalTimes,
    getParticipantSchedules,
    getRecurringDates,

    // LLM 제어용
    setParticipantsByNames,
    setBuildingByName,
    setFloorByName,
    setRoomByName,
    setTimeByRange,
    setOrganizerByName,
    setDateByString,
    getAvailableRooms,
    searchEmployees,
    createQuickReservation,
    getMyReservationList,
    cancelReservationByTime,
    getCurrentState,
    setRecurrenceByString,
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
