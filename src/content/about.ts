/*
 * 소개 화면의 글. 언어별로 나눠 둔다 (나중에 사이트 전체를 일본어, 영어로 나누면 이 파일을 쓴다).
 * 지금 화면은 한국어만 보여 준다.
 * 일본어와 영어는 한국어 원문에서 옮긴 것이라 게시 전에 한 번 확인한다.
 */
export const ABOUT_INTRO = {
  ko: [
    "만나서 반가워요! 켈프라고 해요!",
    "찾아오신 분들 중 저를 아시는 분들도 있고, 이 사이트가 궁금해서 오신 분들도 있을 것 같아요. 모두 환영해요! 🤗",
    "준비해둔 건 많이 없지만 편하게 둘러보고 가세요!",
  ],
  ja: [
    "はじめまして！ケルプと申します！",
    "訪れてくださった方の中には、私をご存じの方も、このサイトが気になって来てくださった方もいらっしゃると思います。みなさま歓迎します！🤗",
    "用意したものはあまり多くありませんが、ゆっくり見ていってくださいね！",
  ],
  en: [
    "Nice to meet you! I'm Kerupu!",
    "Some of you may already know me, and some of you may be here out of curiosity about this site. Everyone is welcome! 🤗",
    "I don't have much prepared, but please feel free to look around and make yourself at home!",
  ],
} as const;

/* 연락 · 링크 */
export const ABOUT_LINKS = [
  { name: "GitHub", note: "개인 GitHub예요!", href: "https://github.com/kerupu526" },
  { name: "X (Twitter) 본계정", note: "보카로P 활동 계정이에요!", href: "https://x.com/kerupu_526" },
  { name: "X (Twitter) 부계정", note: "일상/리듬게임 활동 계정이에요!", href: "https://x.com/roromango_065" },
  { name: "YouTube", note: "제 유튜브 채널이에요! 보카로P 활동을 여기서 할 거예요 ✨", href: "https://www.youtube.com/@byanhoutetsuki" },
] as const;
