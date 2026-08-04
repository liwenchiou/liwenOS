import React, { useState, useEffect, useRef } from 'react';
import { Folder, FileText, Plus, Save, Trash2, Calendar, Sparkles, FolderPlus, FilePlus, X, Eye, EyeOff, ExternalLink } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

// Markdown → HTML 解析工具函式
const parseMarkdownToHtml = (markdownText) => {
  if (!markdownText) return '';
  const lines = markdownText.split('\n');
  const htmlLines = [];
  let inCodeBlock = false;
  let codeBlockContent = [];
  let codeBlockLang = '';
  let inTable = false;
  let tableRows = [];

  const parseInline = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')       // 粗體
      .replace(/\*(.*?)\*/g, '<em>$1</em>')                   // 斜體
      .replace(/`([^`]+)`/g, '<code>$1</code>')               // 行內程式碼
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:6px;margin:8px 0;" />') // 圖片
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#5e6ad2;">$1</a>'); // 連結
  };

  const flushTable = () => {
    if (tableRows.length === 0) return;
    let tableHtml = '<table>';
    tableRows.forEach((row, idx) => {
      if (idx === 1 && /^\|[\s\-:|]+\|$/.test(row.trim())) return;
      const tag = idx === 0 ? 'th' : 'td';
      const cells = row.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1);
      tableHtml += '<tr>' + cells.map(c => `<${tag}>${parseInline(c.trim())}</${tag}>`).join('') + '</tr>';
    });
    tableHtml += '</table>';
    htmlLines.push(tableHtml);
    tableRows = [];
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = line.trim().replace('```', '').trim();
        codeBlockContent = [];
      } else {
        htmlLines.push(`<pre><code class="lang-${codeBlockLang}">${codeBlockContent.join('\n').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`);
        inCodeBlock = false;
        codeBlockLang = '';
      }
      continue;
    }
    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      inTable = true;
      tableRows.push(line.trim());
      continue;
    } else if (inTable) {
      flushTable();
    }
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      htmlLines.push('<hr/>');
      continue;
    }
    if (line.startsWith('### ')) { htmlLines.push(`<h3>${parseInline(line.slice(4))}</h3>`); continue; }
    if (line.startsWith('## ')) { htmlLines.push(`<h2>${parseInline(line.slice(3))}</h2>`); continue; }
    if (line.startsWith('# ')) { htmlLines.push(`<h1>${parseInline(line.slice(2))}</h1>`); continue; }
    if (line.startsWith('> ')) { htmlLines.push(`<blockquote>${parseInline(line.slice(2))}</blockquote>`); continue; }
    if (line.startsWith('- [ ] ')) { htmlLines.push(`<li class="task-item"><input type="checkbox" disabled /> ${parseInline(line.slice(6))}</li>`); continue; }
    if (line.startsWith('- [x] ')) { htmlLines.push(`<li class="task-item checked"><input type="checkbox" checked disabled /> ${parseInline(line.slice(6))}</li>`); continue; }
    if (line.startsWith('- ')) { htmlLines.push(`<li>${parseInline(line.slice(2))}</li>`); continue; }
    if (line.trim() === '') { htmlLines.push('<br/>'); continue; }
    htmlLines.push(`<p>${parseInline(line)}</p>`);
  }
  if (inTable) flushTable();
  return htmlLines.join('\n');
};

export default function NotesView({
  notesTree,
  selectedFilePath,
  onSelectFile,
  fileContent,
  onSaveFile,
  onCreateFile,
  onDeleteFile,
  onOpenCreateModalWithTitle,
  showToast
}) {
  const [editorText, setEditorText] = useState('');
  const [newInputName, setNewInputName] = useState('');
  const [createType, setCreateType] = useState(null); // 'file' or 'folder' or null
  const [deleteTargetNode, setDeleteTargetNode] = useState(null);
  const [splitView, setSplitView] = useState(false); // 是否開啟左右分割即時預覽
  const gutterRef = useRef(null);

  useEffect(() => {
    setEditorText(fileContent || '');
  }, [fileContent]);

  useEffect(() => {
    if (!deleteTargetNode) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setDeleteTargetNode(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteTargetNode]);

  const handleSave = () => {
    if (!selectedFilePath) return;
    onSaveFile(selectedFilePath, editorText);
  };

  // ⌘+S / Ctrl+S 快捷鍵儲存
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault(); // 阻止瀏覽器預設存檔對話框
        if (selectedFilePath) {
          onSaveFile(selectedFilePath, editorText);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFilePath, editorText, onSaveFile]);

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newInputName.trim()) return;

    if (createType === 'folder') {
      onCreateFile(newInputName.trim(), true);
    } else {
      const finalPath = newInputName.endsWith('.md') ? newInputName.trim() : `${newInputName.trim()}.md`;
      onCreateFile(finalPath, false);
    }

    setNewInputName('');
    setCreateType(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteTargetNode) return;
    onDeleteFile(deleteTargetNode.path);
    setDeleteTargetNode(null);
  };

  // Convert Markdown content to HTML and open in a new standalone browser tab/window
  const handleOpenHtmlPreview = () => {
    if (!editorText) {
      if (showToast) showToast('目前筆記內容為空，無法進行預覽！', 'error');
      return;
    }

    // Markdown → HTML 解析
    const parsedHtml = parseMarkdownToHtml(editorText);

    const fileNameDisplay = selectedFilePath || '草稿筆記';

    const fullHtmlDoc = `
      <!DOCTYPE html>
      <html lang="zh-TW">
      <head>
        <meta charset="UTF-8" />
        <title>預覽：${fileNameDisplay} - liwen OS</title>
        <style>
          body {
            background-color: #0b0d12;
            color: #f1f5f9;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.7;
            padding: 40px;
            max-width: 860px;
            margin: 0 auto;
          }
          h1, h2, h3 { color: #ffffff; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; margin-top: 24px; }
          p { margin: 4px 0; }
          blockquote { border-left: 4px solid #5e6ad2; padding-left: 16px; color: #94a3b8; margin: 16px 0; background: rgba(255,255,255,0.03); padding: 12px 16px; border-radius: 4px; }
          code { background: rgba(255,255,255,0.08); color: #38bdf8; padding: 2px 6px; border-radius: 4px; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.9em; }
          pre { background: #12151e; border: 1px solid #242938; border-radius: 8px; padding: 16px; overflow-x: auto; margin: 12px 0; }
          pre code { background: none; padding: 0; color: #e2e8f0; font-size: 13px; line-height: 1.6; }
          ul { padding-left: 20px; }
          li { margin: 6px 0; list-style-type: disc; }
          .task-item { list-style-type: none; }
          .task-item.checked { text-decoration: line-through; color: #64748b; }
          hr { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 24px 0; }
          a { color: #5e6ad2; text-decoration: underline; }
          a:hover { color: #707be0; }
          em { color: #a5b4fc; font-style: italic; }
          strong { color: #ffffff; }
          img { max-width: 100%; border-radius: 6px; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th { background: #12151e; color: #a5b4fc; font-weight: 600; padding: 10px 14px; border: 1px solid #242938; text-align: left; font-size: 13px; }
          td { padding: 10px 14px; border: 1px solid #242938; font-size: 13px; color: #e2e8f0; }
          tr:nth-child(even) td { background: rgba(255,255,255,0.02); }
          .header-banner { background: #12151e; border: 1px solid #242938; padding: 16px; border-radius: 8px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
          .badge { background: rgba(94, 106, 210, 0.2); color: #a5b4fc; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header-banner">
          <strong style="color: #ffffff;">📄 筆記名稱：${fileNameDisplay}</strong>
          <span class="badge">📄 Markdown HTML 獨立預覽</span>
        </div>
        <main>
          ${parsedHtml}
        </main>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(fullHtmlDoc);
      win.document.close();
    } else {
      if (showToast) showToast('請允許瀏覽器開啟快顯視窗 (Popup) 以預覽 HTML 頁面！', 'error');
    }
  };

  // Helper to render recursively the local ./notes file tree (excluding internal 'daily' & 'scratchpad.md')
  const renderTree = (nodes, depth = 0) => {
    if (!nodes || nodes.length === 0) return null;

    const visibleNodes = nodes.filter(node => node.name !== 'daily' && node.name !== 'scratchpad.md');

    return visibleNodes.map(node => {
      const indentPx = depth * 14 + 8;

      if (node.type === 'directory') {
        return (
          <div key={node.path} style={{ marginTop: '2px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              padding: '6px 8px',
              paddingLeft: `${indentPx}px`,
              color: 'var(--accent-amber)',
              fontSize: '13px',
              fontWeight: '600',
              borderRadius: 'var(--radius-sm)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <Folder size={15} color="var(--accent-amber)" style={{ flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.name}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTargetNode(node);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', opacity: 0.6, marginLeft: '8px', flexShrink: 0 }}
                title="刪除資料夾"
              >
                <Trash2 size={12} />
              </button>
            </div>
            <div>{renderTree(node.children, depth + 1)}</div>
          </div>
        );
      }

      const isSelected = selectedFilePath === node.path;

      return (
        <div
          key={node.path}
          onClick={() => onSelectFile(node.path)}
          style={{
            padding: '7px 10px',
            paddingLeft: `${indentPx}px`,
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            background: isSelected ? 'rgba(94, 106, 210, 0.22)' : 'transparent',
            border: isSelected ? '1px solid rgba(94, 106, 210, 0.4)' : '1px solid transparent',
            color: isSelected ? '#f8fafc' : 'var(--text-muted)',
            fontWeight: isSelected ? '600' : '400',
            marginTop: '2px',
            transition: 'var(--transition-fast)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            <FileText size={14} color={isSelected ? 'var(--primary-linear)' : 'var(--text-dim)'} style={{ flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.name}</span>
          </div>
          {isSelected && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTargetNode(node);
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-rose)', marginLeft: '8px', flexShrink: 0 }}
              title="刪除檔案"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      );
    });
  };

  return (
    <div style={{ flex: 1, padding: '24px', display: 'flex', gap: '20px', overflow: 'hidden' }}>
      
      {/* Left Sidebar: Pure Custom Project Markdown File Tree */}
      <div className="glass-panel" style={{ width: '310px', display: 'flex', flexDirection: 'column', padding: '16px', gap: '16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
            <Folder size={17} color="var(--accent-amber)" style={{ flexShrink: 0 }} /> Markdown 檔案庫
          </h3>
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            <button
              className="btn-secondary"
              style={{ padding: '4px 8px', fontSize: '11px', whiteSpace: 'nowrap' }}
              onClick={() => setCreateType('file')}
              title="新增筆記檔案"
            >
              <FilePlus size={13} /> +檔案
            </button>
            <button
              className="btn-secondary"
              style={{ padding: '4px 8px', fontSize: '11px', whiteSpace: 'nowrap' }}
              onClick={() => setCreateType('folder')}
              title="新增資料夾"
            >
              <FolderPlus size={13} /> +資料夾
            </button>
          </div>
        </div>

        {/* Input box when user clicks +檔案 or +資料夾 */}
        {createType && (
          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', gap: '6px', background: 'rgba(15, 23, 42, 0.8)', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass-bright)' }}>
            <input
              type="text"
              autoFocus
              value={newInputName}
              onChange={(e) => setNewInputName(e.target.value)}
              placeholder={createType === 'folder' ? '輸入資料夾名稱...' : '例: idea.md...'}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'white', fontSize: '12px' }}
            />
            <button type="submit" className="btn-primary" style={{ padding: '2px 8px', fontSize: '11px' }}>確認</button>
            <button type="button" onClick={() => setCreateType(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </form>
        )}

        {/* Tree Container */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {renderTree(notesTree, 0)}
        </div>
      </div>

      {/* Right Container: Full Markdown Live Editor & Preview Toolbar */}
      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', gap: '16px', minWidth: 0 }}>
        
        {/* Header Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <FileText size={20} color="var(--primary-linear)" style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedFilePath ? `編輯中: ${selectedFilePath}` : '請選擇左側 Markdown 檔案'}
              </h2>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                實體存取 ./notes/ 目錄 (對應硬盤檔案)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
            <button className="btn-secondary" onClick={() => setSplitView(!splitView)} title="切換左右分割即時預覽 (Split View)">
              {splitView ? <EyeOff size={14} /> : <Eye size={14} />} {splitView ? '關閉即時預覽' : '分割即時預覽'}
            </button>
            <button className="btn-secondary" onClick={handleOpenHtmlPreview}>
              <ExternalLink size={14} /> 開啟 HTML 分頁預覽
            </button>
            <button className="btn-primary" onClick={handleSave} title="快速存檔快捷鍵: ⌘+S 或 Ctrl+S">
              <Save size={15} /> 儲存筆記 (⌘+S)
            </button>
          </div>
        </div>

        {/* Markdown Monospace Code Textarea with Line Numbers Gutter (+ Split View Realtime HTML Preview) */}
        <div style={{ flex: 1, display: 'flex', gap: '16px', overflow: 'hidden' }}>
          <div style={{
            flex: 1,
            display: 'flex',
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden'
          }}>
            {/* 行號欄 */}
            <div
              ref={gutterRef}
              style={{
                padding: '20px 10px',
                background: 'rgba(11, 13, 18, 0.5)',
                borderRight: '1px solid var(--border-glass)',
                color: 'var(--text-dim)',
                fontFamily: 'monospace',
                fontSize: '14px',
                lineHeight: '1.7',
                textAlign: 'right',
                userSelect: 'none',
                overflowY: 'hidden',
                minWidth: '42px',
                flexShrink: 0
              }}
            >
              {Array.from({ length: Math.max(1, (editorText || '').split('\n').length) }, (_, i) => (
                <div key={i + 1}>{i + 1}</div>
              ))}
            </div>
            <textarea
              value={editorText}
              onChange={(e) => setEditorText(e.target.value)}
              onScroll={(e) => {
                if (gutterRef.current) gutterRef.current.scrollTop = e.target.scrollTop;
              }}
              placeholder="選擇檔案後即可開始撰寫 Markdown 筆記..."
              style={{
                flex: 1,
                width: '100%',
                height: '100%',
                background: 'transparent',
                border: 'none',
                padding: '20px',
                color: 'var(--text-main)',
                fontFamily: 'monospace',
                fontSize: '14px',
                lineHeight: '1.7',
                resize: 'none',
                outline: 'none',
                overflowY: 'auto'
              }}
            />
          </div>
          {splitView && (
            <div
              className="markdown-preview"
              style={{
                flex: 1,
                height: '100%',
                overflowY: 'auto',
                background: 'rgba(11, 13, 18, 0.75)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                color: 'var(--text-main)',
                fontSize: '14px',
                lineHeight: '1.7',
                wordBreak: 'break-word'
              }}
              dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(editorText || '') }}
            />
          )}
        </div>

      </div>

      {/* Glassmorphic Confirm Modal for File/Folder Deletion */}
      <ConfirmModal
        isOpen={!!deleteTargetNode}
        title={deleteTargetNode?.type === 'directory' ? '刪除資料夾' : '刪除檔案'}
        message={deleteTargetNode ? `確定要刪除${deleteTargetNode.type === 'directory' ? '資料夾' : '檔案'}「${deleteTargetNode.name}」${deleteTargetNode.type === 'directory' ? '及其內部所有內容' : ''}嗎？` : ''}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetNode(null)}
      />

    </div>
  );
}
