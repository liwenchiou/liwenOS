import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Clock, Plus, FilePlus, Link, Check, Sparkles, Grid, List, X, ShieldAlert, Key, ChevronLeft, ChevronRight } from 'lucide-react';

export default function CalendarView({ events, onOpenCreateModal, onSaveNewNote }) {
  const [viewMode, setViewMode] = useState('month'); // Default to full-width 'month' view
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [extraNotesText, setExtraNotesText] = useState('');
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8:00 AM to 9:00 PM

  // Current Date & Month grid calculations
  const currentDate = new Date();
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const todayDate = new Date();
  const todayStr = currentDate.toDateString();
  const currentHour = currentDate.getHours();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = viewDate.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' });

  // Filter 1: Valid events (Exclude invalid / 1970 dummy test entries)
  const validEvents = (events || []).filter(e => {
    const d = new Date(e.start);
    return d.getFullYear() >= 2000;
  });

  // Filter 2: Strictly Today's Events for Timeline View
  const nowObj = new Date();
  const yearStr = nowObj.getFullYear();
  const monthStr = String(nowObj.getMonth() + 1).padStart(2, '0');
  const dayStr = String(nowObj.getDate()).padStart(2, '0');
  const todayYYYYMMDD = `${yearStr}-${monthStr}-${dayStr}`;

  const todayEvents = validEvents.filter(e => {
    if (!e.start) return false;
    if (typeof e.start === 'string' && e.start.startsWith(todayYYYYMMDD)) return true;
    return new Date(e.start).toDateString() === todayStr;
  });

  const handleSelectEvent = (evt) => {
    setSelectedEvent(evt);
    setExtraNotesText('');
  };

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

  const handleSaveAsNoteFile = () => {
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
    mdContent += extraNotesText.trim() ? extraNotesText : `- (無補充紀錄)\n`;
    mdContent += `\n\n## 🚀 待辦事項 (Action Items)\n- [ ] \n`;

    const fileName = `daily/meeting-${selectedEvent.summary.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.md`;
    onSaveNewNote(fileName, mdContent);

    setSelectedEvent(null);
    setExtraNotesText('');
  };

  // Helper for source badge aesthetics
  const getSourceBadgeStyle = (source) => {
    const src = (source || '').toLowerCase();
    if (src.includes('貝貝') || src.includes('beibei')) {
      return {
        background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.25), rgba(236, 72, 153, 0.2))',
        border: '1px solid rgba(251, 113, 133, 0.4)',
        color: '#fda4af'
      };
    }
    if (src.includes('安大') || src.includes('andal')) {
      return {
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(14, 165, 233, 0.2))',
        border: '1px solid rgba(56, 189, 248, 0.4)',
        color: '#7dd3fc'
      };
    }
    // Default: AI 助理行事曆
    return {
      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(99, 102, 241, 0.2))',
      border: '1px solid rgba(167, 139, 250, 0.4)',
      color: '#c4b5fd'
    };
  };

  return (
    <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* Full Width Calendar Container */}
      <div className="glass-panel" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '24px',
        gap: '20px',
        overflow: 'hidden'
      }}>
        
        {/* Header & View Switcher */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CalendarIcon size={24} color="var(--primary-linear)" />
              {viewMode === 'month' ? `行事曆概覽 (${monthName})` : `當日行程時間軸 (${currentDate.toLocaleDateString('zh-TW')})`}
            </h1>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              100% 全寬視野 | 已綁定 AI 助理專用日曆 & iCloud 訂閱
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Toggle Buttons */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.8)',
              padding: '4px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-glass)',
              display: 'flex',
              gap: '4px'
            }}>
              <button
                onClick={() => setViewMode('month')}
                style={{
                  background: viewMode === 'month' ? 'linear-gradient(135deg, var(--primary-linear), #7c83ff)' : 'transparent',
                  color: viewMode === 'month' ? 'white' : 'var(--text-muted)',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'var(--transition-fast)'
                }}
              >
                <Grid size={14} /> 整月全寬視圖
              </button>
              <button
                onClick={() => setViewMode('day')}
                style={{
                  background: viewMode === 'day' ? 'linear-gradient(135deg, var(--primary-linear), #7c83ff)' : 'transparent',
                  color: viewMode === 'day' ? 'white' : 'var(--text-muted)',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'var(--transition-fast)'
                }}
              >
                <List size={14} /> 當日時間軸
              </button>
            </div>

            <button className="btn-primary" onClick={onOpenCreateModal} style={{ padding: '8px 14px', fontSize: '13px' }}>
              <Plus size={16} /> 新增行程
            </button>
          </div>
        </div>

        {/* View Mode 1: Day Timeline View */}
        {viewMode === 'day' && (
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {hours.map(hour => {
              const timeStr = `${hour.toString().padStart(2, '0')}:00`;
              const isCurrentHour = currentHour === hour;
              const matchingEvents = todayEvents.filter(e => {
                const startHour = new Date(e.start).getHours();
                return startHour === hour;
              });

              return (
                <div key={hour} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', minHeight: '60px', position: 'relative' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: isCurrentHour ? '700' : '500',
                    color: isCurrentHour ? 'var(--accent-rose)' : 'var(--text-dim)',
                    width: '50px',
                    textAlign: 'right',
                    paddingTop: '2px'
                  }}>
                    {timeStr}
                  </span>

                  {/* Current Hour Indicator Line */}
                  {isCurrentHour && (
                    <div style={{
                      position: 'absolute',
                      left: '66px',
                      right: 0,
                      top: '10px',
                      height: '2px',
                      background: 'var(--accent-rose)',
                      boxShadow: '0 0 10px rgba(244, 63, 94, 0.8)',
                      zIndex: 10,
                      pointerEvents: 'none',
                      animation: 'pulseRedLine 2s infinite'
                    }} />
                  )}

                  <div style={{ flex: 1, borderTop: isCurrentHour ? '1px solid rgba(244, 63, 94, 0.5)' : '1px dashed var(--border-glass)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {matchingEvents.length === 0 ? (
                      <div style={{ height: '1px' }} />
                    ) : (
                      matchingEvents.map(evt => {
                        const badgeStyle = getSourceBadgeStyle(evt.source);
                        return (
                          <div
                            key={evt.id}
                            onClick={() => handleSelectEvent(evt)}
                            className="glass-card"
                            style={{
                              padding: '12px 16px',
                              cursor: 'pointer',
                              display: 'flex',
                              justify: 'space-between',
                              alignItems: 'center',
                              borderLeft: `4px solid ${badgeStyle.color}`,
                              transition: 'var(--transition-fast)'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>{evt.summary}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <span>🕒 {new Date(evt.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(evt.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {evt.location && <span>📍 {evt.location}</span>}
                                {evt.source && (
                                  <span style={{
                                    fontSize: '10px',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    ...badgeStyle
                                  }}>
                                    {evt.source}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* View Mode 2: Month Grid View (Full Width) */}
        {viewMode === 'month' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
                使用左右箭頭切換月份
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                  className="btn-secondary"
                  style={{ padding: '6px 8px' }}
                  title="上一個月"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewDate(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1))}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  今天
                </button>
                <button
                  type="button"
                  onClick={() => setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                  className="btn-secondary"
                  style={{ padding: '6px 8px' }}
                  title="下一個月"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Weekday Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', paddingBottom: '8px', textAlign: 'center', fontWeight: '700', fontSize: '13px', color: 'var(--text-muted)' }}>
              <div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div>
            </div>

            {/* Days Grid */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(110px, 1fr)', gap: '8px', overflowY: 'auto' }}>
              {/* Empty cells for padding before month starts */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} style={{ background: 'rgba(15, 23, 42, 0.3)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.03)' }} />
              ))}

              {/* Days of current month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const cellDate = new Date(year, month, dayNum);
                const isToday = cellDate.toDateString() === todayDate.toDateString();

                const dayFormattedStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

                const dayMatchingEvents = validEvents.filter(e => {
                  if (!e.start) return false;
                  if (typeof e.start === 'string' && e.start.startsWith(dayFormattedStr)) return true;
                  const evtDate = new Date(e.start);
                  return evtDate.getFullYear() === year && evtDate.getMonth() === month && evtDate.getDate() === dayNum;
                });

                return (
                  <div
                    key={dayNum}
                    className="glass-card"
                    style={{
                      padding: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      background: isToday ? 'linear-gradient(135deg, rgba(94, 106, 210, 0.18), rgba(124, 131, 255, 0.12))' : 'rgba(15, 23, 42, 0.6)',
                      border: isToday ? '1px solid var(--primary-linear)' : '1px solid var(--border-glass)',
                      boxShadow: isToday ? '0 0 16px rgba(94, 106, 210, 0.25)' : 'none',
                      overflow: 'hidden',
                      minHeight: '110px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: isToday ? '700' : '600',
                        color: isToday ? '#ffffff' : 'var(--text-main)',
                        background: isToday ? 'linear-gradient(135deg, var(--primary-linear), var(--accent-cyan))' : 'transparent',
                        padding: isToday ? '2px 8px' : '2px 4px',
                        borderRadius: '4px'
                      }}>
                        {dayNum} {isToday && '(今天)'}
                      </span>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {dayMatchingEvents.map(evt => {
                        const badgeStyle = getSourceBadgeStyle(evt.source);
                        return (
                          <div
                            key={evt.id}
                            onClick={() => handleSelectEvent(evt)}
                            style={{
                              fontSize: '11px',
                              lineHeight: '1.4',
                              padding: '4px 8px',
                              ...badgeStyle,
                              borderRadius: '5px',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              fontWeight: '500',
                              transition: 'var(--transition-fast)'
                            }}
                            title={`${evt.summary} (${evt.source || 'Google Calendar'})`}
                          >
                            {evt.summary}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Floating Centered Glassmorphism Modal for Event Note Inspection */}
      {selectedEvent && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(9, 13, 22, 0.8)',
          backdropFilter: 'blur(12px)',
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
            animation: 'slideUp 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="var(--accent-cyan)" /> 📌 行程會議筆記與紀錄
              </h3>
              <button type="button" onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Event Info Card */}
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

            {/* Input Box */}
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

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button className="btn-secondary" onClick={() => setSelectedEvent(null)}>取消</button>
              <button className="btn-primary" onClick={handleSaveAsNoteFile} style={{ background: 'linear-gradient(135deg, var(--accent-cyan), #0284c7)' }}>
                <FilePlus size={16} /> 儲存並建立實體 .md 筆記
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
