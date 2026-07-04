// ─────────────────────────────────────────────────────────────
//  설정값 모음
//  실제 배포할 때는 아래 ADMIN_KEY 를 꼭 바꿔주세요!
//  (환경변수 ADMIN_KEY 를 넣으면 그 값이 우선 적용됩니다)
// ─────────────────────────────────────────────────────────────

export const PORT = process.env.PORT || 3000;

// 관리자(집주인) 마스터 키 — 이 키가 있으면 아무 글이나 지울 수 있어요.
// 배포 전에 반드시 아무도 못 맞출 값으로 바꾸세요.
export const ADMIN_KEY = process.env.ADMIN_KEY || 'rilakkuma-master-please-change-me';

// 편지 게시판: 한 페이지에 보여줄 편지 수 (디자인의 스티커 벽과 동일하게 18개)
export const LETTERS_PER_PAGE = 18;

// 방명록: 한 번에 불러올 최대 개수 (방명록은 페이지네이션 없이 최신순으로 보여줘요)
export const GUEST_LIMIT = 200;

// 입력 길이 제한 (너무 긴 글 방지)
export const LIMITS = {
  recipient: 40,   // 편지 받는 친구 이름
  letter: 1000,    // 편지 본문
  name: 40,        // 방명록 이름
  guest: 200,      // 방명록 한마디
};
