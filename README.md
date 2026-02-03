# Korebaps Stats Calculator

코레밥스(Korebaps) 야구팀을 위한 종합 통계 관리 시스템입니다. 타격 및 투구 기록을 입력하고 자동으로 선수별/시즌별 통계를 계산하며, 관리자 대시보드를 통해 효율적인 데이터 관리를 제공합니다.

## 아키텍처

**Full-Stack Web Application**
- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + MySQL
- **Deployment**: Docker + Google Cloud Run
- **Database**: MySQL (외부 호스팅)

## 주요 기능

### 통계 계산
- **타격 통계**: AVG (타율), OBP (출루율), SLG (장타율), OPS, WAR 계산
- **투구 통계**: ERA (방어율), WHIP, 탈삼진, 이닝 등 투수 지표
- **선수 포인트 시스템**: MVP 선정 및 포인트 합산
- **시즌별 통계**: 다중 시즌 데이터 관리 및 비교

### 사용자 모드
- **메인 모드**: 선수 통계 조회, 순위표, 경기 요약
- **관리자 모드**: 기록 입력, 수정, CSV 다운로드, 시즌 관리

### UI/UX
- **반응형 디자인**: 모바일 및 데스크톱 지원
- **모던 인터페이스**: Lucide React 아이콘 + Tailwind CSS
- **실시간 데이터**: 자동 통계 업데이트

## 실행 방법

### 개발 환경

```bash
# 프론트엔드 설치 및 실행
cd my-app
npm install
npm start

# 백엔드 설치 및 실행
cd server
npm install
npm start
```

- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:4000
- **관리자 모드**: http://localhost:3000/?admin=1

### Docker 배포

```bash
# Docker 이미지 빌드 및 실행
docker build -t korebaps-app .
docker run -p 4000:4000 korebaps-app
```

## 프로젝트 구조

```
korebaps-app/
├── my-app/                    # React 프론트엔드
│   ├── src/
│   │   ├── components/        # UI 컴포넌트
│   │   │   ├── BattingRecordForm.js
│   │   │   ├── PitchingRecordForm.js
│   │   │   ├── RecordSummary.js
│   │   │   ├── PointTable.js
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   ├── pages/            # 페이지 컴포넌트
│   │   ├── App.tsx           # 메인 앱 컴포넌트
│   │   ├── admin.tsx         # 관리자 대시보드
│   │   └── Videos.tsx        # 비디오 관리
│   ├── public/               # 정적 assets
│   └── package.json
├── server/                   # Node.js 백엔드
│   ├── index.js             # Express 서버
│   └── package.json
├── database/                # 데이터베이스 설정
├── main.tsx                # 메인 애플리케이션 진입점
├── Dockerfile              # Docker 설정
├── nginx.conf              # Nginx 설정
└── cloudbuild.yaml         # Google Cloud Build 설정
```

## 기술 스택

### Frontend
- **React 19.2.3** - UI 라이브러리
- **TypeScript** - 타입 안정성
- **Tailwind CSS 3.4.17** - 스타일링
- **Lucide React** - 아이콘 라이브러리
- **React Testing Library** - 테스팅

### Backend
- **Node.js 18** - 런타임
- **Express 4.19.2** - 웹 프레임워크
- **MySQL2 3.11.3** - 데이터베이스 드라이버
- **CORS** - 교차 출처 리소스 공유
- **dotenv** - 환경 변수 관리

### DevOps
- **Docker** - 컨테이너화
- **Google Cloud Run** - 클라우드 배포
- **Nginx** - 웹 서버

## 배포

### 프로덕션 환경
- **앱 URL**: https://korebaps-app-335189014297.us-east4.run.app
- **API 엔드포인트**: 동일 서버에서 제공

### 배포 과정
1. 코드 변경 시 자동으로 Google Cloud Build 트리거
2. Docker 이미지 빌드 및 Cloud Run에 배포
3. 정적 파일은 Nginx를 통해 서빙

## 데이터 관리

### 지원되는 데이터 형식
- **CSV 가져오기/내보내기**: UTF-8 BOM 포함 (엑셀 호환)
- **실시간 데이터 동기화**: 프론트엔드-백엔드 연동
- **데이터 유효성 검사**: 입력값 자동 검증

### 통계 계산 공식
- **AVG** = 안타 / 타수
- **OBP** = (안타 + 볼넷 + 몸에 맞는 공) / 타석
- **SLG** = (1루타 + 2×2루타 + 3×3루타 + 4×홈런) / 타수
- **OPS** = OBP + SLG
- **ERA** = (자책점 × 9) / 이닝

## 팀 정보

**Made By:**
- Junsu Yoon(17) - PM, Frontend
- Taerim Kim (66) - Backend, DB  
- Junhyung Park - UX, UI

## 라이선스

ISC License

## 기여

버그 리포트 및 기능 요청은 GitHub Issues를 통해 제출해주세요.