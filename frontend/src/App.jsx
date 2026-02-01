import { ChatProvider } from './context/ChatContext';
import { ReservationProvider } from './context/ReservationContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast';
import Sidebar from './components/Sidebar';
import RoomReservation from './components/RoomReservation';
import FloatingChat from './components/FloatingChat';

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ChatProvider>
          <ReservationProvider>
            <div className="flex h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
              {/* Sidebar - 참여자 선택 */}
              <Sidebar />

              {/* Main Content - 회의실 예약 */}
              <main className="flex-1 overflow-hidden">
                <RoomReservation />
              </main>

              {/* Floating Chat - LLM 채팅 */}
              <FloatingChat />
            </div>
          </ReservationProvider>
        </ChatProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
