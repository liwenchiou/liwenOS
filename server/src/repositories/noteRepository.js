const fs = require('fs/promises');
const path = require('path');
const { getNotesBaseDir } = require('../middlewares/sandboxGuard');

class NoteRepository {
  async getFileTree(dirPath = getNotesBaseDir(), relativePath = '') {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const result = [];

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;

        const fullPath = path.join(dirPath, entry.name);
        const relPath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
          const children = await this.getFileTree(fullPath, relPath);
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
      console.error('NoteRepository getFileTree error:', err);
      return [];
    }
  }

  async readFile(relPath) {
    const baseDir = getNotesBaseDir();
    let filePath = path.resolve(baseDir, relPath);
    try {
      return await fs.readFile(filePath, 'utf-8');
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
            return await fs.readFile(filePath, 'utf-8');
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
  }

  async writeFile(relPath, content) {
    const baseDir = getNotesBaseDir();
    const filePath = path.resolve(baseDir, relPath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content || '', 'utf-8');
    return filePath;
  }

  async createItem(relPath, isDirectory) {
    const baseDir = getNotesBaseDir();
    const targetPath = path.resolve(baseDir, relPath);

    if (isDirectory) {
      await fs.mkdir(targetPath, { recursive: true });
    } else {
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.writeFile(targetPath, `# ${path.basename(relPath, '.md')}\n\n`, 'utf-8');
    }
  }

  async deleteItem(relPath) {
    const baseDir = getNotesBaseDir();
    const targetPath = path.resolve(baseDir, relPath);
    await fs.rm(targetPath, { recursive: true, force: true });
  }

  async renameItem(oldRelPath, newRelPath) {
    const baseDir = getNotesBaseDir();
    const oldPath = path.resolve(baseDir, oldRelPath);
    const newPath = path.resolve(baseDir, newRelPath);
    await fs.mkdir(path.dirname(newPath), { recursive: true });
    await fs.rename(oldPath, newPath);
    return newRelPath;
  }

  // Scan all markdown files for search
  async getAllMarkdownFiles(dirPath = getNotesBaseDir(), relativePath = '') {
    let files = [];
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const fullPath = path.join(dirPath, entry.name);
        const relPath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.getAllMarkdownFiles(fullPath, relPath);
          files = files.concat(subFiles);
        } else if (entry.name.endsWith('.md')) {
          const content = await fs.readFile(fullPath, 'utf-8');
          files.push({ relPath, content });
        }
      }
    } catch (err) {
      console.error('getAllMarkdownFiles error:', err);
    }
    return files;
  }
}

module.exports = new NoteRepository();
