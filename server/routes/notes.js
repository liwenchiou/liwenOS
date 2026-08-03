const express = require('express');
const router = express.Router();
const fs = require('fs/promises');
const path = require('path');

// Resolve root notes directory
const getNotesBaseDir = () => {
  const dir = process.env.NOTES_DIR || path.join(__dirname, '../../notes');
  return path.resolve(dir);
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
    const filePath = path.resolve(baseDir, relPath);

    // Security check: ensure target path is within baseDir
    if (!filePath.startsWith(baseDir)) {
      return res.status(403).json({ error: 'Access denied outside notes directory' });
    }

    const content = await fs.readFile(filePath, 'utf-8');
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

module.exports = router;
