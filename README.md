# Musike+

광고 없이 YouTube 음악을 듣는 개인용 안드로이드 앱입니다. 한국어 전용.

- 검색, 장르, 아티스트, 앨범, 재생목록, 좋아요, 재생 기록
- YouTube Music 로그인 → 홈 상단에 **빠른 선곡**(Premium 계정) 또는 **내 믹스**
  - 내 믹스는 최근 재생·좋아요 곡의 YouTube 믹스를 섞어 새로고침할 때마다 달라짐
- 화면이 꺼져도 재생, 알림·잠금화면·이어폰 버튼 제어

## 구조
- `mobile/` — Capacitor 안드로이드 앱 (재생 서비스, 로그인 `LoginActivity`·`MusikeAuthPlugin`)
- `web/` — 화면(React)과 폰 안에서 도는 백엔드(`web/src/native`)
  - `web/src/native/account.ts` — 로그인 쿠키(SAPISIDHASH)로 빠른 선곡/내 믹스 조회
  - `web/src/native/streams.ts` — 폰에서 바로 오디오 주소 받기
- `server/src/` — 검색·카탈로그·보관함 로직 (web 이 직접 import)
- `mobile/streaming.json` — 오디오 주소를 받을 YouTube 클라이언트 목록. 앱이 실행 중에 이 저장소의 `main`에서 받아오므로, YouTube가 바뀌면 이 파일만 고쳐 push 하면 앱 업데이트 없이 반영됨

## 빌드
    pnpm install
    pnpm build                      # 웹 번들 + cap sync
    cd mobile/android && ./gradlew assembleDebug
    adb install -r app/build/outputs/apk/debug/app-debug.apk

## 출처
[Musike](https://github.com/Ernani1234/musike) (MIT, Ernani Neto)에서 시작했습니다. 라이선스는 `LICENSE` 참고.

⚠️ YouTube 비공식 API를 사용하므로 개인 용도로만 쓰세요.
