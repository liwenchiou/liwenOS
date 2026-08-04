import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import CalendarView from './components/CalendarView';
import NotesView from './components/NotesView';
import ReportView from './components/ReportView';
import CreateEventModal from './components/CreateEventModal';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [events, setEvents] = useState([]);
  const [notesTree, setNotesTree] = useState([]);
  const [selectedFilePath, setSelectedFilePath] = useState('welcome.md');
  const [fileContent, setFileContent] = useState('');
  
  // 新增行程 Modal 狀態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialTitle, setModalInitialTitle] = useState('');

  // 全域浮動 Toast 通知狀態（堆疊式陣列）
  const [toasts, setToasts] = useState([]);
  const toastIdRef = React.useRef(0);

  const showToast = (message, type = 'success') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  };

  // 輔助函式：解析 3-Tier API 標準信封格式
  const isSuccess = (resData) => resData && (resData.status === 'success' || resData.success === true);
  const getPayload = (resData) => (resData && resData.data) ? resData.data : resData;

  // 1. 從後端 API 撈取 Google Calendar 行事曆事件（支援指定年月）
  const fetchCalendarEvents = async (year, month) => {
    try {
      let url = '/api/calendar/events';
      if (year != null && month != null) {
        url += `?year=${year}&month=${month}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (isSuccess(data)) {
        const payload = getPayload(data);
        setEvents(payload.events || []);
      }
    } catch (err) {
      console.error('撈取行事曆事件失敗:', err);
    }
  };

  // 2. 從後端 API 撈取本地 ./notes/ 目錄樹結構
  const fetchNotesTree = async () => {
    try {
      const res = await fetch('/api/notes/tree');
      const data = await res.json();
      if (isSuccess(data)) {
        const payload = getPayload(data);
        setNotesTree(payload.tree || []);
      }
    } catch (err) {
      console.error('撈取筆記目錄樹失敗:', err);
    }
  };

  // 3. 載入使用者選取的 Markdown 檔案內容
  const loadFileContent = async (relPath) => {
    try {
      setSelectedFilePath(relPath);
      const res = await fetch(`/api/notes/file?relPath=${encodeURIComponent(relPath)}`);
      const data = await res.json();
      if (isSuccess(data)) {
        const payload = getPayload(data);
        setFileContent(payload.content || '');
      }
    } catch (err) {
      console.error('載入檔案內容失敗:', err);
    }
  };

  // 4. 儲存 Markdown 檔案內容至本機 ./notes/
  const handleSaveFile = async (relPath, content, options = {}) => {
    try {
      const res = await fetch('/api/notes/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relPath, content })
      });
      const data = await res.json();
      if (isSuccess(data)) {
        if (!options.silent) {
          showToast(`已成功儲存至本機 ./notes/${relPath}`, 'success');
        }
        fetchNotesTree();
        return true;
      }
      if (!options.silent) {
        showToast(`儲存檔案失敗: ${data.message || '未知錯誤'}`, 'error');
      }
      return false;
    } catch (err) {
      if (!options.silent) {
        showToast('儲存檔案失敗: ' + err.message, 'error');
      }
      return false;
    }
  };

  // 5. 新增筆記檔案或資料夾
  const handleCreateFile = async (relPath, isDirectory = false) => {
    try {
      const res = await fetch('/api/notes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relPath, isDirectory })
      });
      const data = await res.json();
      if (isSuccess(data)) {
        showToast(`已成功建立 ${isDirectory ? '資料夾' : '檔案'} ${relPath}`, 'success');
        fetchNotesTree();
        if (!isDirectory) {
          loadFileContent(relPath);
        }
      }
    } catch (err) {
      showToast('建立失敗: ' + err.message, 'error');
    }
  };

  // 6. 刪除筆記檔案或資料夾
  const handleDeleteFile = async (relPath) => {
    try {
      const res = await fetch(`/api/notes/file?relPath=${encodeURIComponent(relPath)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (isSuccess(data)) {
        showToast(`已成功刪除 ${relPath}`, 'success');
        fetchNotesTree();
        setSelectedFilePath('');
        setFileContent('');
      }
    } catch (err) {
      showToast('刪除失敗: ' + err.message, 'error');
    }
  };

  // 7. 新增行程至 Google Calendar
  const handleCreateEvent = async (eventData) => {
    try {
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });
      const data = await res.json();
      if (isSuccess(data)) {
        showToast(data.message || '行程成功建立並連動！', 'success');
        fetchCalendarEvents();
      }
    } catch (err) {
      showToast('建立行程失敗: ' + err.message, 'error');
    }
  };

  useEffect(() => {
    fetchCalendarEvents();
    fetchNotesTree();
    loadFileContent('welcome.md');
  }, []);

  const handleOpenCreateModalWithTitle = (title = '') => {
    setModalInitialTitle(title);
    setIsModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      
      {/* 全域浮動 Toast 通知堆疊橫幅 */}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          zIndex: 2000,
          pointerEvents: 'none'
        }}>
          {toasts.map((t) => (
            <div
              key={t.id}
              style={{
                background: t.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)',
                color: '#ffffff',
                padding: '12px 20px',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(10px)',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                animation: 'fadeIn 0.2s ease-in-out',
                pointerEvents: 'auto'
              }}
            >
              {t.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
              <span>{t.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* 左側導航列 */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 主內容區：根據 activeTab 切換不同頁面 */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {activeTab === 'dashboard' && (
          <DashboardView
            events={events}
            notesTree={notesTree}
            onOpenCreateModal={() => handleOpenCreateModalWithTitle('')}
            onSaveNewNote={handleSaveFile}
            showToast={showToast}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            events={events}
            onOpenCreateModal={() => handleOpenCreateModalWithTitle('')}
            onSaveNewNote={handleSaveFile}
            onFetchEvents={fetchCalendarEvents}
            showToast={showToast}
          />
        )}

        {activeTab === 'notes' && (
          <NotesView
            notesTree={notesTree}
            selectedFilePath={selectedFilePath}
            onSelectFile={loadFileContent}
            fileContent={fileContent}
            onSaveFile={handleSaveFile}
            onCreateFile={handleCreateFile}
            onDeleteFile={handleDeleteFile}
            onOpenCreateModalWithTitle={handleOpenCreateModalWithTitle}
            showToast={showToast}
          />
        )}

        {activeTab === 'report' && (
          <ReportView
            events={events}
            notesTree={notesTree}
            onSaveNewNote={handleSaveFile}
            showToast={showToast}
          />
        )}
      </main>

      {/* 全域新增行程 Modal 對話框 */}
      <CreateEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateEvent={handleCreateEvent}
        initialTitle={modalInitialTitle}
        showToast={showToast}
      />
    </div>
  );
}
