# 🕹️ PLAYHUB - Retro Arcade Classic Games

웹 브라우저 및 모바일 환경에서 즐길 수 있는 HTML5 Canvas 기반 레트로 8-Bit 아케이드 게임 플랫폼입니다.

---

## 🌐 라이브 배포 주소
- **Vercel 프로덕션**: [https://classic-game-delta.vercel.app](https://classic-game-delta.vercel.app)
- **GitHub Pages**: [https://hacks0921.github.io/classic-game/](https://hacks0921.github.io/classic-game/)

---

## 🎮 제공 게임 4종

### 1. 👾 Space Invaders (스페이스 인베이더)
- **장르**: 클래식 슈팅
- **조작**: 화면 손가락 터치 드래그 / D-Pad 좌우 이동 / FIRE 버튼 사격
- **설명**: 최상단 4행 40마리의 인베이더 침략에 맞서 레이저 빔으로 격추하고 점수를 획득하세요.

### 2. 🧩 Tetris Style (테트리스 스타일)
- **장르**: 퍼즐
- **조작**: D-Pad / 스와이프 이동 및 하강 / ROTATE 버튼 블록 회전
- **설명**: 7가지 모양의 테트로미노 블록을 정교하게 쌓고 라인을 완성하여 클리어하세요.

### 3. 🔴 Brick Breaker (벽돌 깨기)
- **장르**: 아케이드 액션
- **조작**: 손가락 드래그 / D-Pad 패들 이동
- **설명**: 공의 반사각을 이용해 상단의 컬러 벽돌을 깨뜨리고 점수를 경신하세요.

### 4. 🐍 Snake Retro (스네이크 레트로)
- **장르**: 레트로 클래식
- **조작**: 손가락 스와이프(Up/Down/Left/Right) / D-Pad 방향키
- **설명**: 먹이를 먹을 때마다 길어지는 뱀을 조종하며 자기 자신과의 충돌을 피하세요.

---

## 🚀 주요 기술 및 기능
- **HTML5 Canvas 2D Engine**: 외부 프레임워크 없이 순수 JavaScript와 캔버스로 구현된 60FPS 게임 엔진
- **Web Audio API Sound Synthesizer**: 8-bit 오리지널 사운드 주파수 합성 기술 적용 (코인 sound, 점프 sound, 게임 오버 sound)
- **Mobile First Touch Controls**: 스마트폰 캔버스 직접 터치 드래그(Touch Drag Tracking) 및 손가락 스와이프(Swipe) 조작 지원
- **Responsive Arcade UI**: 모바일 풀스크린 및 PC 팝업 분기 처리, CRT 스캔라인 필터 적용
- **CI/CD Deployment**: GitHub Actions 및 Vercel CLI 자동 빌드 & 배포 파이프라인 연동

---

## 💻 실행 및 설치 방법

### 로컬 실행
별도의 빌드 과정 없이 정적 웹 서버를 통해 실행할 수 있습니다.

```bash
# 저장소 클론
git clone https://github.com/hacks0921/classic-game.git

# 프로젝트 디렉토리 이동
cd classic-game

# 로컬 개발 서버 구동 (Python 3 예시)
python -m http.server 8080
```

구동 후 브라우저에서 `http://localhost:8080` 으로 접속하세요.

---

## 🛠️ 기술 스택
- **Frontend**: HTML5, Vanilla JavaScript (ES6+), Tailwind CSS
- **Audio**: Web Audio API (OscillatorNode, GainNode)
- **Deployment**: GitHub Pages, Vercel
