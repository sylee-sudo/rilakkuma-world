# 🚀 배포 가이드 — Render(무료) + Neon(무료 Postgres)

다른 사람들이 각자 기기에서 접속하고, **편지·방명록이 영구 보존**되는 진짜 웹사이트로 올리는 방법이에요.
전부 무료 플랜으로 가능해요.

> 계정 만들기·로그인은 직접 해주세요. (비밀번호는 저 대신 넣어드릴 수 없어요.)
> 순서: **① Neon DB 만들기 → ② GitHub에 코드 올리기 → ③ Render 배포**

---

## ① Neon — 무료 클라우드 Postgres 만들기

편지·방명록이 저장될 데이터베이스예요.

1. https://neon.tech 접속 → **Sign up** (GitHub나 Google 계정으로 가입하면 빨라요)
2. **Create project** 클릭 → 이름은 `rilakkuma`, Region은 가까운 곳(예: Asia/Singapore) 선택
3. 프로젝트가 만들어지면 **Connection string**(연결 문자열)이 보여요.
   `postgresql://... .neon.tech/...?sslmode=require` 형태예요.
4. 이 문자열을 **복사해서 잘 보관**하세요. → 이게 `DATABASE_URL` 이에요. (남에게 보이면 안 돼요!)

---

## ② GitHub — 코드 올리기

Render가 코드를 가져갈 수 있게 GitHub에 올려요.

1. https://github.com 로그인/가입
2. 오른쪽 위 **+** → **New repository**
   - 이름: `rilakkuma-world`
   - Public / Private 아무거나
   - (README 추가 체크 **안 함** — 이미 있어요)
   - **Create repository**
3. 만들어진 화면에 나오는 **주소**(`https://github.com/내아이디/rilakkuma-world.git`)를 복사
4. 터미널에서 이 폴더에서 아래 명령을 실행 (주소만 본인 걸로 바꿔요):

```bash
git remote add origin https://github.com/내아이디/rilakkuma-world.git
git branch -M main
git push -u origin main
```

> push 할 때 GitHub 로그인 창이 뜨면 로그인해요. (비밀번호 대신 토큰을 물어보면
> GitHub Settings → Developer settings → Personal access tokens 에서 만들면 돼요.)

---

## ③ Render — 배포하기

1. https://render.com 접속 → **Sign up** (GitHub 계정으로 로그인하면 다음 단계가 편해요)
2. 대시보드에서 **New +** → **Web Service**
3. **Build and deploy from a Git repository** → 방금 만든 `rilakkuma-world` 저장소 선택
   (처음이면 GitHub 연동 권한을 한 번 허용해줘야 해요)
4. 설정 화면:
   - **Language**: `Docker` (우리 `Dockerfile`을 자동으로 알아봐요)
   - **Instance Type**: **Free**
   - 아래 **Environment Variables** 에 2개 추가:

     | Key | Value |
     |-----|-------|
     | `DATABASE_URL` | ①에서 복사한 Neon 연결 문자열 |
     | `ADMIN_KEY` | 아무도 못 맞출 나만의 비밀키 (예: `kuma-2026-비밀!`) |

5. **Create Web Service** 클릭 → 몇 분간 빌드 → 끝나면
   `https://rilakkuma-world-xxxx.onrender.com` 같은 **진짜 주소**가 생겨요! 🎉

이 주소를 친구들에게 공유하면 각자 기기에서 접속해서 편지·방명록을 남길 수 있어요.

---

## 알아두면 좋은 점

- **무료라서 잠들어요**: Render 무료 웹과 Neon 무료 DB는 한동안 접속이 없으면 잠들었다가,
  누군가 접속하면 다시 깨어나요. 그래서 **오랜만의 첫 접속은 20~40초쯤 느릴 수 있어요.**
  (데이터는 그대로 보존되니 걱정 마세요.)
- **관리자 삭제**: 어떤 글이든 지우고 싶으면, 브라우저 콘솔에서 또는 아래처럼:
  ```bash
  curl -X DELETE https://내주소.onrender.com/api/letters/글번호 -H "x-admin-key: 내ADMIN_KEY"
  ```
- **코드를 고친 뒤 다시 올리려면**: `git add -A && git commit -m "수정" && git push` 하면
  Render가 자동으로 다시 배포해요. (Neon에 저장된 편지·방명록은 유지돼요.)

---

## 배포 전에 미리 확인하고 싶다면 (선택)

Neon 연결 문자열을 받은 뒤, 로컬에서 진짜 Postgres로 잘 도는지 먼저 시험해볼 수 있어요:

```bash
DATABASE_URL="여기에_Neon_연결문자열" npm start
```

서버 로그에 `저장소: Postgres (클라우드)` 라고 뜨고 편지가 써지면 성공이에요.
(이걸 저한테 알려주시면 제가 대신 확인해드릴 수도 있어요.)
