# Korebaps Stats Calculator

코레밥스(Korebaps) 경기 기록을 입력하고 자동으로 타율/출루율/장타율 및 투구 ERA를 계산하는 리액트 대시보드입니다. 메인 모드에서는 요약/테이블을, 관리자 모드에서는 기록 입력과 CSV 다운로드를 제공합니다.
01.20.2026

Made By:
Junsu Yoon(17) - PM, Frontend
Taerim Kim (66) - Backend, DB
Junhyung Park - UX, UI

## 주요 기능

- 타격 기록 입력 및 자동 계산(AVG, OBP, SLG, Score)
- 투구 기록 입력 및 자동 계산(ERA, Total Point)
- MVP 표시 및 포인트 합산
- 경기 요약(타격/투구 Top 3)
- CSV 다운로드
- 메인/관리자 모드 전환

## 실행 방법

```bash
npm install
npm start
```

- 기본 주소: http://localhost:3000
- 관리자 모드: http://localhost:3000/?admin=1

## 폴더 구조

```
my-app/
  src/
    App.tsx            # 메인/관리자 모드 라우팅
    admin.tsx          # 관리자 대시보드(입력, 요약, CSV)
    components/
      BattingRecordForm.js
      PitchingRecordForm.js
      RecordSummary.js
      PointTable.js
      Header.tsx
      Footer.tsx
```

## 스크립트

- `npm start`: 개발 서버 실행
- `npm run build`: 프로덕션 빌드 생성
- `npm test`: 테스트 실행

## 배포 방법

### 정적 호스팅(권장)

1. 빌드 생성

```bash
npm run build
```

2. `build/` 폴더를 정적 호스팅 서비스에 업로드

- **Vercel**: 프로젝트 Import → Framework: Create React App → `npm run build`
- **Netlify**: Build Command `npm run build`, Publish Directory `build`
- **GitHub Pages**: `build/` 폴더를 `gh-pages` 브랜치로 배포

### 로컬에서 빌드 미리보기

```bash
npm install -g serve
serve -s build
```

## 백엔드 실행 방법 (server)

서버가 정상 실행되면 https://statcalculator-backend.onrender.com 에서 동작합니다.

## 참고

- 데이터는 현재 로컬 상태에 저장됩니다(추가 백엔드 연동 필요 시 server API 확장).
- CSV는 UTF-8 BOM을 포함해 엑셀에서 바로 열 수 있습니다.