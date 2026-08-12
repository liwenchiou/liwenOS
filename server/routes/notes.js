const express = require('express');
const router = express.Router();
const fs = require('fs/promises');
const path = require('path');

// Resolve root notes directory (Fixed absolute path to project root/notes regardless of process.cwd)
const getNotesBaseDir = () => {
  return path.resolve(__dirname, '../../notes');
};

// Helper: Recursively build file tree
async function buildFileTree(dirPath, relativePath = '') {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const result = [];

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue; // ignore hidden files

      const fullPath = path.join(dirPath, entry.name);
      const relPath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        const children = await buildFileTree(fullPath, relPath);
        result.push({
          name: entry.name,
          path: relPath,
          type: 'directory',
          children
        });
      } else if (entry.name.endsWith('.md')) {
        const stats = await fs.stat(fullPath);
        result.push({
          name: entry.name,
          path: relPath,
          type: 'file',
          updatedAt: stats.mtime
        });
      }
    }
    return result;
  } catch (err) {
    console.error('Error reading dir:', err);
    return [];
  }
}

// 1. Get File Tree
router.get('/tree', async (req, res) => {
  try {
    const baseDir = getNotesBaseDir();
    await fs.mkdir(baseDir, { recursive: true });
    const tree = await buildFileTree(baseDir);
    res.json({ success: true, tree });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Read File Content
router.get('/file', async (req, res) => {
  try {
    const { relPath } = req.query;
    if (!relPath) return res.status(400).json({ error: 'Missing relPath parameter' });

    const baseDir = getNotesBaseDir();
    let filePath = path.resolve(baseDir, relPath);

    // Security check: ensure target path is within baseDir
    if (!filePath.startsWith(baseDir)) {
      return res.status(403).json({ error: 'Access denied outside notes directory' });
    }

    let content;
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch (readErr) {
      // macOS NFD/NFC 容錯與核心行程標題標準化查詢
      if (readErr.code === 'ENOENT') {
        const dir = path.dirname(filePath);
        const targetName = path.basename(filePath).normalize('NFC');
        try {
          const files = await fs.readdir(dir);
          let matched = files.find(f => f.normalize('NFC') === targetName);
          if (!matched) {
            // 取出核心行程標題並強制轉換為 NFC 進行子字串比對（消除 macOS NFD/NFC 及前綴差異）
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
            const targetPure = cleanTitle(targetName);
            if (targetPure && targetPure.length > 0) {
              matched = files.find(f => {
                const fPure = cleanTitle(f);
                return fPure && (fPure.includes(targetPure) || targetPure.includes(fPure));
              });
            }
          }
          if (matched) {
            filePath = path.join(dir, matched);
            content = await fs.readFile(filePath, 'utf-8');
          } else {
            throw readErr;
          }
        } catch (dirErr) {
          throw readErr;
        }
      } else {
        throw readErr;
      }
    }

    res.json({ success: true, path: relPath, content });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Save File Content
router.post('/file', async (req, res) => {
  try {
    const { relPath, content } = req.body;
    if (!relPath) return res.status(400).json({ error: 'Missing relPath' });

    const baseDir = getNotesBaseDir();
    const filePath = path.resolve(baseDir, relPath);

    if (!filePath.startsWith(baseDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Ensure parent directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content || '', 'utf-8');

    res.json({ success: true, path: relPath, message: 'File saved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Create New File / Directory
router.post('/create', async (req, res) => {
  try {
    const { relPath, isDirectory } = req.body;
    if (!relPath) return res.status(400).json({ error: 'Missing relPath' });

    const baseDir = getNotesBaseDir();
    const targetPath = path.resolve(baseDir, relPath);

    if (!targetPath.startsWith(baseDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (isDirectory) {
      await fs.mkdir(targetPath, { recursive: true });
    } else {
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.writeFile(targetPath, `# ${path.basename(relPath, '.md')}\n\n`, 'utf-8');
    }

    res.json({ success: true, message: 'Created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Delete File
router.delete('/file', async (req, res) => {
  try {
    const { relPath } = req.query;
    if (!relPath) return res.status(400).json({ error: 'Missing relPath' });

    const baseDir = getNotesBaseDir();
    const targetPath = path.resolve(baseDir, relPath);

    if (!targetPath.startsWith(baseDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await fs.rm(targetPath, { recursive: true, force: true });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Rename/Move File
router.put('/rename', async (req, res) => {
  try {
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) return res.status(400).json({ error: 'Missing oldPath or newPath' });

    const baseDir = getNotesBaseDir();
    const sourcePath = path.resolve(baseDir, oldPath);
    const destPath = path.resolve(baseDir, newPath);

    if (!sourcePath.startsWith(baseDir) || !destPath.startsWith(baseDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.rename(sourcePath, destPath);
    res.json({ success: true, message: 'Renamed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
