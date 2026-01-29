import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ReservationContext = createContext(null);

const STORAGE_KEY = 'meeting_scheduler_preferences';

// Mock 데이터
const MOCK_EMPLOYEES = [
  { id: 'emp_001', name: '김철수', department: '개발팀', position: '팀장' },
  { id: 'emp_002', name: '이영희', department: '개발팀', position: '선임' },
  { id: 'emp_003', name: '박민수', department: '디자인팀', position: '팀장' },
  { id: 'emp_004', name: '정수진', department: '기획팀', position: '매니저' },
  { id: 'emp_005', name: '홍길동', department: '마케팅팀', position: '팀장' },
  { id: 'emp_006', name: '최유진', department: '개발팀', position: '주임' },
  { id: 'emp_007', name: '강동원', department: '인사팀', position: '팀장' },
  { id: 'emp_008', name: '윤서연', department: '기획팀', position: '선임' },
];

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
    { id: 'room_a1_1', name: '회의실 A', capacity: 6, floorId: 'floor_a_1' },
    { id: 'room_a1_2', name: '회의실 B', capacity: 8, floorId: 'floor_a_1' },
  ],
  floor_a_2: [
    { id: 'room_a2_1', name: '대회의실', capacity: 20, floorId: 'floor_a_2' },
    { id: 'room_a2_2', name: '소회의실 1', capacity: 4, floorId: 'floor_a_2' },
    { id: 'room_a2_3', name: '소회의실 2', capacity: 4, floorId: 'floor_a_2' },
  ],
  floor_a_3: [
    { id: 'room_a3_1', name: '임원회의실', capacity: 12, floorId: 'floor_a_3' },
  ],
  floor_b_1: [
    { id: 'room_b1_1', name: '미팅룸 1', capacity: 6, floorId: 'floor_b_1' },
    { id: 'room_b1_2', name: '미팅룸 2', capacity: 6, floorId: 'floor_b_1' },
  ],
  floor_b_2: [
    { id: 'room_b2_1', name: '세미나실', capacity: 30, floorId: 'floor_b_2' },
  ],
  floor_c_1: [
    { id: 'room_c1_1', name: '상담실 1', capacity: 4, floorId: 'floor_c_1' },
    { id: 'room_c1_2', name: '상담실 2', capacity: 4, floorId: 'floor_c_1' },
  ],
  floor_c_2: [
    { id: 'room_c2_1', name: '프로젝트룸 A', capacity: 8, floorId: 'floor_c_2' },
    { id: 'room_c2_2', name: '프로젝트룸 B', capacity: 8, floorId: 'floor_c_2' },
  ],
  floor_c_3: [
    { id: 'room_c3_1', name: '교육장', capacity: 40, floorId: 'floor_c_3' },
  ],
  floor_c_4: [
    { id: 'room_c4_1', name: '스튜디오', capacity: 10, floorId: 'floor_c_4' },
  ],
};

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
    // 랜덤하게 일부 시간대를 예약된 것으로 표시
    TIME_SLOTS.forEach(slot => {
      if (Math.random() < 0.05) { // 5% 확률로 예약됨
        reservations[room.id][slot] = {
          id: `res_${room.id}_${slot}`,
          roomId: room.id,
          startTime: slot,
          endTime: addMinutes(slot, 60),
          title: '회의',
          organizer: MOCK_EMPLOYEES[Math.floor(Math.random() * MOCK_EMPLOYEES.length)].name,
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

// localStorage에서 저장된 설정 불러오기
const loadPreferences = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load preferences:', e);
  }
  return null;
};

// localStorage에 설정 저장
const savePreferences = (buildingId, floorId) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ buildingId, floorId }));
  } catch (e) {
    console.error('Failed to save preferences:', e);
  }
};

export function ReservationProvider({ children }) {
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [reservations, setReservations] = useState(() => generateMockReservations());
  const [meetingTitle, setMeetingTitle] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  const employees = MOCK_EMPLOYEES;
  const buildings = MOCK_BUILDINGS;
  const floors = selectedBuilding ? (MOCK_FLOORS[selectedBuilding.id] || []) : [];
  const rooms = selectedFloor ? (MOCK_ROOMS[selectedFloor.id] || []) : [];
  const timeSlots = TIME_SLOTS;

  // 초기 로드 시 저장된 건물/층 복원
  useEffect(() => {
    const prefs = loadPreferences();
    if (prefs) {
      const building = MOCK_BUILDINGS.find(b => b.id === prefs.buildingId);
      if (building) {
        setSelectedBuilding(building);
        if (prefs.floorId) {
          const floorList = MOCK_FLOORS[building.id] || [];
          const floor = floorList.find(f => f.id === prefs.floorId);
          if (floor) {
            setSelectedFloor(floor);
          }
        }
      }
    }
    setIsInitialized(true);
  }, []);

  const toggleParticipant = useCallback((employee) => {
    setSelectedParticipants(prev => {
      const exists = prev.find(p => p.id === employee.id);
      if (exists) {
        return prev.filter(p => p.id !== employee.id);
      }
      return [...prev, employee];
    });
  }, []);

  const selectBuilding = useCallback((building) => {
    setSelectedBuilding(building);
    setSelectedFloor(null);
    setSelectedRoom(null);
    setSelectedTimeSlots([]);
    if (building) {
      savePreferences(building.id, null);
    }
  }, []);

  const selectFloor = useCallback((floor) => {
    setSelectedFloor(floor);
    setSelectedRoom(null);
    setSelectedTimeSlots([]);
    if (floor && selectedBuilding) {
      savePreferences(selectedBuilding.id, floor.id);
    }
  }, [selectedBuilding]);

  const toggleTimeSlot = useCallback((roomId, timeSlot) => {
    // 이미 예약된 시간대인지 확인
    if (reservations[roomId]?.[timeSlot]) {
      return; // 이미 예약됨
    }

    setSelectedRoom(roomId);
    setSelectedTimeSlots(prev => {
      const key = `${roomId}_${timeSlot}`;
      const exists = prev.find(s => s.key === key);
      if (exists) {
        const filtered = prev.filter(s => s.key !== key);
        if (filtered.length === 0) {
          setSelectedRoom(null);
        }
        return filtered;
      }
      // 같은 방의 슬롯만 선택 가능
      const sameRoom = prev.filter(s => s.roomId === roomId);
      return [...sameRoom, { key, roomId, timeSlot }];
    });
  }, [reservations]);

  // 연속된 시간 범위 선택 (드래그용)
  const selectTimeRange = useCallback((roomId, startSlot, endSlot) => {
    const startIdx = TIME_SLOTS.indexOf(startSlot);
    const endIdx = TIME_SLOTS.indexOf(endSlot);

    if (startIdx === -1 || endIdx === -1) return;

    const minIdx = Math.min(startIdx, endIdx);
    const maxIdx = Math.max(startIdx, endIdx);

    // 범위 내 슬롯들 선택 (예약된 슬롯 제외)
    const newSlots = [];
    for (let i = minIdx; i <= maxIdx; i++) {
      const slot = TIME_SLOTS[i];
      if (!reservations[roomId]?.[slot]) {
        newSlots.push({
          key: `${roomId}_${slot}`,
          roomId,
          timeSlot: slot,
        });
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

  const createReservation = useCallback(async () => {
    if (!selectedRoom || selectedTimeSlots.length === 0 || !meetingTitle) {
      return { success: false, error: '필수 정보를 입력해주세요.' };
    }

    const sortedSlots = [...selectedTimeSlots].sort((a, b) =>
      a.timeSlot.localeCompare(b.timeSlot)
    );

    const startTime = sortedSlots[0].timeSlot;
    const endTime = addMinutes(sortedSlots[sortedSlots.length - 1].timeSlot, 10);

    const newReservation = {
      id: `res_${Date.now()}`,
      roomId: selectedRoom,
      startTime,
      endTime,
      title: meetingTitle,
      organizer: '나',
      participants: selectedParticipants.map(p => p.name),
      date: selectedDate,
    };

    // 예약 추가
    setReservations(prev => {
      const updated = { ...prev };
      if (!updated[selectedRoom]) {
        updated[selectedRoom] = {};
      }
      sortedSlots.forEach(slot => {
        updated[selectedRoom][slot.timeSlot] = newReservation;
      });
      return updated;
    });

    // 선택 초기화
    clearSelection();
    setMeetingTitle('');

    return { success: true, reservation: newReservation };
  }, [selectedRoom, selectedTimeSlots, meetingTitle, selectedParticipants, selectedDate, clearSelection]);

  // LLM에서 호출할 수 있는 함수들
  const setParticipantsByNames = useCallback((names) => {
    const participants = employees.filter(e =>
      names.some(name => e.name.includes(name))
    );
    setSelectedParticipants(participants);
  }, [employees]);

  const setBuildingByName = useCallback((name) => {
    const building = buildings.find(b => b.name.includes(name));
    if (building) {
      selectBuilding(building);
    }
  }, [buildings, selectBuilding]);

  const setFloorByName = useCallback((name) => {
    const floor = floors.find(f => f.name.includes(name));
    if (floor) {
      selectFloor(floor);
    }
  }, [floors, selectFloor]);

  const value = {
    // 데이터
    employees,
    buildings,
    floors,
    rooms,
    timeSlots,
    reservations,
    isInitialized,

    // 선택된 상태
    selectedParticipants,
    selectedBuilding,
    selectedFloor,
    selectedDate,
    selectedTimeSlots,
    selectedRoom,
    meetingTitle,

    // 액션
    toggleParticipant,
    selectBuilding,
    selectFloor,
    setSelectedDate,
    toggleTimeSlot,
    selectTimeRange,
    clearSelection,
    setMeetingTitle,
    createReservation,

    // LLM 제어용
    setParticipantsByNames,
    setBuildingByName,
    setFloorByName,
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
