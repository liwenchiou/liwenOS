import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, AlignLeft, Sparkles } from 'lucide-react';

export default function CreateEventModal({ isOpen, onClose, onCreateEvent, initialTitle = '', showToast }) {
  const [summary, setSummary] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    setSummary(initialTitle || '');
    setLocation('');
    setDescription('');
    // Set default start time to today + 1 hour
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    const startIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    setStartTime(startIso);

    const endObj = new Date(now.getTime() + 3600000);
    const endIso = new Date(endObj.getTime() - (endObj.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    setEndTime(endIso);
  }, [initialTitle, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!summary) {
      if (showToast) showToast('請輸入行程標題！', 'error');
      return;
    }
    onCreateEvent({ summary, startTime, endTime, location, description });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(9, 13, 22, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'grid',
      placeContent: 'center',
      zIndex: 1000
    }}>
      <div className="glass-panel" style={{
        width: '460px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
      }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="var(--primary-linear)" /> 一鍵新增 Google 行事曆行程
          </h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>行程名稱</label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="例: 與團隊討論規格"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-glass)',
                background: 'rgba(15, 23, 42, 0.8)',
                color: 'white',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>開始時間</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-glass)',
                  background: 'rgba(15, 23, 42, 0.8)',
                  color: 'white',
                  outline: 'none',
                  fontSize: '12px'
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>結束時間</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-glass)',
                  background: 'rgba(15, 23, 42, 0.8)',
                  color: 'white',
                  outline: 'none',
                  fontSize: '12px'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>地點 / 會議連結</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="例: Google Meet 或 3F 會議室"
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-glass)',
                background: 'rgba(15, 23, 42, 0.8)',
                color: 'white',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>詳細描述 / 備註</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="由 liwen OS 自動連動同步至 Google Calendar"
              style={{
                width: '100%',
                height: '70px',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-glass)',
                background: 'rgba(15, 23, 42, 0.8)',
                color: 'white',
                outline: 'none',
                resize: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn-primary">同步建立至 Google 行事曆</button>
          </div>
        </form>

      </div>
    </div>
  );
}
