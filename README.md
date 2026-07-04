# 🐻 리락쿠마 월드 (Rilakkuma's House)

Claude Design에서 디자인한 리락쿠마 팬 사이트에 **Node.js 백엔드**를 붙인 프로젝트예요.
편지 게시판 · 방명록 · 방문자 카운터가 서버에 실제로 저장되고, 모두에게 공유돼요.

## 🚀 실행 방법

```bash
npm install      # 최초 1회 (express 설치)
npm start        # 서버 켜기 → http://localhost:3000
```

브라우저에서 **http://localhost:3000** 을 열면 사이트가 나와요.
(개발 중엔 `npm run dev` — 파일 저장 시 자동 재시작)

> 💡 화면은 unpkg CDN에서 React/Babel을 불러와 그려져요. 처음 켤 때 **인터넷 연결**이 필요해요.

## 📁 폴더 구조

```
리락쿠마사이트/
├── server.js          # API 서버 (모든 라우트)
├── db.js              # SQLite DB (data/rilakkuma.db 자동 생성)
├── config.js          # 설정 (관리자 키, 페이지 크기 등) ← 배포 전 수정!
├── public/            # 웹사이트 (정적 파일)
│   ├── index.html     # 디자인한 리락쿠마 월드 (백엔드와 연결됨)
│   ├── support.js     # Claude Design 런타임
│   └── assets/        # 캐릭터·방 이미지 35개
└── data/              # DB 파일 저장 (git 제외)
```

## ✨ 백엔드로 처리되는 기능

| 기능 | 설명 |
|------|------|
| 📮 **편지 게시판** | 익명 편지를 서버에 저장 · 최신순 · **서버 페이지네이션(18통/페이지)** |
| 📖 **방명록** | 이름·한마디·얼굴을 저장하고 모두에게 공개 |
| 🗑️ **내 글만 삭제** | 글 쓸 때 서버가 발급한 **비밀 삭제키**를 내 브라우저에만 저장 → 그 키가 맞아야 삭제 (남의 글은 절대 못 지움) |
| 👥 **방문자 카운터** | 서버 DB에 전체 방문 수 누적 (브라우저당 1회) |
| 🔑 **관리자 마스터 키** | `config.js`의 키를 쓰면 아무 글이나 삭제 가능 |

> 캐릭터 소개, 편지 답장, 선물 반응, 운세, 방 구경, 커서 반짝이 효과는 **프론트에서** 처리돼요.

## 🔑 관리자 키 설정

`config.js` 의 `ADMIN_KEY` 를 바꾸거나, 환경변수로 넘기세요:

```bash
ADMIN_KEY="아무도-모를-비밀키" npm start
```

관리자 삭제는 API에 `x-admin-key` 헤더로 그 키를 넣으면 돼요. 예:

```bash
curl -X DELETE http://localhost:3000/api/letters/3 -H "x-admin-key: 아무도-모를-비밀키"
```

## 🔌 API 요약

| 기능 | 메서드 & 경로 | 비고 |
|------|--------------|------|
| 편지 목록 | `GET /api/letters?page=1` | 최신순 + 페이지네이션 |
| 편지 쓰기 | `POST /api/letters` | `{recipient, message}` → `deleteToken` 반환 |
| 편지 삭제 | `DELETE /api/letters/:id` | 헤더 `x-delete-token` 또는 `x-admin-key` |
| 방명록 목록 | `GET /api/guestbook` | 최신순 |
| 방명록 쓰기 | `POST /api/guestbook` | `{name, message, face}` |
| 방명록 삭제 | `DELETE /api/guestbook/:id` | 편지와 동일 |
| 방문자 조회 | `GET /api/visits` | `{total}` |
| 방문 +1 | `POST /api/visits` | 브라우저당 1회 (프론트에서 처리) |

## 💾 데이터는 어디에?

`data/rilakkuma.db` (SQLite 파일 하나)에 전부 저장돼요.
이 파일만 백업하면 편지·방명록·방문자수가 그대로 보존돼요.

## 🛠️ 기술 스택

- **Node.js 22+** + **Express** (웹 서버)
- **node:sqlite** — Node에 내장된 SQLite (별도 설치 불필요)
- 프론트: Claude Design (`support.js` 런타임 + React/Babel)
