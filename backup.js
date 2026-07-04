// ─────────────────────────────────────────────────────────────
//  편지 · 방명록 백업 스크립트
//
//  실행:  node backup.js
//  결과:  backups/backup-날짜시각.json 파일로 전부 저장돼요.
//
//  사이트의 공개 API로 데이터를 가져오기 때문에 DB 비밀번호가 필요 없어요.
//  (삭제키 같은 비밀값은 백업에 포함되지 않아요 — 내용만 저장돼요.)
// ─────────────────────────────────────────────────────────────

import { mkdirSync, writeFileSync } from 'node:fs';

// 백업할 사이트 주소 (다른 주소면 SITE_URL 환경변수로 바꿀 수 있어요)
const BASE = process.env.SITE_URL || 'https://rilakkuma-world.onrender.com';

async function getJSON(path) {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error(`${path} 요청 실패 (HTTP ${res.status})`);
  return res.json();
}

async function main() {
  console.log(`🐻 백업 시작: ${BASE}`);
  console.log('   (서버가 자고 있으면 처음 깨어나는 데 30초쯤 걸릴 수 있어요)');

  // 편지: 페이지를 끝까지 넘기며 전부 수집
  const first = await getJSON('/api/letters?page=1');
  let letters = [...first.items];
  for (let p = 2; p <= first.totalPages; p++) {
    letters.push(...(await getJSON(`/api/letters?page=${p}`)).items);
  }

  // 방명록
  const guest = await getJSON('/api/guestbook');

  // 방문자 수
  const visits = await getJSON('/api/visits');

  const now = new Date();
  const stamp = now.toISOString().replace(/[:T]/g, '-').slice(0, 19);
  const data = {
    backedUpAt: now.toISOString(),
    site: BASE,
    letters,
    guestbook: guest.items,
    visits: visits.total,
  };

  mkdirSync('backups', { recursive: true });
  const file = `backups/backup-${stamp}.json`;
  writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');

  console.log(`\n✅ 백업 완료 → ${file}`);
  console.log(`   편지 ${letters.length}통 · 방명록 ${guest.items.length}개 · 방문자 ${visits.total}명`);
}

main().catch((e) => {
  console.error('\n❌ 백업 실패:', e.message);
  process.exit(1);
});
