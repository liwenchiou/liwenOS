import React, { useState, useEffect, useRef } from 'react';
import { Calendar, FileText, Plus, FileEdit, CheckCircle2, Clock, Check, Sparkles, X, FilePlus, RefreshCw, Trash2, Eye, EyeOff } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export default function DashboardView({ events, notesTree, onOpenCreateModal, onSaveNewNote, showToast }) {
  const [scratchpadText, setScratchpadText] = useState('');
  const [saveStatus, setSaveStatus] = useState('已同步');
  const [pendingTasks, setPendingTasks] = useState([]);
  const [newQuickTask, setNewQuickTask] = useState('');
  const [isLoadingTodos, setIsLoadingTodos] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(true);

  // 行程詳情 / 產出會議筆記 Modal 狀態
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [extraNotesText, setExtraNotesText] = useState('');

  const isFirstRender = useRef(true);

  // 1. 從後端 API 撈取 Google Sheet 待辦事項 (/api/todos)
  const fetchGoogleSheetTodos = async () => {
    setIsLoadingTodos(true);
    try {
      const res = await fetch('/api/todos');
      const data = await res.json();
      if (data.status === 'success' || data.success) {
        setPendingTasks(data.data || []);
      }
    } catch (err) {
      console.error('撈取 Google Sheet 待辦事項失敗:', err);
    } finally {
      setIsLoadingTodos(false);
    }
  };

  useEffect(() => {
    fetchGoogleSheetTodos();
  }, []);

  // 2. 初始載入 ./notes/scratchpad.md 隨手筆記內容
  useEffect(() => {
    const fetchScratchpad = async () => {
      try {
        const res = await fetch('/api/notes/file?relPath=scratchpad.md');
        const data = await res.json();
        const content = (data && data.data) ? data.data.content : data.content;
        if ((data.status === 'success' || data.success) && content !== undefined) {
          setScratchpadText(content);
        }
      } catch (err) {}
    };
    fetchScratchpad();
  }, []);

  // 3. 防抖自動存檔至 ./notes/scratchpad.md (800ms)
  const autoSaveScratchpad = async (content) => {
    try {
      setSaveStatus('儲存中...');
      await fetch('/api/notes/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relPath: 'scratchpad.md', content })
      });
      setSaveStatus('已同步');
    } catch (err) {
      setSaveStatus('儲存失敗');
    }
  };

  const handleScratchpadChange = (e) => {
    const newText = e.target.value;
    setScratchpadText(newText);
    setSaveStatus('儲存中...');
  };

  // Google Sheet 待辦事項操作 (CRUD)
  const handleAddGoogleSheetTask = async (e) => {
    e.preventDefault();
    if (!newQuickTask.trim()) return;

    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newQuickTask.trim() })
      });
      const data = await res.json();
      if (data.status === 'success' || data.success) {
        setNewQuickTask('');
        if (showToast) showToast('已成功新增待辦事項至 Google Sheet', 'success');
        fetchGoogleSheetTodos();
      }
    } catch (err) {
      if (showToast) showToast('新增待辦事項至 Google Sheet 失敗: ' + err.message, 'error');
    }
  };

  const handleToggleGoogleSheetTask = async (task) => {
    try {
      const res = await fetch(`/api/todos/${task.rowNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed })
      });
      const data = await res.json();
      if (data.status === 'success' || data.success) {
        fetchGoogleSheetTodos();
      }
    } catch (err) {
      if (showToast) showToast('更新 Google Sheet 狀態失敗: ' + err.message, 'error');
    }
  };

  const [deleteConfirmTask, setDeleteConfirmTask] = useState(null);

  const confirmDeleteGoogleSheetTask = async () => {
    if (!deleteConfirmTask) return;
    try {
      const res = await fetch(`/api/todos/${deleteConfirmTask.rowNumber}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.status === 'success' || data.success) {
        if (showToast) showToast(`已從 Google Sheet 刪除「${deleteConfirmTask.text}」`, 'success');
        fetchGoogleSheetTodos();
      }
    } catch (err) {
      if (showToast) showToast('刪除 Google Sheet 待辦事項失敗: ' + err.message, 'error');
    } finally {
      setDeleteConfirmTask(null);
    }
  };

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      if (scratchpadText) {
        autoSaveScratchpad(scratchpadText);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [scratchpadText]);

  useEffect(() => {
    if (!selectedEvent) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedEvent(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEvent]);

  const handleEventClick = (evt) => {
    setSelectedEvent(evt);
    setExtraNotesText('');
  };

  const handleCreateNoteFromEvent = () => {
    if (!selectedEvent) return;

    const timeString = `${new Date(selectedEvent.start).toLocaleString()} - ${new Date(selectedEvent.end).toLocaleTimeString()}`;
    
    let mdContent = `# 📌 會議記錄：${selectedEvent.summary}\n\n`;
    mdContent += `- **行程名稱**：${selectedEvent.summary}\n`;
    mdContent += `- **日期時間**：${timeString}\n`;
    mdContent += `- **來源**：${selectedEvent.source || 'Google Calendar'}\n`;
    if (selectedEvent.location) {
      mdContent += `- **地點/連結**：${selectedEvent.location}\n`;
    }
    mdContent += `\n---\n\n## 💡 補充紀錄與觀察\n`;
    mdContent += extraNotesText.trim() ? extraNotesText : `- (尚無補充紀錄)\n`;
    mdContent += `\n\n## 🚀 待辦事項 (Action Items)\n- [ ] \n`;

    const fileName = `daily/meeting-${selectedEvent.summary.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.md`;
    
    if (onSaveNewNote) {
      onSaveNewNote(fileName, mdContent);
    }

    setSelectedEvent(null);
    setExtraNotesText('');
  };

  const nowObj = new Date();
  const todayStrDate = nowObj.toDateString();
  const yearStr = nowObj.getFullYear();
  const monthStr = String(nowObj.getMonth() + 1).padStart(2, '0');
  const dayStr = String(nowObj.getDate()).padStart(2, '0');
  const todayYYYYMMDD = `${yearStr}-${monthStr}-${dayStr}`;

  const todayEvents = (events || []).filter(evt => {
    if (!evt.start) return false;
    if (typeof evt.start === 'string' && evt.start.startsWith(todayYYYYMMDD)) return true;
    const d = new Date(evt.start);
    return d.getFullYear() >= 2000 && d.toDateString() === todayStrDate;
  });

  // 過濾 & 排序待辦事項：未完成在上，已完成在下
  const processedTasks = [...pendingTasks]
    .filter(t => (hideCompleted ? !t.completed : true))
    .sort((a, b) => {
      if (a.completed === b.completed) return 0;
      return a.completed ? 1 : -1; // 未完成的排在前面
    });

  const completedCount = pendingTasks.filter(t => t.completed).length;

  return (
    <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 頁面標題 */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: '700' }}>liwen OS 數位大腦儀表板</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
          {new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
        </p>
      </div>

      {/* 主要 RWD 2x2 響應式網格佈局 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px',
        alignItems: 'stretch'
      }}>
        
        {/* Widget 1: 今日 Google Calendar 行事曆 */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div style={{ background: 'rgba(6, 182, 212, 0.15)', padding: '8px', borderRadius: '8px', flexShrink: 0 }}>
                <Calendar size={20} color="var(--accent-cyan)" />
              </div>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>今日 Google 行事曆</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                  點擊行程自動產出筆記
                </span>
              </div>
            </div>
            <button className="btn-primary" onClick={onOpenCreateModal} style={{ padding: '6px 10px', fontSize: '12px', flexShrink: 0 }}>
              <Plus size={14} /> 新增行程
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
            {todayEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)', fontSize: '13px' }}>
                今日無排定行程
              </div>
            ) : (
              todayEvents.map(evt => (
                <div
                  key={evt.id}
                  onClick={() => handleEventClick(evt)}
                  className="glass-card"
                  style={{
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    borderLeft: '4px solid var(--accent-cyan)',
                    cursor: 'pointer',
                    transition: 'var(--transition-fast)',
                    minWidth: 0
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 0 }}>
                    <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{evt.summary}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <span>🕒 {new Date(evt.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(evt.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {evt.location && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📍 {evt.location}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Widget 2: 待辦事項 (直連 Google Sheet To-Dos 分頁) */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '8px', borderRadius: '8px', flexShrink: 0 }}>
                <CheckCircle2 size={20} color="var(--accent-emerald)" />
              </div>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>待辦事項 (To-Dos)</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                  未完成置頂 | 雙向直連 Sheet
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
              {/* 隱藏已完成事項切換按鈕 */}
              <button
                onClick={() => setHideCompleted(!hideCompleted)}
                style={{
                  fontSize: '11px',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: hideCompleted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                  border: hideCompleted ? '1px solid var(--accent-rose)' : '1px solid var(--border-glass)',
                  color: hideCompleted ? '#fca5a5' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'var(--transition-fast)'
                }}
                title={hideCompleted ? '顯示已完成事項' : '隱藏已完成事項'}
              >
                {hideCompleted ? <EyeOff size={13} /> : <Eye size={13} />}
                {hideCompleted ? `隱藏 (${completedCount})` : '顯示全部'}
              </button>

              <button
                onClick={fetchGoogleSheetTodos}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                title="重新整理 Google Sheet"
              >
                <RefreshCw size={14} className={isLoadingTodos ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* 新增待辦事項至 Google Sheet 的輸入框 */}
          <form onSubmit={handleAddGoogleSheetTask} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={newQuickTask}
              onChange={(e) => setNewQuickTask(e.target.value)}
              placeholder="新增待辦事項至 Google Sheet..."
              style={{
                flex: 1,
                minWidth: 0,
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 12px',
                color: 'var(--text-main)',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <button type="submit" className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', flexShrink: 0 }}>
              新增
            </button>
          </form>

          {/* 待辦事項清單（直接來自 Google Sheet） */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
            {isLoadingTodos ? (
              <p style={{ color: 'var(--text-dim)', fontSize: '13px', textAlign: 'center', padding: '16px' }}>
                載入 Google Sheet 待辦事項中...
              </p>
            ) : processedTasks.length === 0 ? (
              <p style={{ color: 'var(--accent-emerald)', fontSize: '13px', textAlign: 'center', padding: '16px' }}>
                🎉 {hideCompleted ? '目前無未完成待辦事項！' : '目前試算表中尚無待辦事項！'}
              </p>
            ) : (
              processedTasks.map((task) => (
                <div
                  key={task.id}
                  className="glass-card"
                  style={{
                    padding: '8px 12px',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    background: task.completed ? 'rgba(15, 23, 42, 0.3)' : 'rgba(30, 41, 59, 0.6)',
                    opacity: task.completed ? 0.7 : 1,
                    borderLeft: task.completed ? '3px solid var(--text-dim)' : '3px solid var(--accent-emerald)',
                    minWidth: 0
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => handleToggleGoogleSheetTask(task)}
                      style={{ cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }}
                    />
                    <span style={{
                      fontSize: '13px',
                      fontWeight: task.completed ? '400' : '600',
                      textDecoration: task.completed ? 'line-through' : 'none',
                      color: task.completed ? 'var(--text-dim)' : 'var(--text-main)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {task.text}
                    </span>
                  </label>
                  
                  {task.targetDate && (
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', marginRight: '6px', flexShrink: 0 }}>
                      {task.targetDate}
                    </span>
                  )}

                  <button
                    onClick={() => setDeleteConfirmTask(task)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', opacity: 0.6, flexShrink: 0 }}
                    title="刪除"
                  >
                    <Trash2 size={14} color="var(--accent-rose)" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Widget 3: 快捷隨手筆記（自動同步至 ./notes/scratchpad.md） */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '8px', borderRadius: '8px', flexShrink: 0 }}>
                <FileEdit size={20} color="var(--primary-linear)" />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: '700' }}>快捷隨手筆記</h3>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <Check size={12} /> {saveStatus}
            </span>
          </div>

          <textarea
            value={scratchpadText}
            onChange={handleScratchpadChange}
            placeholder="在此輸入想法，將即時自動同步至 ./notes/scratchpad.md..."
            style={{
              flex: 1,
              width: '100%',
              minHeight: '180px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              color: 'var(--text-main)',
              fontFamily: 'monospace',
              fontSize: '13px',
              lineHeight: '1.6',
              resize: 'none',
              outline: 'none'
            }}
          />
        </div>

        {/* Widget 4: 同步與系統狀態 */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '8px', borderRadius: '8px', flexShrink: 0 }}>
              <CheckCircle2 size={20} color="var(--accent-amber)" />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: '700' }}>同步與狀態</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="glass-card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Git 版本控制 / 本地同步</span>
              <span style={{ fontSize: '12px', color: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>本地同步中 (./notes)</span>
            </div>

            <div className="glass-card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Google 行事曆 API</span>
              <span style={{ fontSize: '12px', color: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>已連線</span>
            </div>

            <div className="glass-card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Google Sheet To-Dos</span>
              <span style={{ fontSize: '12px', color: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>已直連</span>
            </div>

            <div className="glass-card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>安大 / 貝貝 iCloud 訂閱</span>
              <span style={{ fontSize: '12px', color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>自動同步中</span>
            </div>

            <div className="glass-card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>本地沙盒資料夾</span>
              <span style={{ fontSize: '12px', color: 'var(--primary-linear)', background: 'rgba(94, 106, 210, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>./notes</span>
            </div>
          </div>
        </div>

      </div>

      {/* 浮動居中毛玻璃 Modal：行程會議筆記編輯對話框 */}
      {selectedEvent && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(9, 13, 22, 0.75)',
          backdropFilter: 'blur(10px)',
          display: 'grid',
          placeContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{
            width: '560px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
            animation: 'fadeIn 0.2s ease-in-out'
          }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="var(--accent-cyan)" /> 📌 行程會議筆記與紀錄
              </h3>
              <button type="button" onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* 行程資訊卡片 */}
            <div className="glass-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(30, 41, 59, 0.7)' }}>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>
                📌 名稱：<span style={{ color: 'var(--text-main)' }}>{selectedEvent.summary}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                🕒 時間：{new Date(selectedEvent.start).toLocaleString()} - {new Date(selectedEvent.end).toLocaleTimeString()}
              </div>
              {selectedEvent.location && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  📍 地點/連結：{selectedEvent.location}
                </div>
              )}
            </div>

            {/* 補充紀錄輸入框 */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px', display: 'block' }}>
                ✍️ 補充內容 (您可以輸入會議紀錄、討論要點或隨筆)：
              </label>
              <textarea
                value={extraNotesText}
                onChange={(e) => setExtraNotesText(e.target.value)}
                placeholder="在此輸入您針對此行程的補充紀錄..."
                style={{
                  width: '100%',
                  height: '120px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid var(--border-glass-bright)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  resize: 'none',
                  outline: 'none'
                }}
              />
            </div>

            {/* 操作按鈕列 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button className="btn-secondary" onClick={() => setSelectedEvent(null)}>取消</button>
              <button className="btn-primary" onClick={handleCreateNoteFromEvent} style={{ background: 'linear-gradient(135deg, var(--accent-cyan), #0284c7)' }}>
                <FilePlus size={16} /> 儲存並建立實體 .md 筆記
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 毛玻璃確認 Modal：Google Sheet 待辦事項刪除確認 */}
      <ConfirmModal
        isOpen={!!deleteConfirmTask}
        title="刪除 Google Sheet 待辦事項"
        message={deleteConfirmTask ? `確定要從 Google Sheet 中永久刪除「${deleteConfirmTask.text}」嗎？` : ''}
        onConfirm={confirmDeleteGoogleSheetTask}
        onCancel={() => setDeleteConfirmTask(null)}
      />

    </div>
  );
}
