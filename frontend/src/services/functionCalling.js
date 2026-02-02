/**
 * LLM Function Calling 서비스
 * AI 어시스턴트가 호출할 수 있는 함수들을 정의하고 실행합니다.
 */

// 함수 스키마 정의 (OpenAI Function Calling 형식)
export const FUNCTION_DEFINITIONS = [
  {
    name: 'setOrganizerByName',
    description: '회의 주관자를 이름으로 설정합니다',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '주관자 이름' },
      },
      required: ['name'],
    },
  },
  {
    name: 'setParticipantsByNames',
    description: '참석자를 이름 목록으로 추가합니다',
    parameters: {
      type: 'object',
      properties: {
        names: { type: 'array', items: { type: 'string' }, description: '참석자 이름 목록' },
        type: { type: 'string', enum: ['REQUIRED', 'OPTIONAL'], description: '참석자 유형' },
      },
      required: ['names'],
    },
  },
  {
    name: 'searchEmployees',
    description: '임직원을 이름, 부서, 직책으로 검색합니다',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '검색어' },
      },
      required: ['query'],
    },
  },
  {
    name: 'addGroupAsAttendees',
    description: '내 주소록 그룹의 멤버들을 참석자로 추가합니다',
    parameters: {
      type: 'object',
      properties: {
        groupName: { type: 'string', description: '그룹 이름' },
        type: { type: 'string', enum: ['REQUIRED', 'OPTIONAL'], description: '참석자 유형' },
      },
      required: ['groupName'],
    },
  },
  {
    name: 'setBuildingByName',
    description: '건물을 이름으로 선택합니다',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '건물 이름' },
      },
      required: ['name'],
    },
  },
  {
    name: 'setFloorByName',
    description: '층을 이름으로 선택합니다',
    parameters: {
      type: 'object',
      properties: {
        floorName: { type: 'string', description: '층 이름 (예: 10층)' },
        buildingName: { type: 'string', description: '건물 이름 (선택)' },
      },
      required: ['floorName'],
    },
  },
  {
    name: 'setRoomByName',
    description: '회의실을 이름으로 선택합니다',
    parameters: {
      type: 'object',
      properties: {
        roomName: { type: 'string', description: '회의실 이름' },
      },
      required: ['roomName'],
    },
  },
  {
    name: 'getAvailableRooms',
    description: '특정 시간대에 예약 가능한 회의실 목록을 조회합니다',
    parameters: {
      type: 'object',
      properties: {
        startTime: { type: 'string', description: '시작 시간 (HH:MM)' },
        endTime: { type: 'string', description: '종료 시간 (HH:MM)' },
      },
      required: ['startTime', 'endTime'],
    },
  },
  {
    name: 'setDateByString',
    description: '날짜를 설정합니다 (자연어 지원: 오늘, 내일, 다음 주 월요일 등)',
    parameters: {
      type: 'object',
      properties: {
        dateStr: { type: 'string', description: '날짜 (예: 내일, 2024-01-15)' },
      },
      required: ['dateStr'],
    },
  },
  {
    name: 'setTimeByRange',
    description: '회의 시간 범위를 선택합니다',
    parameters: {
      type: 'object',
      properties: {
        startTime: { type: 'string', description: '시작 시간 (HH:MM)' },
        endTime: { type: 'string', description: '종료 시간 (HH:MM)' },
      },
      required: ['startTime', 'endTime'],
    },
  },
  {
    name: 'findOptimalTimes',
    description: '선택된 참석자들이 모두 참석 가능한 최적 시간을 찾습니다',
    parameters: {
      type: 'object',
      properties: {
        durationMinutes: { type: 'number', description: '회의 시간 (분)' },
      },
    },
  },
  {
    name: 'createQuickReservation',
    description: '한 번의 호출로 회의실을 예약합니다',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '회의 제목' },
        organizerName: { type: 'string', description: '주관자 이름' },
        requiredNames: { type: 'array', items: { type: 'string' }, description: '필수 참석자 이름 목록' },
        optionalNames: { type: 'array', items: { type: 'string' }, description: '선택 참석자 이름 목록' },
        roomName: { type: 'string', description: '회의실 이름' },
        date: { type: 'string', description: '날짜' },
        startTime: { type: 'string', description: '시작 시간' },
        endTime: { type: 'string', description: '종료 시간' },
      },
      required: ['title', 'roomName', 'date', 'startTime', 'endTime'],
    },
  },
  {
    name: 'getMyReservationList',
    description: '내 예약 목록을 조회합니다',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: '특정 날짜 필터 (선택)' },
      },
    },
  },
  {
    name: 'cancelReservationByTime',
    description: '회의실 이름과 시간으로 예약을 취소합니다',
    parameters: {
      type: 'object',
      properties: {
        roomName: { type: 'string', description: '회의실 이름' },
        startTime: { type: 'string', description: '시작 시간' },
      },
      required: ['roomName', 'startTime'],
    },
  },
  {
    name: 'getCurrentState',
    description: '현재 선택된 상태 (참석자, 회의실, 시간 등)를 조회합니다',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'setRecurrenceByString',
    description: '반복 일정을 설정합니다',
    parameters: {
      type: 'object',
      properties: {
        typeStr: { type: 'string', description: '반복 유형 (매일, 매주, 격주, 매월)' },
        endDateStr: { type: 'string', description: '종료 날짜' },
      },
      required: ['typeStr'],
    },
  },
];

/**
 * 사용자 메시지에서 의도와 파라미터를 추출합니다.
 * (실제 운영에서는 LLM이 처리)
 */
export function parseUserIntent(message, context = {}) {
  const lowerMsg = message.toLowerCase();
  const functionCalls = [];

  // 예약 생성 패턴
  const reservationPattern = /(.+?)[과와,]\s*(.+?)[과와]?\s*(내일|오늘|모레|\d{4}-\d{2}-\d{2}|다음\s*주)?\s*(오전|오후)?\s*(\d{1,2})시?\s*[~\-부터에]?\s*(오전|오후)?\s*(\d{1,2})시?.*?(회의실|대회의실|소회의실|룸)/;
  const quickReservationMatch = message.match(reservationPattern);

  if (quickReservationMatch || lowerMsg.includes('예약') && lowerMsg.includes('해줘')) {
    // 참석자 이름 추출
    const names = extractNames(message, context.employees || []);

    // 시간 추출
    const times = extractTimeRange(message);

    // 날짜 추출
    const date = extractDate(message);

    // 회의실 추출
    const room = extractRoom(message, context.allRooms || []);

    if (names.length > 0 || times || room) {
      functionCalls.push({
        name: 'createQuickReservation',
        arguments: {
          title: '회의',
          organizerName: names[0] || null,
          requiredNames: names.slice(1),
          roomName: room,
          date: date || '오늘',
          startTime: times?.startTime,
          endTime: times?.endTime,
        },
      });
      return functionCalls;
    }
  }

  // 그룹 추가 패턴
  if (lowerMsg.includes('그룹') && (lowerMsg.includes('추가') || lowerMsg.includes('참석') || lowerMsg.includes('초대'))) {
    const groupName = extractGroupName(message, context.myGroups || []);
    if (groupName) {
      const isOptional = lowerMsg.includes('선택');
      functionCalls.push({
        name: 'addGroupAsAttendees',
        arguments: { groupName, type: isOptional ? 'OPTIONAL' : 'REQUIRED' },
      });
    }
  }

  // 참석자 추가 패턴 (그룹이 아닌 경우)
  if (!lowerMsg.includes('그룹') && (lowerMsg.includes('참석') || lowerMsg.includes('추가') || lowerMsg.includes('초대'))) {
    const names = extractNames(message, context.employees || []);
    if (names.length > 0) {
      const isOptional = lowerMsg.includes('선택');
      functionCalls.push({
        name: 'setParticipantsByNames',
        arguments: { names, type: isOptional ? 'OPTIONAL' : 'REQUIRED' },
      });
    }
  }

  // 주관자 설정 패턴
  if (lowerMsg.includes('주관') || lowerMsg.includes('주최')) {
    const names = extractNames(message, context.employees || []);
    if (names.length > 0) {
      functionCalls.push({
        name: 'setOrganizerByName',
        arguments: { name: names[0] },
      });
    }
  }

  // 날짜 설정 패턴
  const datePatterns = ['내일', '오늘', '모레', '다음 주', '월요일', '화요일', '수요일', '목요일', '금요일'];
  for (const pattern of datePatterns) {
    if (lowerMsg.includes(pattern)) {
      functionCalls.push({
        name: 'setDateByString',
        arguments: { dateStr: extractDate(message) || pattern },
      });
      break;
    }
  }

  // 시간 설정 패턴
  const times = extractTimeRange(message);
  if (times && (lowerMsg.includes('시간') || lowerMsg.includes('시에') || lowerMsg.includes('시부터'))) {
    functionCalls.push({
      name: 'setTimeByRange',
      arguments: times,
    });
  }

  // 회의실 선택 패턴
  const room = extractRoom(message, context.allRooms || []);
  if (room && (lowerMsg.includes('회의실') || lowerMsg.includes('룸'))) {
    functionCalls.push({
      name: 'setRoomByName',
      arguments: { roomName: room },
    });
  }

  // 건물/층 선택 패턴
  const building = extractBuilding(message, context.buildings || []);
  if (building) {
    functionCalls.push({
      name: 'setBuildingByName',
      arguments: { name: building },
    });
  }

  const floor = message.match(/(\d+)층/);
  if (floor) {
    functionCalls.push({
      name: 'setFloorByName',
      arguments: { floorName: `${floor[1]}층` },
    });
  }

  // 최적 시간 찾기 패턴
  if (lowerMsg.includes('최적') || lowerMsg.includes('언제') || lowerMsg.includes('가능한 시간') || lowerMsg.includes('추천')) {
    const durationMatch = message.match(/(\d+)\s*분/);
    const hourMatch = message.match(/(\d+)\s*시간/);
    let duration = 60;
    if (durationMatch) duration = parseInt(durationMatch[1]);
    else if (hourMatch) duration = parseInt(hourMatch[1]) * 60;

    functionCalls.push({
      name: 'findOptimalTimes',
      arguments: { durationMinutes: duration },
    });
  }

  // 가용 회의실 조회 패턴
  if (lowerMsg.includes('비어있는') || lowerMsg.includes('가능한 회의실') || lowerMsg.includes('빈 회의실')) {
    const times = extractTimeRange(message);
    if (times) {
      functionCalls.push({
        name: 'getAvailableRooms',
        arguments: times,
      });
    }
  }

  // 내 예약 조회 패턴
  if (lowerMsg.includes('내 예약') || lowerMsg.includes('예약 목록') || lowerMsg.includes('예약 현황')) {
    functionCalls.push({
      name: 'getMyReservationList',
      arguments: { date: extractDate(message) },
    });
  }

  // 예약 취소 패턴
  if (lowerMsg.includes('취소') || lowerMsg.includes('삭제')) {
    const room = extractRoom(message, context.allRooms || []);
    const times = extractTimeRange(message);
    if (room && times) {
      functionCalls.push({
        name: 'cancelReservationByTime',
        arguments: { roomName: room, startTime: times.startTime },
      });
    }
  }

  // 현재 상태 조회 패턴
  if (lowerMsg.includes('현재 상태') || lowerMsg.includes('지금 상태') || lowerMsg.includes('선택된')) {
    functionCalls.push({
      name: 'getCurrentState',
      arguments: {},
    });
  }

  // 직원 검색 패턴
  if (lowerMsg.includes('검색') || lowerMsg.includes('찾아')) {
    const queryMatch = message.match(/[\"\'](.*?)[\"\']/) || message.match(/검색[:\s]*(.+)/);
    if (queryMatch) {
      functionCalls.push({
        name: 'searchEmployees',
        arguments: { query: queryMatch[1].trim() },
      });
    }
  }

  return functionCalls;
}

/**
 * 함수를 실행하고 결과를 반환합니다.
 */
export async function executeFunctions(functionCalls, reservation) {
  const results = [];

  console.group('%c[Function Calls]', 'color: #4CAF50; font-weight: bold;');
  console.log('Total calls:', functionCalls.length);

  for (const call of functionCalls) {
    console.log(`%c→ ${call.name}`, 'color: #2196F3; font-weight: bold;', call.arguments);

    try {
      let result;
      const args = call.arguments;

      switch (call.name) {
        case 'setOrganizerByName':
          result = reservation.setOrganizerByName(args.name);
          results.push({
            function: call.name,
            success: !!result,
            data: result ? `${result.name}님을 주관자로 설정했습니다.` : `"${args.name}" 직원을 찾을 수 없습니다.`,
          });
          break;

        case 'setParticipantsByNames':
          // type을 소문자로 변환 (REQUIRED -> required, OPTIONAL -> optional)
          const attendeeType = (args.type || 'REQUIRED').toLowerCase();
          result = reservation.setParticipantsByNames(args.names, attendeeType);
          results.push({
            function: call.name,
            success: result.length > 0,
            data: result.length > 0
              ? `${result.map(r => r.name).join(', ')}님을 ${args.type === 'OPTIONAL' ? '선택' : '필수'} 참석자로 추가했습니다.`
              : '일치하는 직원을 찾을 수 없습니다.',
          });
          break;

        case 'searchEmployees':
          result = reservation.searchEmployees(args.query);
          results.push({
            function: call.name,
            success: true,
            data: result.length > 0
              ? `검색 결과 (${result.length}명):\n${result.slice(0, 5).map(e => `- ${e.name} (${e.department}, ${e.position})`).join('\n')}`
              : `"${args.query}" 검색 결과가 없습니다.`,
          });
          break;

        case 'addGroupAsAttendees': {
          const groupType = (args.type || 'REQUIRED').toLowerCase();
          const group = reservation.myGroups.find(g =>
            g.name.includes(args.groupName) || args.groupName.includes(g.name)
          );
          if (group) {
            reservation.addGroupAsAttendees(group.id, groupType);
            const memberCount = group.members?.length || 0;
            results.push({
              function: call.name,
              success: true,
              data: `"${group.name}" 그룹의 ${memberCount}명을 ${groupType === 'optional' ? '선택' : '필수'} 참석자로 추가했습니다.`,
            });
          } else {
            results.push({
              function: call.name,
              success: false,
              data: `"${args.groupName}" 그룹을 찾을 수 없습니다. 주소록에서 그룹을 확인해주세요.`,
            });
          }
          break;
        }

        case 'setBuildingByName':
          result = reservation.setBuildingByName(args.name);
          results.push({
            function: call.name,
            success: !!result,
            data: result ? `${result.name} 건물을 선택했습니다.` : `"${args.name}" 건물을 찾을 수 없습니다.`,
          });
          break;

        case 'setFloorByName':
          result = reservation.setFloorByName(args.floorName, args.buildingName);
          results.push({
            function: call.name,
            success: !!result,
            data: result ? `${result.name}을 선택했습니다.` : `"${args.floorName}" 층을 찾을 수 없습니다.`,
          });
          break;

        case 'setRoomByName':
          result = reservation.setRoomByName(args.roomName);
          results.push({
            function: call.name,
            success: !!result,
            data: result ? `${result.name} (${result.capacity}인실)을 선택했습니다.` : `"${args.roomName}" 회의실을 찾을 수 없습니다.`,
          });
          break;

        case 'getAvailableRooms':
          result = reservation.getAvailableRooms(args.startTime, args.endTime);
          results.push({
            function: call.name,
            success: true,
            data: result.length > 0
              ? `${args.startTime}~${args.endTime} 예약 가능한 회의실 (${result.length}개):\n${result.slice(0, 5).map(r => `- ${r.name} (${r.capacity}인)`).join('\n')}`
              : `${args.startTime}~${args.endTime}에 예약 가능한 회의실이 없습니다.`,
            rooms: result,
          });
          break;

        case 'setDateByString':
          result = reservation.setDateByString(args.dateStr);
          results.push({
            function: call.name,
            success: !!result,
            data: result ? `날짜를 ${result}로 설정했습니다.` : `"${args.dateStr}" 날짜를 인식할 수 없습니다.`,
          });
          break;

        case 'setTimeByRange':
          result = reservation.setTimeByRange(args.startTime, args.endTime);
          results.push({
            function: call.name,
            success: result,
            data: result
              ? `시간을 ${args.startTime}~${args.endTime}로 설정했습니다.`
              : '해당 시간은 이미 예약되어 있거나 회의실이 선택되지 않았습니다.',
          });
          break;

        case 'findOptimalTimes':
          result = reservation.findOptimalTimes(args.durationMinutes || 60);
          results.push({
            function: call.name,
            success: true,
            data: result.length > 0
              ? `${args.durationMinutes || 60}분 회의 추천 시간:\n${result.slice(0, 5).map((t, i) =>
                  `${i + 1}. ${t.startTime}~${t.endTime} (${t.isAllRequiredAvailable ? '전원 가능' : `${t.requiredScore}명 가능`}, ${t.availableRooms.length}개 회의실)`
                ).join('\n')}`
              : '모든 참석자가 가능한 시간을 찾을 수 없습니다.',
            optimalTimes: result,
          });
          break;

        case 'createQuickReservation':
          result = await reservation.createQuickReservation(args);
          results.push({
            function: call.name,
            success: result.success,
            data: result.success
              ? `예약이 완료되었습니다! (${args.roomName}, ${args.date} ${args.startTime}~${args.endTime})`
              : `예약 실패: ${result.error}`,
          });
          break;

        case 'getMyReservationList':
          result = reservation.getMyReservationList(args.date);
          results.push({
            function: call.name,
            success: true,
            data: result.length > 0
              ? `내 예약 목록 (${result.length}건):\n${result.map(r =>
                  `- ${r.date} ${r.startTime}~${r.endTime} ${r.roomName} "${r.title}"`
                ).join('\n')}`
              : '예약이 없습니다.',
            reservations: result,
          });
          break;

        case 'cancelReservationByTime':
          result = reservation.cancelReservationByTime(args.roomName, args.startTime);
          results.push({
            function: call.name,
            success: result.success,
            data: result.success
              ? `예약이 취소되었습니다.`
              : `취소 실패: ${result.error}`,
          });
          break;

        case 'getCurrentState':
          result = reservation.getCurrentState();
          const stateLines = [];
          if (result.organizer) stateLines.push(`주관자: ${result.organizer.name}`);
          if (result.requiredAttendees.length > 0) stateLines.push(`필수 참석자: ${result.requiredAttendees.map(a => a.name).join(', ')}`);
          if (result.optionalAttendees.length > 0) stateLines.push(`선택 참석자: ${result.optionalAttendees.map(a => a.name).join(', ')}`);
          if (result.building) stateLines.push(`건물: ${result.building.name}`);
          if (result.room) stateLines.push(`회의실: ${result.room.name}`);
          stateLines.push(`날짜: ${result.date}`);
          if (result.timeSlots) stateLines.push(`시간: ${result.timeSlots.start}~${result.timeSlots.end} (${result.timeSlots.durationMinutes}분)`);
          if (result.title) stateLines.push(`제목: ${result.title}`);
          results.push({
            function: call.name,
            success: true,
            data: stateLines.length > 0 ? `현재 상태:\n${stateLines.join('\n')}` : '선택된 항목이 없습니다.',
            state: result,
          });
          break;

        case 'setRecurrenceByString':
          result = reservation.setRecurrenceByString(args.typeStr, args.endDateStr);
          results.push({
            function: call.name,
            success: true,
            data: `반복 일정을 "${args.typeStr}"로 설정했습니다.`,
          });
          break;

        default:
          results.push({
            function: call.name,
            success: false,
            data: `알 수 없는 함수: ${call.name}`,
          });
      }
    } catch (error) {
      console.error(`%c✗ ${call.name} Error:`, 'color: #f44336;', error.message);
      results.push({
        function: call.name,
        success: false,
        data: `오류 발생: ${error.message}`,
      });
    }
  }

  console.log('%cResults:', 'color: #FF9800; font-weight: bold;', results);
  console.groupEnd();

  return results;
}

/**
 * 결과를 사용자 친화적 메시지로 변환합니다.
 */
export function formatFunctionResults(results) {
  if (results.length === 0) return null;

  const messages = results.map(r => r.data);
  return messages.join('\n\n');
}

// 헬퍼 함수들
function extractNames(message, employees) {
  const namesSet = new Set();

  // 정확히 일치하는 이름 찾기 (3글자 이름 우선)
  for (const emp of employees) {
    if (message.includes(emp.name)) {
      namesSet.add(emp.name);
    }
  }

  // 찾지 못했으면 "~님" 패턴으로 이름 추출 시도
  if (namesSet.size === 0) {
    const namePatterns = message.match(/([가-힣]{2,4})(?:님|씨|과장|대리|부장|차장|사원|팀장|본부장)?/g);
    if (namePatterns) {
      for (const pattern of namePatterns) {
        const name = pattern.replace(/님|씨|과장|대리|부장|차장|사원|팀장|본부장/g, '');
        // employees에서 정확 일치 먼저 시도
        let found = employees.find(emp => emp.name === name);
        // 없으면 부분 일치
        if (!found) {
          found = employees.find(emp => emp.name.includes(name) || name.includes(emp.name));
        }
        if (found) {
          namesSet.add(found.name);
        }
      }
    }
  }

  return Array.from(namesSet);
}

function extractTimeRange(message) {
  // 14시~15시, 오후 2시부터 3시, 14:00-15:00 등
  const patterns = [
    /(\d{1,2}):(\d{2})\s*[~\-부터]\s*(\d{1,2}):(\d{2})/,
    /(오전|오후)?\s*(\d{1,2})시\s*(\d{1,2})?분?\s*[~\-부터에서]\s*(오전|오후)?\s*(\d{1,2})시/,
    /(\d{1,2})시\s*[~\-부터]\s*(\d{1,2})시/,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      let startHour, startMin = 0, endHour, endMin = 0;

      if (pattern === patterns[0]) {
        startHour = parseInt(match[1]);
        startMin = parseInt(match[2]);
        endHour = parseInt(match[3]);
        endMin = parseInt(match[4]);
      } else if (pattern === patterns[1]) {
        startHour = parseInt(match[2]);
        if (match[1] === '오후' && startHour < 12) startHour += 12;
        startMin = match[3] ? parseInt(match[3]) : 0;
        endHour = parseInt(match[5]);
        if (match[4] === '오후' && endHour < 12) endHour += 12;
        else if (!match[4] && match[1] === '오후' && endHour < 12) endHour += 12;
      } else {
        startHour = parseInt(match[1]);
        endHour = parseInt(match[2]);
        // 오후 시간 추정
        if (startHour < 12 && endHour < 12 && startHour < endHour) {
          if (startHour >= 1 && startHour <= 6) {
            startHour += 12;
            endHour += 12;
          }
        }
      }

      return {
        startTime: `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`,
        endTime: `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`,
      };
    }
  }
  return null;
}

function extractDate(message) {
  if (message.includes('내일')) return '내일';
  if (message.includes('오늘')) return '오늘';
  if (message.includes('모레')) return '모레';
  if (message.includes('다음 주')) return '다음 주';

  const dayMatch = message.match(/(월|화|수|목|금|토|일)요일/);
  if (dayMatch) return `${dayMatch[1]}요일`;

  const dateMatch = message.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) return dateMatch[0];

  return null;
}

function extractGroupName(message, groups) {
  // 정확히 일치하는 그룹 찾기
  for (const group of groups) {
    if (message.includes(group.name)) {
      return group.name;
    }
  }

  // "~그룹" 패턴으로 추출 시도
  const groupMatch = message.match(/["\']?([가-힣A-Za-z0-9\s]+)["\']?\s*그룹/);
  if (groupMatch) {
    const name = groupMatch[1].trim();
    // 부분 일치 검색
    const found = groups.find(g =>
      g.name.includes(name) || name.includes(g.name)
    );
    if (found) return found.name;
    return name; // 찾지 못해도 추출한 이름 반환
  }

  return null;
}

function extractRoom(message, rooms) {
  for (const room of rooms) {
    if (message.includes(room.name)) {
      return room.name;
    }
  }

  // 일반적인 회의실 패턴
  const roomMatch = message.match(/(대?회의실\s*[A-Za-z가-힣0-9]+|[A-Za-z가-힣]+\s*룸)/);
  if (roomMatch) return roomMatch[1];

  return null;
}

function extractBuilding(message, buildings) {
  for (const building of buildings) {
    if (message.includes(building.name)) {
      return building.name;
    }
  }
  return null;
}
