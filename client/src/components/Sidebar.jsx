import React, { useState } from 'react';
import { LayoutDashboard, Calendar, FileText, FileSpreadsheet, Sparkles, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { id: 'dashboard', label: '首頁儀表板', icon: LayoutDashboard },
    { id: 'calendar', label: '行事曆時間軸', icon: Calendar },
    { id: 'notes', label: '專案 MD 筆記', icon: FileText },
    { id: 'report', label: '今日報表', icon: FileSpreadsheet }
  ];

  return (
    <aside style={{
      width: isCollapsed ? '64px' : '230px',
      height: '100%',
      padding: isCollapsed ? '16px 8px' : '16px 12px',
      display: 'flex',
      flexDirection: 'column',
      justify: 'space-between',
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-linear)',
      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      overflow: 'hidden',
      flexShrink: 0
    }}>
      <div>
        {/* 品牌 Logo 與收合切換按鈕 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justify: isCollapsed ? 'center' : 'space-between',
          padding: '4px 4px 20px 4px'
        }}>
          <div
            onClick={() => isCollapsed && setIsCollapsed(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: isCollapsed ? 'pointer' : 'default'
            }}
            title={isCollapsed ? '點擊展開側邊欄' : ''}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #5e6ad2, #38bdf8)',
              display: 'grid',
              placeContent: 'center',
              boxShadow: '0 2px 10px rgba(94, 106, 210, 0.4)',
              flexShrink: 0
            }}>
              <Sparkles size={18} color="white" />
            </div>
            {!isCollapsed && (
              <div style={{ whiteSpace: 'nowrap', animation: 'fadeIn 0.2s' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '700', letterSpacing: '-0.4px', color: '#f1f5f9' }}>
                  liwen OS
                </h2>
                <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Linear Dark Edition</span>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
                borderRadius: '6px',
                transition: 'var(--transition-fast)'
              }}
              title="收合側邊欄"
            >
              <PanelLeftClose size={16} color="var(--text-muted)" />
            </button>
          )}
        </div>

        {/* 導航選單列表 */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justify: isCollapsed ? 'center' : 'flex-start',
                  padding: isCollapsed ? '10px 0' : '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: isActive ? 'rgba(94, 106, 210, 0.15)' : 'transparent',
                  color: isActive ? '#f8fafc' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: isActive ? '600' : '500',
                  fontSize: '13px',
                  transition: 'var(--transition-fast)',
                  borderLeft: (!isCollapsed && isActive) ? '3px solid var(--primary-linear)' : '3px solid transparent',
                  position: 'relative'
                }}
                className="sidebar-nav-btn"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                  <Icon size={18} color={isActive ? '#a5b4fc' : 'var(--text-dim)'} style={{ flexShrink: 0 }} />
                  {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
                </div>
                {/* 收合模式下的自訂 Tooltip 浮窗 */}
                {isCollapsed && (
                  <span className="sidebar-tooltip">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 底部版本資訊 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 4px'
      }}>
        {isCollapsed ? (
          <button
            onClick={() => setIsCollapsed(false)}
            style={{
              background: 'rgba(24, 28, 40, 0.8)',
              border: '1px solid var(--border-linear)',
              borderRadius: '6px',
              padding: '8px',
              color: 'var(--accent-cyan)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justify: 'center',
              width: '36px',
              height: '36px',
              transition: 'var(--transition-fast)'
            }}
            title="展開側邊欄"
          >
            <PanelLeftOpen size={16} color="var(--accent-cyan)" />
          </button>
        ) : (
          <span style={{ fontSize: '10px', color: 'var(--text-dim)', textAlign: 'center', whiteSpace: 'nowrap' }}>
            liwen OS v1.0 • Linear Dark
          </span>
        )}
      </div>
    </aside>
  );
}
