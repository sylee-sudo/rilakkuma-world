// ─────────────────────────────────────────────────────────────
//  데이터 저장소 (편지 · 방명록 · 방문자수)
//
//  환경변수 DATABASE_URL 이 있으면  → 클라우드 Postgres (배포용, 영구 보존)
//  없으면                          → 내장 SQLite  (로컬 개발용, 설정 0)
//
//  두 경우 모두 아래와 똑같은 async 함수들을 제공해서
//  server.js 는 어떤 DB를 쓰는지 신경 쓸 필요가 없어요.
// ─────────────────────────────────────────────────────────────

const usePostgres = !!process.env.DATABASE_URL;

let impl;

// ════════════════════════════════════════════════════════════════
//  Postgres 엔진 (배포)
// ════════════════════════════════════════════════════════════════
async function makePostgres() {
  const { default: pg } = await import('pg');
  const url = process.env.DATABASE_URL;
  const pool = new pg.Pool({
    connectionString: url,
    // Neon 등 클라우드 DB는 SSL 필요. 로컬 postgres면 끔.
    ssl: url.includes('localhost') || url.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
  });
  const q = (text, params) => pool.query(text, params);

  // 테이블 생성
  await q(`CREATE TABLE IF NOT EXISTS letters (
    id           SERIAL PRIMARY KEY,
    recipient    TEXT NOT NULL,
    message      TEXT NOT NULL,
    delete_token TEXT NOT NULL,
    created_at   TEXT NOT NULL
  )`);
  await q(`CREATE TABLE IF NOT EXISTS guestbook (
    id           SERIAL PRIMARY KEY,
    name         TEXT NOT NULL,
    message      TEXT NOT NULL,
    face         TEXT NOT NULL,
    delete_token TEXT NOT NULL,
    created_at   TEXT NOT NULL
  )`);
  await q(`CREATE TABLE IF NOT EXISTS stats (
    key   TEXT PRIMARY KEY,
    value INTEGER NOT NULL
  )`);
  await q(`INSERT INTO stats (key, value) VALUES ('total_visits', 0)
           ON CONFLICT (key) DO NOTHING`);

  return {
    async countLetters() { return (await q('SELECT COUNT(*)::int AS n FROM letters')).rows[0].n; },
    async listLetters(limit, offset) {
      return (await q(
        'SELECT id, recipient, message, created_at FROM letters ORDER BY id DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      )).rows;
    },
    async insertLetter(recipient, message, token, createdAt) {
      return (await q(
        'INSERT INTO letters (recipient, message, delete_token, created_at) VALUES ($1,$2,$3,$4) RETURNING id',
        [recipient, message, token, createdAt]
      )).rows[0].id;
    },
    async getLetter(id) { return (await q('SELECT * FROM letters WHERE id = $1', [id])).rows[0] || null; },
    async removeLetter(id) { await q('DELETE FROM letters WHERE id = $1', [id]); },

    async countGuests() { return (await q('SELECT COUNT(*)::int AS n FROM guestbook')).rows[0].n; },
    async listGuests(limit) {
      return (await q(
        'SELECT id, name, message, face, created_at FROM guestbook ORDER BY id DESC LIMIT $1',
        [limit]
      )).rows;
    },
    async insertGuest(name, message, face, token, createdAt) {
      return (await q(
        'INSERT INTO guestbook (name, message, face, delete_token, created_at) VALUES ($1,$2,$3,$4,$5) RETURNING id',
        [name, message, face, token, createdAt]
      )).rows[0].id;
    },
    async getGuest(id) { return (await q('SELECT * FROM guestbook WHERE id = $1', [id])).rows[0] || null; },
    async removeGuest(id) { await q('DELETE FROM guestbook WHERE id = $1', [id]); },

    async getVisits() { return (await q(`SELECT value FROM stats WHERE key = 'total_visits'`)).rows[0].value; },
    async incVisits() {
      return (await q(
        `UPDATE stats SET value = value + 1 WHERE key = 'total_visits' RETURNING value`
      )).rows[0].value;
    },
    async setVisits(n) {
      return (await q(
        `UPDATE stats SET value = $1 WHERE key = 'total_visits' RETURNING value`, [n]
      )).rows[0].value;
    },
  };
}

// ════════════════════════════════════════════════════════════════
//  SQLite 엔진 (로컬 개발) — 동기 API를 async 로 감싸서 인터페이스 통일
// ════════════════════════════════════════════════════════════════
async function makeSqlite() {
  const { DatabaseSync } = await import('node:sqlite');
  const { mkdirSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const dataDir = process.env.DATA_DIR || join(__dirname, 'data');
  mkdirSync(dataDir, { recursive: true });

  const db = new DatabaseSync(join(dataDir, 'rilakkuma.db'));
  db.exec('PRAGMA journal_mode = WAL;');

  db.exec(`CREATE TABLE IF NOT EXISTS letters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient TEXT NOT NULL, message TEXT NOT NULL,
    delete_token TEXT NOT NULL, created_at TEXT NOT NULL)`);
  db.exec(`CREATE TABLE IF NOT EXISTS guestbook (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, message TEXT NOT NULL, face TEXT NOT NULL,
    delete_token TEXT NOT NULL, created_at TEXT NOT NULL)`);
  db.exec(`CREATE TABLE IF NOT EXISTS stats (key TEXT PRIMARY KEY, value INTEGER NOT NULL)`);
  db.exec(`INSERT OR IGNORE INTO stats (key, value) VALUES ('total_visits', 0)`);

  return {
    async countLetters() { return db.prepare('SELECT COUNT(*) AS n FROM letters').get().n; },
    async listLetters(limit, offset) {
      return db.prepare('SELECT id, recipient, message, created_at FROM letters ORDER BY id DESC LIMIT ? OFFSET ?').all(limit, offset);
    },
    async insertLetter(recipient, message, token, createdAt) {
      return Number(db.prepare('INSERT INTO letters (recipient, message, delete_token, created_at) VALUES (?,?,?,?)').run(recipient, message, token, createdAt).lastInsertRowid);
    },
    async getLetter(id) { return db.prepare('SELECT * FROM letters WHERE id = ?').get(id) || null; },
    async removeLetter(id) { db.prepare('DELETE FROM letters WHERE id = ?').run(id); },

    async countGuests() { return db.prepare('SELECT COUNT(*) AS n FROM guestbook').get().n; },
    async listGuests(limit) {
      return db.prepare('SELECT id, name, message, face, created_at FROM guestbook ORDER BY id DESC LIMIT ?').all(limit);
    },
    async insertGuest(name, message, face, token, createdAt) {
      return Number(db.prepare('INSERT INTO guestbook (name, message, face, delete_token, created_at) VALUES (?,?,?,?,?)').run(name, message, face, token, createdAt).lastInsertRowid);
    },
    async getGuest(id) { return db.prepare('SELECT * FROM guestbook WHERE id = ?').get(id) || null; },
    async removeGuest(id) { db.prepare('DELETE FROM guestbook WHERE id = ?').run(id); },

    async getVisits() { return db.prepare(`SELECT value FROM stats WHERE key = 'total_visits'`).get().value; },
    async incVisits() {
      db.prepare(`UPDATE stats SET value = value + 1 WHERE key = 'total_visits'`).run();
      return db.prepare(`SELECT value FROM stats WHERE key = 'total_visits'`).get().value;
    },
    async setVisits(n) {
      db.prepare(`UPDATE stats SET value = ? WHERE key = 'total_visits'`).run(n);
      return db.prepare(`SELECT value FROM stats WHERE key = 'total_visits'`).get().value;
    },
  };
}

// ── 초기화 (server.js 가 await 로 한 번 호출) ────────────────────
export async function initDB() {
  impl = usePostgres ? await makePostgres() : await makeSqlite();
  return impl;
}

export function engineName() {
  return usePostgres ? 'Postgres (클라우드)' : 'SQLite (로컬)';
}
