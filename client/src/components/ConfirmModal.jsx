import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(9, 13, 22, 0.8)',
      backdropFilter: 'blur(10px)',
      display: 'grid',
      placeContent: 'center',
      zIndex: 2000
    }}>
      <div className="glass-panel" style={{
        width: '420px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
        animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        border: '1px solid var(--border-glass-bright)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(244, 63, 94, 0.15)', padding: '10px', borderRadius: '10px' }}>
              <AlertTriangle size={22} color="var(--accent-rose)" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>{title || '確認執行操作'}</h3>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>此操作執行後將無法復原</span>
            </div>
          </div>
          <button type="button" onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          {message}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
          <button className="btn-secondary" onClick={onCancel}>
            取消
          </button>
          <button
            className="btn-primary"
            style={{ background: 'linear-gradient(135deg, var(--accent-rose), #dc2626)', border: 'none' }}
            onClick={onConfirm}
          >
            確定刪除
          </button>
        </div>
      </div>
    </div>
  );
}
