import React, { useState, useEffect, useRef } from 'react';
import { Folder, FileText, Plus, Save, Trash2, Calendar, Sparkles, FolderPlus, FilePlus, X, Eye, EyeOff, ExternalLink, Edit2, ChevronRight, ChevronDown, GripVertical } from 'lucide-react';
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

// 遞迴蒐集樹狀結構中所有的目錄路徑
const getAllFolderPaths = (nodes) => {
  let folders = [];
  if (!nodes) return folders;
  nodes.forEach(node => {
    if (node.type === 'directory' && node.name !== 'daily' && node.name !== 'scratchpad.md') {
      folders.push(node.path);
      folders = folders.concat(getAllFolderPaths(node.children));
    }
  });
  return folders;
};

export default function NotesView({
  notesTree,
  selectedFilePath,
  onSelectFile,
  fileContent,
  onSaveFile,
  onCreateFile,
  onRenameFile,
  onDeleteFile,
  onOpenCreateModalWithTitle,
  showToast
}) {
  const [editorText, setEditorText] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState(''); // '' | 'saving' | 'saved'
  const initialContentRef = useRef('');
  const [newInputName, setNewInputName] = useState('');
  const [createType, setCreateType] = useState(null); // 'file' or 'folder' or null
  const [targetFolder, setTargetFolder] = useState(''); // 新增時選擇的目標目錄
  const [collapsedDirs, setCollapsedDirs] = useState(new Set()); // 資料夾收折狀態
  const [renameTarget, setRenameTarget] = useState(null); // 正在重命名的節點
  const [renameInput, setRenameInput] = useState('');
  const [deleteTargetNode, setDeleteTargetNode] = useState(null);
  const [splitView, setSplitView] = useState(false); // 是否開啟左右分割即時預覽
  const [draggedNode, setDraggedNode] = useState(null); // 目前被拖拉的節點
  const [dragOverPath, setDragOverPath] = useState(null); // 目前被推移懸停的目的地路徑
  const gutterRef = useRef(null);

  const toggleCollapse = (dirPath) => {
    setCollapsedDirs(prev => {
      const next = new Set(prev);
      if (next.has(dirPath)) {
        next.delete(dirPath);
      } else {
        next.add(dirPath);
      }
      return next;
    });
  };

  const handleDropOnFolder = async (targetDirPath) => {
    setDragOverPath(null);
    if (!draggedNode || !onRenameFile) return;

    const oldPath = draggedNode.path;
    // 如果目的地就是目前節點自身，或是將父目錄拖入其子目錄中，則略過
    if (oldPath === targetDirPath || targetDirPath.startsWith(`${oldPath}/`)) {
      setDraggedNode(null);
      return;
    }

    const currentParentDir = oldPath.includes('/') ? oldPath.substring(0, oldPath.lastIndexOf('/')) : '';
    if (currentParentDir === targetDirPath) {
      setDraggedNode(null);
      return; // 已經在該目錄內
    }

    const fileName = oldPath.split('/').pop();
    const newPath = targetDirPath ? `${targetDirPath}/${fileName}` : fileName;

    await onRenameFile(oldPath, newPath);
    setDraggedNode(null);
  };

  useEffect(() => {
    const val = fileContent || '';
    setEditorText(val);
    initialContentRef.current = val;
    setAutoSaveStatus('');
  }, [fileContent, selectedFilePath]);

  // Markdown 編輯器 500ms 防抖自動保存
  useEffect(() => {
    if (!selectedFilePath || editorText === initialContentRef.current) return;

    const timer = setTimeout(async () => {
      setAutoSaveStatus('saving');
      await Promise.resolve(onSaveFile(selectedFilePath, editorText, { silent: true }));
      initialContentRef.current = editorText;
      setAutoSaveStatus('saved');
    }, 500);

    return () => clearTimeout(timer);
  }, [editorText, selectedFilePath, onSaveFile]);

  // 儲存完成後 2.5 秒自動清除視覺提示，保持介面乾淨
  useEffect(() => {
    if (autoSaveStatus === 'saved') {
      const t = setTimeout(() => setAutoSaveStatus(''), 2500);
      return () => clearTimeout(t);
    }
  }, [autoSaveStatus]);

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

  // 一鍵 Markdown 排版與美化 (安全精準版)
  const handleBeautifyMarkdown = () => {
    if (!editorText) return;

    let inCodeBlock = false;
    const lines = editorText.split('\n');
    const processedLines = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // 檢查是否進出程式碼區塊 (```)
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        processedLines.push(line);
        continue;
      }

      // 程式碼區塊內，絕對不更動內容
      if (inCodeBlock) {
        processedLines.push(line);
        continue;
      }

      // 1. 修正標題 # 後缺少空白：例 #標題 -> # 標題
      line = line.replace(/^(#{1,6})([^#\s])/g, '$1 $2');

      // 2. 修正清單符號 (- 或 +) 後缺少空白：僅對 - / + 後接中英文文字時補空白，避免破壞 --- 分隔線或 *斜體* / **粗體**
      if (!line.trim().startsWith('---') && !line.trim().startsWith('***') && !line.trim().startsWith('___')) {
        line = line.replace(/^(\s*[-+])([^\s-+>])/g, '$1 $2');
      }

      // 3. 規範縮排為 2 的倍數 (僅限以 - / * / 數字. 開頭的清單項)
      const listMatch = line.match(/^(\s+)([-+*]|\d+\.)\s+/);
      if (listMatch) {
        const spaces = listMatch[1].length;
        const normalizedSpaces = Math.round(spaces / 2) * 2;
        line = ' '.repeat(normalizedSpaces) + line.trimStart();
      }

      // 4. 處理行尾空白：若剛好 2 個空白則保留作為 Markdown 斷行語法 (<br>)，否則清除多餘空白
      const trailingSpacesMatch = line.match(/\s+$/);
      if (trailingSpacesMatch && trailingSpacesMatch[0].length !== 2) {
        line = line.replace(/\s+$/, '');
      }

      // 5. 確保 H1~H3 標題前有一行空行 (若上一行非空且非文件開頭)
      if (i > 0 && /^#{1,3}\s/.test(line.trim())) {
        const prevLine = processedLines[processedLines.length - 1];
        if (prevLine !== undefined && prevLine.trim() !== '') {
          processedLines.push('');
        }
      }

      processedLines.push(line);
    }

    // 將連續超過 2 個以上的空行縮減為標準 1 個空行
    const formatted = processedLines.join('\n').replace(/\n{3,}/g, '\n\n');

    setEditorText(formatted);
    if (showToast) {
      showToast('✨ 已完成 Markdown 一鍵排版與美化', 'success');
    }
  };

  // Markdown 編輯器支援 Tab / Shift+Tab 縮排與解除縮排
  const handleTextareaKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (start === end) {
        const newText = editorText.substring(0, start) + '  ' + editorText.substring(end);
        setEditorText(newText);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }, 0);
      } else {
        const selected = editorText.substring(start, end);
        const lines = selected.split('\n');
        const isShift = e.shiftKey;
        const processed = lines
          .map((line) => {
            if (isShift) {
              return line.startsWith('  ') ? line.substring(2) : (line.startsWith('\t') ? line.substring(1) : line);
            } else {
              return '  ' + line;
            }
          })
          .join('\n');
        const newText = editorText.substring(0, start) + processed + editorText.substring(end);
        setEditorText(newText);
        setTimeout(() => {
          textarea.selectionStart = start;
          textarea.selectionEnd = start + processed.length;
        }, 0);
      }
    }
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

    const prefix = targetFolder ? `${targetFolder}/` : '';

    if (createType === 'folder') {
      onCreateFile(`${prefix}${newInputName.trim()}`, true);
    } else {
      const name = newInputName.trim();
      const finalPath = name.endsWith('.md') ? `${prefix}${name}` : `${prefix}${name}.md`;
      onCreateFile(finalPath, false);
    }

    setNewInputName('');
    setCreateType(null);
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!renameTarget || !renameInput.trim() || !onRenameFile) return;

    const oldPath = renameTarget.path;
    const oldDir = oldPath.includes('/') ? oldPath.substring(0, oldPath.lastIndexOf('/')) : '';
    let newName = renameInput.trim();

    if (renameTarget.type === 'file' && !newName.endsWith('.md')) {
      newName += '.md';
    }

    const newPath = oldDir ? `${oldDir}/${newName}` : newName;

    if (newPath === oldPath) {
      setRenameTarget(null);
      return;
    }

    const success = await onRenameFile(oldPath, newPath);
    if (success !== false) {
      setRenameTarget(null);
    }
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
        const isCollapsed = collapsedDirs.has(node.path);
        const isDragOver = dragOverPath === node.path;
        return (
          <div key={node.path} style={{ marginTop: '2px' }}>
            <div
              draggable="true"
              onDragStart={(e) => {
                setDraggedNode(node);
                e.dataTransfer.setData('text/plain', node.path);
              }}
              onDragEnd={() => {
                setDraggedNode(null);
                setDragOverPath(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (draggedNode && draggedNode.path !== node.path) {
                  setDragOverPath(node.path);
                }
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDragLeave={(e) => {
                e.stopPropagation();
                if (dragOverPath === node.path) setDragOverPath(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDropOnFolder(node.path);
              }}
              onClick={() => toggleCollapse(node.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                paddingLeft: `${indentPx}px`,
                color: 'var(--accent-amber)',
                fontSize: '13px',
                fontWeight: '600',
                borderRadius: 'var(--radius-sm)',
                cursor: 'grab',
                background: isDragOver ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.05)',
                border: isDragOver ? '1px dashed var(--accent-amber)' : '1px solid transparent',
                transition: 'var(--transition-fast)',
                userSelect: 'none',
                WebkitUserSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                <GripVertical size={13} color="var(--accent-amber)" style={{ opacity: 0.6, flexShrink: 0, pointerEvents: 'none' }} />
                {isCollapsed ? <ChevronRight size={14} color="var(--accent-amber)" style={{ pointerEvents: 'none' }} /> : <ChevronDown size={14} color="var(--accent-amber)" style={{ pointerEvents: 'none' }} />}
                <Folder size={15} color="var(--accent-amber)" style={{ flexShrink: 0, pointerEvents: 'none' }} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none' }}>{node.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTargetFolder(node.path);
                    setCreateType('file');
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-cyan)', opacity: 0.8 }}
                  title="在此資料夾建立新筆記檔案"
                >
                  <FilePlus size={13} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenameTarget(node);
                    setRenameInput(node.name);
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', opacity: 0.8 }}
                  title="重新命名資料夾"
                >
                  <Edit2 size={12} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTargetNode(node);
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', opacity: 0.6 }}
                  title="刪除資料夾"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            {!isCollapsed && <div>{renderTree(node.children, depth + 1)}</div>}
          </div>
        );
      }

      const isSelected = selectedFilePath === node.path;
      const isDragOverFile = dragOverPath === node.path;

      return (
        <div
          key={node.path}
          draggable="true"
          onDragStart={(e) => {
            setDraggedNode(node);
            e.dataTransfer.setData('text/plain', node.path);
          }}
          onDragEnd={() => {
            setDraggedNode(null);
            setDragOverPath(null);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (draggedNode && draggedNode.path !== node.path) {
              setDragOverPath(node.path);
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragLeave={(e) => {
            e.stopPropagation();
            if (dragOverPath === node.path) setDragOverPath(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const parentDir = node.path.includes('/') ? node.path.substring(0, node.path.lastIndexOf('/')) : '';
            handleDropOnFolder(parentDir);
          }}
          onClick={() => onSelectFile(node.path)}
          style={{
            padding: '7px 10px',
            paddingLeft: `${indentPx}px`,
            borderRadius: 'var(--radius-sm)',
            cursor: 'grab',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isDragOverFile ? 'rgba(94, 106, 210, 0.35)' : isSelected ? 'rgba(94, 106, 210, 0.22)' : 'transparent',
            border: isDragOverFile ? '1px dashed var(--primary-linear)' : isSelected ? '1px solid rgba(94, 106, 210, 0.4)' : '1px solid transparent',
            color: isSelected ? '#f8fafc' : 'var(--text-muted)',
            fontWeight: isSelected ? '600' : '400',
            marginTop: '2px',
            transition: 'var(--transition-fast)',
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            <GripVertical size={13} color={isSelected ? 'var(--primary-linear)' : 'var(--text-dim)'} style={{ opacity: 0.5, flexShrink: 0, pointerEvents: 'none' }} />
            <FileText size={14} color={isSelected ? 'var(--primary-linear)' : 'var(--text-dim)'} style={{ flexShrink: 0, pointerEvents: 'none' }} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none' }}>{node.name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setRenameTarget(node);
                setRenameInput(node.name);
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', opacity: isSelected ? 0.9 : 0.6 }}
              title="重新命名檔案"
            >
              <Edit2 size={12} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTargetNode(node);
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-rose)', opacity: isSelected ? 0.9 : 0.6 }}
              title="刪除檔案"
            >
              <Trash2 size={12} />
            </button>
          </div>
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
          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(15, 23, 42, 0.9)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass-bright)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📂 選擇存放目錄：</label>
              <select
                value={targetFolder}
                onChange={(e) => setTargetFolder(e.target.value)}
                style={{
                  width: '100%',
                  background: '#1e293b',
                  color: '#e2e8f0',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  padding: '6px 8px',
                  outline: 'none'
                }}
                title="選擇目標資料夾"
              >
                <option value="">/ (根目錄)</option>
                {getAllFolderPaths(notesTree).map(f => (
                  <option key={f} value={f}>/{f}</option>
                ))}
              </select>
              <input
                type="text"
                autoFocus
                value={newInputName}
                onChange={(e) => setNewInputName(e.target.value)}
                placeholder={createType === 'folder' ? '輸入資料夾名稱...' : '例: idea.md...'}
                style={{ width: '100%', background: 'transparent', border: '1px solid var(--border-glass)', borderRadius: '4px', padding: '6px 8px', color: 'white', fontSize: '12px', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
              <button type="button" onClick={() => { setCreateType(null); setTargetFolder(''); }} className="btn-secondary" style={{ padding: '2px 8px', fontSize: '11px' }}>
                取消
              </button>
              <button type="submit" className="btn-primary" style={{ padding: '2px 10px', fontSize: '11px' }}>確認建立</button>
            </div>
          </form>
        )}

        {/* Tree Container (支援拖放到空白處或上方提示列以移至根目錄 /) */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (draggedNode && draggedNode.path.includes('/')) {
              setDragOverPath('__root__');
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragLeave={(e) => {
            e.stopPropagation();
            if (dragOverPath === '__root__') setDragOverPath(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDropOnFolder('');
          }}
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            borderRadius: 'var(--radius-sm)',
            border: dragOverPath === '__root__' ? '2px dashed var(--primary-linear)' : '1px solid transparent',
            background: dragOverPath === '__root__' ? 'rgba(94, 106, 210, 0.15)' : 'transparent',
            padding: '2px',
            transition: 'var(--transition-fast)'
          }}
        >
          {draggedNode && draggedNode.path.includes('/') && (
            <div
              style={{
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px dashed var(--primary-linear)',
                background: 'rgba(94, 106, 210, 0.2)',
                color: '#ffffff',
                fontSize: '12px',
                textAlign: 'center',
                fontWeight: '600',
                marginBottom: '6px'
              }}
            >
              📥 拖曳至此或空白處以移至「根目錄 /」
            </div>
          )}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedFilePath ? selectedFilePath.split('/').pop() : '請選擇左側 Markdown 檔案'}
                </h2>
                {selectedFilePath && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '2px 8px', fontSize: '11px', flexShrink: 0 }}
                    onClick={() => {
                      setRenameTarget({ path: selectedFilePath, name: selectedFilePath.split('/').pop(), type: 'file' });
                      setRenameInput(selectedFilePath.split('/').pop());
                    }}
                    title="修改筆記檔案名稱與標題"
                  >
                    <Edit2 size={12} /> 修改標題
                  </button>
                )}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span>{selectedFilePath ? `檔案路徑: ${selectedFilePath}` : '實體存取 ./notes/ 目錄 (對應硬盤檔案)'}</span>
                {selectedFilePath && (
                  <span style={{ color: 'var(--text-muted)' }}>| 📝 字數: {editorText ? editorText.trim().replace(/\s+/g, '').length : 0} 字</span>
                )}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
            {autoSaveStatus === 'saving' && (
              <span style={{ fontSize: '12px', color: 'var(--accent-amber)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                ⏳ 自動保存中...
              </span>
            )}
            {autoSaveStatus === 'saved' && (
              <span style={{ fontSize: '12px', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                ☁️ ✅ 已同步
              </span>
            )}
            <button className="btn-secondary" onClick={handleBeautifyMarkdown} title="一鍵自動排版與美化 Markdown 內容">
              ✨ 一鍵美化
            </button>
            <button className="btn-secondary" onClick={() => setSplitView(!splitView)} title="切換左右分割即時預覽 (Split View)">
              {splitView ? <EyeOff size={14} /> : <Eye size={14} />} {splitView ? '關閉即時預覽' : '分割即時預覽'}
            </button>
            <button className="btn-secondary" onClick={handleOpenHtmlPreview}>
              <ExternalLink size={14} /> 開啟 HTML 分頁預覽
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
              onKeyDown={handleTextareaKeyDown}
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

      {/* Rename Modal */}
      {renameTarget && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <form
            onSubmit={handleRenameSubmit}
            className="glass-panel"
            style={{ padding: '24px', width: '380px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid var(--border-glass-bright)', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
          >
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Edit2 size={16} color="var(--primary-linear)" />
              重新命名 {renameTarget.type === 'directory' ? '資料夾' : '檔案'}
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', wordBreak: 'break-all' }}>
              原路徑: <strong style={{ color: 'var(--text-muted)' }}>{renameTarget.path}</strong>
            </div>
            <input
              type="text"
              autoFocus
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              placeholder="請輸入新名稱..."
              style={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid var(--border-glass-bright)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                color: 'white',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setRenameTarget(null)}
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                取消
              </button>
              <button
                type="submit"
                className="btn-primary"
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                確認重命名
              </button>
            </div>
          </form>
        </div>
      )}

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
