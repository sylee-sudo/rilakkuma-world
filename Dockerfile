# 리락쿠마 월드 배포용 이미지
# Node 24 를 고정 사용 — 내장 SQLite(node:sqlite)가 별도 플래그 없이 동작해요.
FROM node:24-slim

WORKDIR /app

# 의존성 먼저 설치 (캐시 활용)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# 나머지 소스 복사
COPY . .

# 호스팅이 주는 포트를 사용 (기본 3000)
ENV PORT=3000
# 영구 디스크를 /data 에 붙이면 편지·방명록이 재배포해도 보존돼요
ENV DATA_DIR=/data
EXPOSE 3000

CMD ["node", "server.js"]
