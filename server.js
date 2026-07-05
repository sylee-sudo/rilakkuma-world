// ─────────────────────────────────────────────────────────────
//  리락쿠마 월드 백엔드 서버
//  - 편지 게시판 (익명 편지 저장 / 최신순 / 서버 페이지네이션)
//  - 방명록 (이름 · 한마디 · 얼굴)
//  - 방문자 카운터
//  - 내 글 삭제 (삭제키 토큰 방식, 로그인 없음)
//  - 관리자 마스터 키로 아무 글이나 삭제
//
//  데이터는 db.js 가 알아서 저장해요 (로컬=SQLite / 배포=Postgres).
// ─────────────────────────────────────────────────────────────

import express from 'express';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { initDB, engineName } from './db.js';
import { PORT, ADMIN_KEY, LETTERS_PER_PAGE, GUEST_LIMIT, LIMITS } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// DB 준비 (테이블 생성까지) 후 서버 시작
const db = await initDB();

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// ── 작은 도우미들 ───────────────────────────────────────────────

function makeToken() {
  return randomBytes(24).toString('hex');
}

function clean(v, limit) {
  return (v ?? '').toString().trim().slice(0, limit);
}

function canDelete(row, deleteToken, adminKey) {
  if (adminKey && adminKey === ADMIN_KEY) return true;
  if (deleteToken && deleteToken === row.delete_token) return true;
  return false;
}

// async 라우트에서 던진 에러를 500으로 감싸주는 래퍼
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e);
  res.status(500).json({ error: '서버 오류가 났어요. 잠시 후 다시 시도해줘요.' });
});

// 공통 삭제 핸들러
function makeDeleteHandler(getRow, removeRow) {
  return wrap(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const row = await getRow(id);
    if (!row) return res.status(404).json({ error: '이미 삭제됐거나 없는 글이에요.' });

    const deleteToken = req.get('x-delete-token') || req.body?.deleteToken;
    const adminKey = req.get('x-admin-key') || req.body?.adminKey;

    if (!canDelete(row, deleteToken, adminKey)) {
      return res.status(403).json({ error: '삭제 권한이 없어요. (내 글이 아니거나 키가 달라요)' });
    }
    await removeRow(id);
    res.json({ ok: true });
  });
}

// ════════════════════════════════════════════════════════════════
//  편지 게시판  /api/letters
// ════════════════════════════════════════════════════════════════

app.get('/api/letters', wrap(async (req, res) => {
  const total = await db.countLetters();
  const totalPages = Math.max(1, Math.ceil(total / LETTERS_PER_PAGE));
  const page = Math.min(Math.max(1, parseInt(req.query.page, 10) || 1), totalPages);
  const offset = (page - 1) * LETTERS_PER_PAGE;
  const items = await db.listLetters(LETTERS_PER_PAGE, offset);
  res.json({ items, page, totalPages, total, pageSize: LETTERS_PER_PAGE });
}));

app.post('/api/letters', wrap(async (req, res) => {
  const recipient = clean(req.body?.recipient, LIMITS.recipient) || '리락쿠마';
  const message = clean(req.body?.message, LIMITS.letter);
  if (!message) return res.status(400).json({ error: '편지 내용을 입력해주세요.' });

  const token = makeToken();
  const createdAt = new Date().toISOString();
  const id = await db.insertLetter(recipient, message, token, createdAt);
  res.status(201).json({ ok: true, id, deleteToken: token, createdAt });
}));

app.delete('/api/letters/:id', makeDeleteHandler((id) => db.getLetter(id), (id) => db.removeLetter(id)));

// ════════════════════════════════════════════════════════════════
//  방명록  /api/guestbook
// ════════════════════════════════════════════════════════════════

app.get('/api/guestbook', wrap(async (req, res) => {
  const total = await db.countGuests();
  const items = await db.listGuests(GUEST_LIMIT);
  res.json({ items, total });
}));

app.post('/api/guestbook', wrap(async (req, res) => {
  const name = clean(req.body?.name, LIMITS.name) || '익명의 손님';
  const message = clean(req.body?.message, LIMITS.guest);
  const face = clean(req.body?.face, 200) || 'assets/char_trail2.png';
  if (!message) return res.status(400).json({ error: '한마디를 입력해주세요.' });

  const token = makeToken();
  const createdAt = new Date().toISOString();
  const id = await db.insertGuest(name, message, face, token, createdAt);
  res.status(201).json({ ok: true, id, deleteToken: token, createdAt });
}));

app.delete('/api/guestbook/:id', makeDeleteHandler((id) => db.getGuest(id), (id) => db.removeGuest(id)));

// ════════════════════════════════════════════════════════════════
//  방문자 카운터  /api/visits
// ════════════════════════════════════════════════════════════════

app.get('/api/visits', wrap(async (req, res) => {
  res.json({ total: await db.getVisits() });
}));

app.post('/api/visits', wrap(async (req, res) => {
  res.json({ total: await db.incVisits() });
}));

// 방문자수 리셋 (관리자 마스터 키 필요) — body {value} 없으면 0으로
app.post('/api/visits/reset', wrap(async (req, res) => {
  const adminKey = req.get('x-admin-key') || req.body?.adminKey;
  if (!adminKey || adminKey !== ADMIN_KEY) {
    return res.status(403).json({ error: '관리자 키가 필요해요.' });
  }
  const value = Number.isInteger(req.body?.value) ? req.body.value : 0;
  res.json({ total: await db.setVisits(value) });
}));

// ── 헬스체크 ────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ── 서버 시작 ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🐻 리락쿠마 월드 서버가 켜졌어요!`);
  console.log(`   → http://localhost:${PORT}`);
  console.log(`   저장소: ${engineName()}`);
  if (ADMIN_KEY === 'rilakkuma-master-please-change-me') {
    console.log(`\n⚠️  관리자 키가 기본값이에요. 배포 전에 config.js(또는 ADMIN_KEY 환경변수)에서 꼭 바꾸세요!`);
  }
  console.log('');
});
