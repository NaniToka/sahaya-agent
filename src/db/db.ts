import Database from 'better-sqlite3';
import path from 'path';
import { CaseFile } from '../types/caseFile';

const dbPath = path.join(process.cwd(), 'sahaya.db');
const db = new Database(dbPath);

// Initialize DB schema
db.exec(`
  CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  )
`);

export function getCaseFile(id: string): CaseFile | null {
  const row = db.prepare('SELECT data FROM cases WHERE id = ?').get(id) as { data: string } | undefined;
  if (row) {
    return JSON.parse(row.data) as CaseFile;
  }
  return null;
}

export function saveCaseFile(caseFile: CaseFile): void {
  const stmt = db.prepare('INSERT OR REPLACE INTO cases (id, data) VALUES (?, ?)');
  stmt.run(caseFile.id, JSON.stringify(caseFile));
}
