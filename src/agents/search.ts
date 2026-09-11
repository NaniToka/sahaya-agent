import fs from 'fs';
import path from 'path';

export interface DocumentChunk {
  id: string;
  sourceDocument: string;
  section: string;
  content: string;
  isDemo: boolean;
}

let cachedChunks: DocumentChunk[] = [];

// Simple tokenizer
function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(t => t.length > 2);
}

// Load and chunk the guidelines
function loadChunks(): DocumentChunk[] {
  if (cachedChunks.length > 0) return cachedChunks;

  const guidelinesDir = path.join(process.cwd(), 'data', 'synthetic', 'guidelines');
  const files = fs.readdirSync(guidelinesDir).filter(f => f.endsWith('.md'));
  
  const chunks: DocumentChunk[] = [];
  
  for (const file of files) {
    const filePath = path.join(guidelinesDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Split by markdown headings (##)
    const sections = content.split('\n## ');
    const documentTitle = sections[0].split('\n')[2]?.replace('# ', '') || file;
    
    // Skip the first part if it's just the header, or process it
    for (let i = 1; i < sections.length; i++) {
      const sectionText = sections[i];
      const lines = sectionText.split('\n');
      const sectionName = lines[0].trim();
      const sectionContent = lines.slice(1).join('\n').trim();
      
      if (sectionContent) {
        chunks.push({
          id: `${file}_${i}`,
          sourceDocument: documentTitle,
          section: sectionName,
          content: sectionContent,
          isDemo: true // All synthetic guidelines are marked as demo
        });
      }
    }
  }
  
  cachedChunks = chunks;
  return chunks;
}

// Basic TF-IDF / Keyword search
export function searchGuidelines(query: string, topK: number = 5): { chunk: DocumentChunk; score: number }[] {
  const chunks = loadChunks();
  const queryTokens = tokenize(query);
  
  if (queryTokens.length === 0) return [];

  // Calculate term frequencies in chunks
  const scores = chunks.map(chunk => {
    const chunkTokens = tokenize(chunk.section + ' ' + chunk.content);
    let score = 0;
    
    for (const qt of queryTokens) {
      const count = chunkTokens.filter(t => t === qt).length;
      if (count > 0) {
        // simple TF
        score += count; 
      }
    }
    
    return { chunk, score };
  });

  // Filter out zero scores and sort
  const results = scores.filter(s => s.score > 0).sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}
