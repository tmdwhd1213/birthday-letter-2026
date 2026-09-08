# 구러이의 서른세 번째 생일 💌

모바일 청첩장 스타일의 생일 초대장 페이지입니다. 빌드 없이 정적 파일(HTML/CSS/JS)만으로 동작합니다.

## 구성
- `index.html` / `style.css` / `app.js` — 페이지 본체
- `assets/main.webp` — 메인 일러스트
- `assets/photos/p01~p24.jpg` — 모바일용으로 압축한 사진 (원본은 `image/`에 있고 git에는 올리지 않음)
- `assets/og.jpg` — 카카오톡/링크 미리보기 이미지
- `.github/workflows/deploy.yml` — GitHub Pages 자동 배포

## 흐름
1. 봉투 탭 → 초대장 카드 등장
2. `예쓰` / `노우` 선택 (노우는 도망감. 9번 시도하면 예쓰로 변함)
3. 예쓰 → 히어로(함께한 날 카운터) → 레터링 케이크(“33” 숫자초, 촛불 하나씩 끄기) → 랜덤 폴라로이드 갤러리 → 편지

함께한 날은 2024-05-23(만난 날 = 1일째)부터 한국 시간 기준으로 열 때마다 자동 계산됩니다.

## 배포 (GitHub Pages + GitHub Actions)
1. GitHub에서 새 저장소를 만든다 (예: `birthday-33`). Public 이어야 무료 Pages 사용 가능.
2. 이 폴더에서:
   ```bash
   git remote add origin https://github.com/<USERNAME>/<REPO>.git
   git push -u origin main
   ```
3. 저장소 **Settings → Pages → Build and deployment → Source** 를 **GitHub Actions** 로 선택.
4. Actions 탭에서 "Deploy to GitHub Pages" 워크플로가 끝나면
   `https://<USERNAME>.github.io/<REPO>/` 에서 열립니다. 이후 `main`에 push할 때마다 자동 재배포.
5. 카카오톡 미리보기용으로 `index.html`의 `og:image` 주소를 실제 주소
   (`https://<USERNAME>.github.io/<REPO>/assets/og.jpg`)로 바꿔서 한 번 더 push.

## 로컬에서 보기
```bash
python -m http.server 5173
```
후 `http://localhost:5173` 접속 (브라우저 개발자도구의 모바일 모드 권장).
