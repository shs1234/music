# music

광고 없이 YouTube 음악을 듣는 개인용 안드로이드 앱입니다. 한국어 전용, 다크 테마 기준(파란 강조색).

## 기능
- 검색(노래·동영상·앨범, YouTube 링크 붙여넣기), 장르, 아티스트, 앨범 둘러보기
- 재생목록, 좋아요, 재생 기록
- 홈 추천 목록 (Google 로그인 필요): 목록마다 4곡씩 묶여 좌우로 넘겨 보고, 목록별로 재생·셔플 재생
  - **빠른 선곡**: YouTube Music Premium 계정
  - **내 믹스**: 무료 계정(한국은 YouTube Music 홈이 Premium 전용). 최근 재생·좋아요 곡 2개를 무작위로 골라 그 곡들의 YouTube 믹스를 섞으므로 새로고침할 때마다 달라짐
  - **나만의 믹스 · 나만을 위한 추천 믹스 · 최신음악 믹스 · 보관 콘텐츠 믹스**: YouTube Music의 개인화 믹스. 홈과 달리 무료 계정에도 내려옴. 믹스 전체(50~65곡)를 받아 새로고침마다 무작위로 24곡을 보여줌
  - 받아온 목록은 폰에 저장해 두고 새로고침(설정 옆 버튼 또는 화면을 아래로 당기기)할 때만 바뀜. 새로고침은 저장해 둔 믹스에서 바로 새 곡을 뽑아 보여주고 뒤에서 최신 믹스를 받아 둠(저장분이 6시간 넘으면 받아온 뒤 보여줌)
- 설정 → 계정: Google 로그인/로그아웃
  - 로그아웃해도 Google 세션은 남겨 두어 다시 로그인할 때 비밀번호 입력 없이 바로 통과
  - '다른 계정으로 바꾸기'는 Google 세션까지 지움
- 재생 화면: 긴 제목은 옆으로 흘러가며 표시, 좋아요·저장 버튼, 위로 밀면 현재 재생목록(내리면 재생 화면으로)
- 화면이 꺼져도 재생, 알림·잠금화면·이어폰/블루투스 버튼 제어. 이어폰이 끊기면 정지

## 구조
- `mobile/` — Capacitor 안드로이드 앱
  - `PlaybackService.java` — 백그라운드 재생, 미디어 알림
  - `LoginActivity.java`, `MusikeAuthPlugin.java` — Google 로그인 WebView, 쿠키 저장/로그아웃
  - `res/drawable/ic_launcher_foreground.xml` — 앱 아이콘(파란 배경 + 흰 음표, 벡터)
- `web/` — 화면(React)과 폰 안에서 도는 백엔드(`web/src/native`)
  - `native/account.ts` — 로그인 쿠키(SAPISIDHASH)로 빠른 선곡·내 믹스·곡별 믹스·YouTube Music 믹스 조회
  - `native/streams.ts` — 폰에서 바로 오디오 주소 받기
  - `stores/picks.ts` — 홈 추천 목록 받아오기·저장·새로고침
  - `components/QuickPicks.tsx`, `components/AccountSection.tsx` — 홈 추천 목록, 설정의 계정
  - `i18n/ko.ts` — 화면 문구
  - `styles.css` — 테마 색상
- `server/src/` — 검색·카탈로그·보관함 로직 (web 이 직접 import)
- `mobile/streaming.json` — 오디오 주소를 받을 YouTube 클라이언트 목록. 앱이 실행 중에 이 저장소의 `main`에서 받아오므로, YouTube가 바뀌어 재생이 안 되면 이 파일만 고쳐 push 하면 앱 업데이트 없이 반영됨

## 빌드
JDK 17+, Android SDK, Node 20+, pnpm 필요.

    pnpm install
    pnpm build                      # 웹 번들 + cap sync
    cd mobile/android && ./gradlew assembleDebug
    adb install -r app/build/outputs/apk/debug/app-debug.apk

앱 ID는 `app.musike.quickpicks`, 홈 화면 이름은 `music`.

## 출처
[Musike](https://github.com/Ernani1234/musike) (MIT, Ernani Neto)에서 시작했습니다. 라이선스는 `LICENSE` 참고.

⚠️ YouTube 비공식 API를 사용하므로 개인 용도로만 쓰세요.
