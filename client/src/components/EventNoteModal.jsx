import React, { useState, useEffect } from 'react';
import { Sparkles, X, FilePlus } from 'lucide-react';

const getEventNoteFileName = (evt) => {
  if (!evt || !evt.summary) return '';
  const sourceStr = (evt.source || 'Google').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');
  const d = new Date(evt.start);
  const dateStr = !isNaN(d.getTime())
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    : (typeof evt.start === 'string' ? evt.start.substring(0, 10) : 'unknown');
  const summaryStr = evt.summary.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
  return `daily/${sourceStr}_${dateStr}_${summaryStr}.md`;
};

const formatEventTimeRange = (evt) => {
  if (!evt || !evt.start) return '未知時間';
  const isAllDay = (typeof evt.start === 'string' && evt.start.length === 10 && !evt.start.includes('T')) ||
                   (typeof evt.end === 'string' && evt.end.length === 10 && !evt.end.includes('T'));
  if (isAllDay) {
    const startStr = typeof evt.start === 'string' ? evt.start.substring(0, 10) : '';
    const endStr = typeof evt.end === 'string' ? evt.end.substring(0, 10) : startStr;
    if (endStr > startStr) {
      const endD = new Date(`${endStr}T00:00:00`);
      endD.setDate(endD.getDate() - 1);
      const realEndStr = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-${String(endD.getDate()).padStart(2, '0')}`;
      if (realEndStr > startStr) {
        return `${startStr} ~ ${realEndStr} (多日全天行程)`;
      }
    }
    return `${startStr} (全天行程)`;
  }

  const s = new Date(evt.start);
  const e = evt.end ? new Date(evt.end) : s;
  if (s.toDateString() === e.toDateString()) {
    return `${s.toLocaleDateString()} ${s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return `${s.toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} ~ ${e.toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
};

export default function EventNoteModal({ isOpen, event, onClose, onSaveNote }) {
  const [extraNotesText, setExtraNotesText] = useState('');
  const [existingFilePath, setExistingFilePath] = useState(null);
  const [isLoadingNote, setIsLoadingNote] = useState(false);

  useEffect(() => {
    if (isOpen && event) {
      const fileName = getEventNoteFileName(event);
      const safeId = event.id ? String(event.id).replace(/[^a-zA-Z0-9_-]/g, '_') : '';
      const d = new Date(event.start);
      const dateStr = !isNaN(d.getTime())
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        : (typeof event.start === 'string' ? event.start.substring(0, 10) : 'unknown');
      const summaryStr = event.summary ? event.summary.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_') : '未命名';

      const candidates = Array.from(new Set([
        fileName,
        `daily/AI助理行事曆_${dateStr}_${summaryStr}.md`,
        `daily/Google_${dateStr}_${summaryStr}.md`,
        `daily/AI_助理行事曆_${dateStr}_${summaryStr}.md`,
        safeId ? `daily/${safeId}.md` : null,
        `daily/meeting-${summaryStr}.md`
      ].filter(Boolean)));

      setIsLoadingNote(true);

      const loadContent = (data, matchedPath) => {
        setExistingFilePath(matchedPath);
        const match = data.content.match(/## 💡 補充紀錄與觀察\s+([\s\S]*?)(?=\n## 🚀|\n---|$)/);
        if (match && match[1]) {
          const parsed = match[1].trim();
          setExtraNotesText(parsed === '- (尚無補充紀錄)' ? '' : parsed);
        } else {
          setExtraNotesText(data.content);
        }
      };

      const tryFetchCandidates = async () => {
        for (const relPath of candidates) {
          try {
            const res = await fetch(`/api/notes/file?relPath=${encodeURIComponent(relPath)}`);
            if (res.ok) {
              const data = await res.json();
              if (data && data.content) {
                loadContent(data, relPath);
                return;
              }
            }
          } catch (err) {
            // continue next candidate
          }
        }
        setExistingFilePath(null);
        setExtraNotesText('');
      };

      tryFetchCandidates().finally(() => {
        setIsLoadingNote(false);
      });
    } else {
      setExtraNotesText('');
      setExistingFilePath(null);
    }
  }, [isOpen, event]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !event) return null;

  const handleSaveAsNoteFile = () => {
    const timeString = formatEventTimeRange(event);

    let mdContent = `# 📌 會議記錄：${event.summary}\n\n`;
    mdContent += `- **行程名稱**：${event.summary}\n`;
    mdContent += `- **日期時間**：${timeString}\n`;
    mdContent += `- **來源**：${event.source || 'Google Calendar'}\n`;
    if (event.location) {
      mdContent += `- **地點/連結**：${event.location}\n`;
    }
    mdContent += `\n---\n\n## 💡 補充紀錄與觀察\n`;
    mdContent += extraNotesText.trim() ? extraNotesText : `- (尚無補充紀錄)\n`;
    mdContent += `\n\n## 🚀 待辦事項 (Action Items)\n- [ ] \n`;

    const fileName = getEventNoteFileName(event);
    if (onSaveNote) {
      onSaveNote(fileName, mdContent);
    }

    onClose();
  };

  return (
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
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {existingFilePath && (
          <div style={{
            fontSize: '12px',
            color: 'var(--accent-cyan)',
            background: 'rgba(6, 182, 212, 0.12)',
            border: '1px solid rgba(6, 182, 212, 0.35)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            ✅ 此行程已關聯筆記：<strong>{existingFilePath}</strong>（已自動載入內容）
          </div>
        )}

        {/* 行程資訊卡片 */}
        <div className="glass-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(30, 41, 59, 0.7)' }}>
          <div style={{ fontSize: '14px', fontWeight: '600' }}>
            📌 名稱：<span style={{ color: 'var(--text-main)' }}>{event.summary}</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            🕒 時間：{formatEventTimeRange(event)}
          </div>
          {event.location && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              📍 地點/連結：{event.location}
            </div>
          )}
        </div>

        {/* 補充紀錄輸入框 */}
        <div>
          <label htmlFor="modal-extra-notes" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px', display: 'block' }}>
            ✍️ 補充內容 (您可以輸入會議紀錄、討論要點或隨筆)：
          </label>
          <textarea
            id="modal-extra-notes"
            value={extraNotesText}
            onChange={(e) => setExtraNotesText(e.target.value)}
            placeholder={isLoadingNote ? '⏳ 正在讀取此行程已保存的筆記紀錄...' : '在此輸入您針對此行程的補充紀錄...'}
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
          <button type="button" className="btn-secondary" onClick={onClose}>取消</button>
          <button type="button" className="btn-primary" onClick={handleSaveAsNoteFile} style={{ background: 'linear-gradient(135deg, var(--accent-cyan), #0284c7)' }}>
            <FilePlus size={16} /> {existingFilePath ? '儲存並更新 .md 筆記' : '儲存並建立實體 .md 筆記'}
          </button>
        </div>

      </div>
    </div>
  );
}
