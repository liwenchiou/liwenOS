import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Calendar, CheckSquare, FilePlus, Sparkles, Clock, Copy, ExternalLink, X, Save, Check } from 'lucide-react';
import EventNoteModal from './EventNoteModal';

export default function ReportView({ events, notesTree, onSaveNewNote, showToast }) {
  const [googleSheetTasks, setGoogleSheetTasks] = useState([]);
  const [reflectionText, setReflectionText] = useState('');

  // Modal for inspecting/creating event meeting note from Daily Report
  const [selectedEvent, setSelectedEvent] = useState(null);

  // 遍歷筆記樹找尋是否存在與此行程連動的 MD 檔案路徑
  const findNotePathForEvent = (evt, tree) => {
    if (!evt || !tree || !Array.isArray(tree)) return null;
    const d = new Date(evt.start);
    const dateStr = !isNaN(d.getTime())
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      : (typeof evt.start === 'string' ? evt.start.substring(0, 10) : 'unknown');
    const summaryStr = evt.summary ? evt.summary.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_') : '未命名';
    const sourceStr = (evt.source || 'Google').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');
    const safeId = evt.id ? String(evt.id).replace(/[^a-zA-Z0-9_-]/g, '_') : '';

    const possibleNames = [
      `${sourceStr}_${dateStr}_${summaryStr}.md`,
      `AI助理行事曆_${dateStr}_${summaryStr}.md`,
      `Google_${dateStr}_${summaryStr}.md`,
      `AI_助理行事曆_${dateStr}_${summaryStr}.md`,
      `meeting-${summaryStr}.md`,
      safeId ? `${safeId}.md` : null
    ].filter(Boolean);

    const cleanTitle = (str) => {
      return str
        .replace(/\.md$/i, '')
        .replace(/AI_?助理行事曆/gi, '')
        .replace(/Google/gi, '')
        .replace(/meeting/gi, '')
        .replace(/\d{4}-\d{2}-\d{2}/g, '')
        .replace(/[_\-\s+]/g, '')
        .normalize('NFC')
        .trim();
    };
    const targetPure = cleanTitle(summaryStr);

    let foundPath = null;
    const traverse = (nodes) => {
      for (const node of nodes) {
        if (foundPath) return;
        if (node.type === 'file') {
          const nameNFC = node.name.normalize('NFC');
          if (possibleNames.includes(nameNFC)) {
            foundPath = node.path;
            return;
          }
          if (targetPure && targetPure.length > 0) {
            const fPure = cleanTitle(nameNFC);
            if (fPure && (fPure === targetPure || fPure.includes(targetPure) || targetPure.includes(fPure))) {
              foundPath = node.path;
              return;
            }
          }
        } else if (node.type === 'directory' && node.children) {
          traverse(node.children);
        }
      }
    };
    traverse(tree);
    return foundPath;
  };

  const nowObj = new Date();
  const todayStrDate = nowObj.toDateString();
  const yearStr = nowObj.getFullYear();
  const monthStr = String(nowObj.getMonth() + 1).padStart(2, '0');
  const dayStr = String(nowObj.getDate()).padStart(2, '0');
  const todayYYYYMMDD = `${yearStr}-${monthStr}-${dayStr}`;

  const todayEvents = (events || []).filter(evt => {
    if (!evt.start) return false;
    
    // 當天 00:00:00 ~ 23:59:59 的時間範圍
    const todayStart = new Date(nowObj.getFullYear(), nowObj.getMonth(), nowObj.getDate()).getTime();
    const todayEnd = new Date(nowObj.getFullYear(), nowObj.getMonth(), nowObj.getDate(), 23, 59, 59, 999).getTime();

    const evtStart = new Date(evt.start).getTime();
    const evtEnd = evt.end ? new Date(evt.end).getTime() : evtStart;

    // 如果行程的開始時間早於今日結束，且結束時間晚於今日開始，即代表行程涵蓋今日
    return evtStart <= todayEnd && evtEnd >= todayStart;
  });

  // 從後端 API 撈取 Google Sheet 待辦事項
  useEffect(() => {
    const fetchSheetTodos = async () => {
      try {
        const res = await fetch('/api/todos');
        const data = await res.json();
        if (data.status === 'success' || data.success) {
          setGoogleSheetTasks(data.data || []);
        }
      } catch (err) {}
    };
    fetchSheetTodos();
  }, []);

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

  // Click event in Daily Report to open linked meeting note via EventNoteModal
  const handleEventClick = (evt) => {
    setSelectedEvent(evt);
  };

  // Generate complete Markdown text for the daily report
  const generateReportMarkdown = () => {
    let md = `# 📊 今日執行與產出日報 (${todayYYYYMMDD})\n\n`;
    md += `> 由 liwen OS 自動掃描生成\n\n`;

    md += `## 📅 今日行程 (${todayEvents.length} 個)\n`;
    if (todayEvents.length === 0) {
      md += `- 今日無預定行程\n`;
    } else {
      todayEvents.forEach(evt => {
        const timeStr = `${new Date(evt.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(evt.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        const linkedNotePath = findNotePathForEvent(evt, notesTree);
        const noteLinkText = linkedNotePath ? ` | 🔗 **[會議紀錄筆記](./${linkedNotePath.replace(/^daily\//, '')})**` : '';
        md += `- **[${timeStr}]** ${evt.summary} (${evt.source || 'Google Calendar'})${evt.location ? ` | 📍 ${evt.location}` : ''}${noteLinkText}\n`;
      });
    }
    md += `\n`;

    const reportSheetTasks = googleSheetTasks.filter(task => {
      if (task.completed) return false;
      if (task.targetDate && task.targetDate.trim() !== '') {
        const normDate = task.targetDate.trim().replace(/\//g, '-');
        if (normDate.startsWith(todayYYYYMMDD)) return true;
        const d = new Date(task.targetDate);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}` === todayYYYYMMDD;
        }
        return false;
      }
      return true;
    });

    md += `## 🚀 Google Sheet 今日待辦事項 (${reportSheetTasks.length} 項)\n`;
    if (reportSheetTasks.length === 0) {
      md += `- 所有 Google Sheet 今日待辦皆已完成！\n`;
    } else {
      reportSheetTasks.forEach(task => {
        md += `- [ ] ${task.text} ${task.targetDate ? `(${task.targetDate})` : ''}\n`;
      });
    }
    md += `\n`;

    if (reflectionText.trim()) {
      md += `## 💡 當日重點心得與紀錄\n${reflectionText}\n\n`;
    }

    md += `---\n*生成時間：${new Date().toLocaleString('zh-TW')}*\n`;
    return md;
  };

  const handleExportDailyReport = async () => {
    const mdContent = generateReportMarkdown();
    const fileName = `daily/daily-report-${todayYYYYMMDD}.md`;

    try {
      const saved = await Promise.resolve(onSaveNewNote(fileName, mdContent, { silent: true }));
      if (showToast) {
        showToast('日報已成功儲存至 ./notes/daily/', 'success');
      }
    } catch (err) {
      if (showToast) {
        showToast('匯出日報失敗', 'error');
      }
    }
  };

  const isTodaySheetTask = (t) => {
    if (t.completed) return false;
    if (t.targetDate && t.targetDate.trim() !== '') {
      const normDate = t.targetDate.trim().replace(/\//g, '-');
      if (normDate.startsWith(todayYYYYMMDD)) return true;
      const d = new Date(t.targetDate);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}` === todayYYYYMMDD;
      }
      return false;
    }
    return true;
  };

  const pendingSheetTasks = googleSheetTasks.filter(isTodaySheetTask);

  return (
    <div style={{ flex: 1, padding: '28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSpreadsheet size={26} color="var(--accent-emerald)" /> 今日自動生成日報 ({todayYYYYMMDD})
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            自動整合今日行事曆行程與 Google Sheet 待辦事項
          </p>
        </div>

        <button className="btn-primary" onClick={handleExportDailyReport} style={{ background: 'linear-gradient(135deg, var(--accent-emerald), #059669)', padding: '8px 14px', fontSize: '13px' }}>
          <FilePlus size={16} /> 匯出為實體 .md 日報
        </button>
      </div>

      {/* Responsive Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Column 1: Today Calendar Schedule */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(6, 182, 212, 0.15)', padding: '8px', borderRadius: '8px', flexShrink: 0 }}>
              <Calendar size={20} color="var(--accent-cyan)" />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700' }}>📅 今日預定行程</h3>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>共 {todayEvents.length} 個排定事項</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto' }}>
            {todayEvents.length === 0 ? (
              <p style={{ color: 'var(--text-dim)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                今日無排定行程
              </p>
            ) : (
              todayEvents.map((evt, idx) => {
                const linkedNotePath = findNotePathForEvent(evt, notesTree);
                return (
                  <div
                    key={evt.id || idx}
                    className="glass-card"
                    onClick={() => handleEventClick(evt)}
                    style={{
                      padding: '12px',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)',
                      minWidth: 0,
                      border: linkedNotePath ? '1px solid rgba(16, 185, 129, 0.45)' : undefined
                    }}
                  >
                    <div style={{
                      width: '4px',
                      height: '36px',
                      borderRadius: '2px',
                      background: linkedNotePath ? '#10b981' : 'var(--accent-cyan)',
                      flexShrink: 0
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{evt.summary}</h4>
                        {linkedNotePath && (
                          <span style={{
                            fontSize: '11px',
                            color: '#10b981',
                            background: 'rgba(16, 185, 129, 0.15)',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            flexShrink: 0
                          }}>
                            📝 已關聯筆記
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span><Clock size={12} /> {new Date(evt.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(evt.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {evt.location && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>| 📍 {evt.location}</span>}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2: Google Sheet 待辦事項 */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '8px', borderRadius: '8px', flexShrink: 0 }}>
              <CheckSquare size={20} color="var(--accent-amber)" />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700' }}>🚀 Google Sheet 未完成待辦</h3>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                共 {pendingSheetTasks.length} 項未完成
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto' }}>
            {pendingSheetTasks.length === 0 ? (
              <p style={{ color: 'var(--accent-emerald)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                🎉 太棒了！Google Sheet 待辦事項皆已完成！
              </p>
            ) : (
              pendingSheetTasks.map((task) => (
                <div key={`sheet-${task.id}`} className="glass-card" style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', minWidth: 0, gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' }}>
                      ☐ {task.text}
                      {task.targetDate && (
                        <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.12)', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', display: 'inline-block' }}>
                          📅 {task.targetDate}
                        </span>
                      )}
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>
                    Google Sheet
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Column 3: Daily Reflection & Key Notes Input */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="var(--primary-linear)" /> 💡 今日重點心得與觀察 (寫入匯出日報中)
        </h3>
        <textarea
          value={reflectionText}
          onChange={(e) => setReflectionText(e.target.value)}
          placeholder="在此記錄您今日的反思、工作亮點或重要觀察..."
          style={{
            width: '100%',
            height: '110px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--border-glass)',
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
