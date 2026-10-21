# 글꼴 파일

| 파일 | 내용 | 크기 |
| --- | --- | --- |
| `Mona12.woff2`, `Mona12-Bold.woff2` | **원본** Mona12 (TTF 를 WOFF2 로 바꾼 것뿐, 수정 없음) | 각 약 1.2MB |
| `kerupu-pixel-regular.woff2`, `kerupu-pixel-bold.woff2` | **수정본** "Kerupu Pixel": 원본에서 자주 쓰는 글자만 남긴 것 | 각 약 43KB |

웹사이트는 평소에 작은 수정본만 내려받고, 이모지·가나·한자 같은 글자가 화면에 나올 때만 원본을 내려받는다.
설정은 `src/styles/fonts-subset.css`(자동 생성), 만드는 방법은 `scripts/build-font-subset.mjs` 맨 위 설명을 본다.

## 수정본에 대하여 (SIL Open Font License 1.1)

- **원본:** Mona12, Copyright (c) 2025, Monad ABXY, Reserved Font Name "Mona". 라이선스는 `../licenses/mona.txt`.
- **수정 내용:** 글자를 일부만 남겼다(삭제). 영문, 숫자, 기호, 한글 2,350자(KS X 1001), 한글 자모 등 약 2,800자.
  컬러 글리프(COLR/CPAL)와 이모지, 가나, 한자는 담지 않았다. 남긴 글자의 모양과 폭, 줄 높이는 원본과 같다.
- **이름:** OFL 3조에 따라 수정본은 "Mona"를 글꼴 이름으로 쓸 수 없어서 파일 안의 이름을 "Kerupu Pixel" 로 바꿨다.
  저작권 문구(name ID 0)는 그대로이고, 라이선스 안내(ID 13)와 주소(ID 14)를 넣었다.
- **조건:** 글꼴 파일을 단독으로 팔지 않는다. 수정본도 OFL 1.1 을 따르며, 라이선스 문서는 `../licenses/` 에 함께 둔다.
- 원본이 이어받은 글꼴들(Ark Pixel, K8x12, M+, Noto Emoji)의 라이선스도 `../licenses/` 에 있다.

이 해석은 개발자 판단이며 법률 자문이 아니다. 배포 전에 한 번 더 확인한다.
