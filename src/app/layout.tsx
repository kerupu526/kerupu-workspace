import type { Metadata } from "next";
import { preload } from "react-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "kerupu_workspace",
    template: "%s | kerupu_workspace",
  },
  description: "켈프(kerupu526)의 개인 웹사이트",
};

/*
 * 글꼴이 준비될 때까지 본문을 숨기는 스크립트 (스타일은 globals.css 의 .fonts-loading).
 * - 첫 방문에서 시스템 글꼴로 먼저 보이다가 바뀌며 깨져 보이는 것을 막는다.
 * - 자주 쓰는 글자를 담은 작은 글꼴(보통, 굵게 각 약 43KB)이 모두 불러와지면 숨김을 풀고,
 *   2초가 지나면 못 기다리고 그냥 보여 준다. (느린 회선에서도 보통은 2초 안에 끝난다.)
 *   (흰 화면이 너무 길어 보이면 줄이고, 느린 환경에서 글꼴이 바뀌는 게 자주 보이면 늘린다.)
 *   (그 뒤에는 CSS 의 font-display: swap 으로 늦게 바뀐다. 폴백 글꼴은 폭을 맞춰 뒀다.)
 * - 한글 "가"와 영문 "A"를 기준으로 불러와서, 원본(1.2MB)은 이모지 등이 나올 때만 내려받게 둔다.
 * - 글꼴 CSS 가 아직 읽히기 전일 수 있어서, 해당 글꼴 정의가 보일 때까지 짧게 반복해서 확인한다.
 */
const FONT_GATE = `(function(){
  var root = document.documentElement;
  if (!document.fonts || !document.fonts.load) return;
  var revealed = false;
  function reveal() {
    if (revealed) return;
    revealed = true;
    root.classList.remove("fonts-loading");
  }
  root.classList.add("fonts-loading");
  setTimeout(reveal, 2000);
  function watch() {
    if (revealed) return;
    Promise.all([
      document.fonts.load('400 1em "Mona12"', "가A"),
      document.fonts.load('700 1em "Mona12"', "가A")
    ]).then(function (r) {
      if (r[0].length && r[1].length) reveal();
      else setTimeout(watch, 16);
    }, reveal);
  }
  watch();
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 글꼴 미리 받기: 화면을 그리기 전에 내려받기를 시작한다. (Next.js 는 자동으로 해 주지 않는다.)
  // <link> 를 직접 적지 않고 이 함수를 쓰면 React 가 <head> 에 한 번만 넣는다.
  // 작은 글꼴만 미리 받는다. 경로는 fonts-subset.css 와 같아야 재사용된다.
  for (const file of ["kerupu-pixel-regular.woff2", "kerupu-pixel-bold.woff2"]) {
    preload(`/fonts/${file}`, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  }

  return (
    // 스크립트가 <html> 에 클래스를 붙이므로 서버 HTML 과 달라도 경고하지 않게 한다
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: FONT_GATE }} />
      </head>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
