const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate(db);
  }
  return db;
}

function migrate(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
  `);
}

function getDocument(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM documents WHERE id = ?').get(id) || null;
}

function createDocument(id, content = '') {
  const db = getDb();
  db.prepare(
    'INSERT OR IGNORE INTO documents (id, content) VALUES (?, ?)'
  ).run(id, content);
  return getDocument(id);
}

function updateDocument(id, content) {
  const db = getDb();
  const result = db.prepare(
    "UPDATE documents SET content = ?, updated_at = strftime('%s','now') WHERE id = ?"
  ).run(content, id);
  return result.changes > 0;
}

module.exports = { getDocument, createDocument, updateDocument };
