import React, { useEffect, useState, useRef } from 'react';
import { Calendar as CalendarIcon, Clock, Plus, FilePlus, Link, Check, Sparkles, Grid, List, X, ShieldAlert, Key, ChevronLeft, ChevronRight } from 'lucide-react';
import EventNoteModal from './EventNoteModal';

export default function CalendarView({ events, onOpenCreateModal, onSaveNewNote, onFetchEvents }) {
  const [viewMode, setViewMode] = useState('month'); // Default to full-width 'month' view
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const lastFetchedMonthRef = useRef(null);

  // 當 viewDate 切月且年月真正變更時，才回呼父元件重新撈取對應月份的行事曆事件
  useEffect(() => {
    if (onFetchEvents) {
      const y = viewDate.getFullYear();
      const m = viewDate.getMonth() + 1; // API 使用 1-12
      const key = `${y}-${m}`;
      if (lastFetchedMonthRef.current !== key) {
        lastFetchedMonthRef.current = key;
        onFetchEvents(y, m);
      }
    }
  }, [viewDate, onFetchEvents]);

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

  // Filter 1: Valid start dates >= Year 2000 & 去除重複行程
  const validEvents = (() => {
    const seen = new Set();
    return (events || []).filter(e => {
      if (!e.start) return false;
      const d = new Date(e.start);
      if (isNaN(d.getTime()) && (typeof e.start !== 'string' || e.start.length !== 10)) return false;
      if (d.getFullYear() < 2000 && e.start.length !== 10) return false;
      const key = `${e.summary}|${e.start}|${e.end}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  // 檢查某行程是否落在目標日期 (支援多日跨天持續顯示，並遵循 RFC 5545 與 Google Calendar 獨佔結束日規範)
  const isEventOnDay = (e, targetYear, targetMonth, targetDay) => {
    if (!e.start) return false;
    const targetDateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
    
    // 1. 純日期 YYYY-MM-DD (10 字元全天行程) 的比對
    if (typeof e.start === 'string' && e.start.length === 10 && !e.start.includes('T')) {
      const startStr = e.start;
      const endStr = (e.end && e.end.length === 10 && !e.end.includes('T')) ? e.end : startStr;
      if (endStr > startStr) {
        // 遵循 iCalendar (RFC 5545) 與 Google Calendar API：全天行程 end 為獨佔 (exclusive) 隔日
        // 範例：8/3 單日全天行程 start="2026-08-03", end="2026-08-04" ➔ 僅在 8/3 (targetDateStr < endStr) 顯示
        return targetDateStr >= startStr && targetDateStr < endStr;
      }
      return targetDateStr === startStr;
    }

    // 2. 一般或 ISO 時間格式：建立本地當日 00:00:00 與 23:59:59 邊界進行區間交集驗證
    const cellStart = new Date(targetYear, targetMonth, targetDay, 0, 0, 0, 0);
    const cellEnd = new Date(targetYear, targetMonth, targetDay, 23, 59, 59, 999);

    const evtStart = new Date(e.start);
    const evtEnd = e.end ? new Date(e.end) : evtStart;
    if (isNaN(evtStart.getTime())) return false;
    const finalEnd = isNaN(evtEnd.getTime()) ? evtStart : evtEnd;

    return evtStart <= cellEnd && finalEnd >= cellStart;
  };

  // Filter 2: Strictly Today's Events for Timeline View (支援多日持續的行程)
  const nowObj = new Date();
  const todayEvents = validEvents.filter(e => 
    isEventOnDay(e, nowObj.getFullYear(), nowObj.getMonth(), nowObj.getDate())
  );

  const handleSelectEvent = (evt) => {
    setSelectedEvent(evt);
  };


  // Helper for source badge aesthetics: 1. AI助理行事曆(綠色) 2. 貝貝行事曆(黃色) 3. 安大行事曆(紫色)
  const getSourceBadgeStyle = (source) => {
    const src = (source || '').toLowerCase();
    if (src.includes('貝貝') || src.includes('beibei')) {
      return {
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.28), rgba(217, 119, 6, 0.22))',
        border: '1px solid rgba(251, 191, 36, 0.45)',
        color: '#fde047'
      };
    }
    if (src.includes('安大') || src.includes('andal')) {
      return {
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.28), rgba(109, 40, 217, 0.22))',
        border: '1px solid rgba(167, 139, 250, 0.45)',
        color: '#d8b4fe'
      };
    }
    // Default: AI 助理行事曆 (綠色)
    return {
      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.28), rgba(5, 150, 105, 0.22))',
      border: '1px solid rgba(52, 211, 153, 0.45)',
      color: '#6ee7b7'
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
                const isAllDay = typeof e.start === 'string' && e.start.length === 10 && !e.start.includes('T');
                const startObj = new Date(e.start);
                const isContinuedFromPast = !isAllDay && startObj.getDate() !== nowObj.getDate();
                
                // 全天行程或昨天以前開始持續至今的跨日行程，統一顯示在早上 09:00 時段
                if (isAllDay || isContinuedFromPast) {
                  return hour === 9;
                }
                return startObj.getHours() === hour;
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

                const dayMatchingEvents = validEvents.filter(e => isEventOnDay(e, year, month, dayNum));

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

                    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {dayMatchingEvents.map(evt => {
                        const badgeStyle = getSourceBadgeStyle(evt.source);
                        return (
                          <div
                            key={evt.id}
                            onClick={() => handleSelectEvent(evt)}
                            style={{
                              fontSize: '11px',
                              lineHeight: '1.5',
                              padding: '3px 8px',
                              minHeight: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              ...badgeStyle,
                              borderRadius: '5px',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              fontWeight: '500',
                              flexShrink: 0,
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

      {/* Floating Centered Glassmorphism Modal for Event Note Inspection (Extracted Reusable Component) */}
      <EventNoteModal
        isOpen={!!selectedEvent}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onSaveNote={onSaveNewNote}
      />

    </div>
  );
}
