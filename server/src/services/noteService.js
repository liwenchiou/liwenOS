const noteRepository = require('../repositories/noteRepository');

class NoteService {
  async getTree() {
    return await noteRepository.getFileTree();
  }

  async getFile(relPath) {
    return await noteRepository.readFile(relPath);
  }

  async saveFile(relPath, content) {
    return await noteRepository.writeFile(relPath, content);
  }

  async createItem(relPath, isDirectory) {
    return await noteRepository.createItem(relPath, isDirectory);
  }

  async deleteItem(relPath) {
    return await noteRepository.deleteItem(relPath);
  }

  async renameItem(oldRelPath, newRelPath) {
    return await noteRepository.renameItem(oldRelPath, newRelPath);
  }

  // Feature: Full-text & Tag Search API
  async searchNotes(query) {
    if (!query || !query.trim()) return [];

    const searchTerm = query.trim().toLowerCase();
    const allFiles = await noteRepository.getAllMarkdownFiles();
    const results = [];

    for (const file of allFiles) {
      const contentLower = file.content.toLowerCase();
      if (contentLower.includes(searchTerm) || file.relPath.toLowerCase().includes(searchTerm)) {
        // Extract matching snippet context
        const lines = file.content.split('\n');
        const matchingLines = lines
          .map((line, idx) => ({ lineNum: idx + 1, text: line.trim() }))
          .filter(l => l.text.toLowerCase().includes(searchTerm))
          .slice(0, 3); // Top 3 snippets

        results.push({
          path: file.relPath,
          matchCount: matchingLines.length,
          snippets: matchingLines
        });
      }
    }

    return results;
  }
}

module.exports = new NoteService();
