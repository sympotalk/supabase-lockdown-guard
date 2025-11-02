# SympoHub v91 Deployment Guide

## 🎯 배포 전 체크리스트

### 1. Git 브랜치 관리
```bash
# 현재 브랜치 확인
git branch

# release 브랜치 생성
git checkout -b release/v91-final

# 모든 변경사항 커밋 확인
git status

# 태그 생성
git tag -a v91-final -m "Phase 90 QA Lock passed — deploy ready"

# 원격 저장소에 푸시
git push origin release/v91-final --tags
```

### 2. 환경 변수 설정

#### .env.production 파일 생성
```bash
# Supabase 설정
VITE_SUPABASE_URL=https://sigylynftjsczhuzvbax.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZ3lseW5mdGpzY3podXp2YmF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjE5NjEsImV4cCI6MjA3NjE5Nzk2MX0.SPh7VDlubphDOk0gV3jiIUCiSAoe1jAW5KEC_TJWiWs

# 배포 환경 설정
VITE_PHASE_LOCK=90
VITE_DEPLOY_ENV=production

# Storage URL
VITE_STORAGE_URL=https://sigylynftjsczhuzvbax.supabase.co/storage/v1
```

#### 제거할 환경 변수
- `VITE_DEBUG_MODE`
- `VITE_TEST_MODE`
- `VITE_QA_MODE`
- 기타 개발/테스트용 변수

### 3. Supabase 동기화

```bash
# Supabase CLI 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref sigylynftjsczhuzvbax

# 마이그레이션 상태 확인
supabase db diff --linked

# 마이그레이션 적용 (필요한 경우)
supabase db push

# Edge Functions 빌드
supabase functions build

# Edge Functions 배포
supabase functions deploy process_excel_upload
supabase functions deploy backup_participants
supabase functions deploy rollback_participants
```

### 4. Storage 정책 검증

```sql
-- Storage 버킷 확인
SELECT id, name, public FROM storage.buckets;

-- RLS 정책 확인
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd 
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects';

-- QA 테스트 파일 삭제 (Supabase Dashboard에서 수동)
-- Storage > Buckets > 각 버킷 > 테스트 파일 삭제
```

### 5. Auth 설정 확인

#### Supabase Dashboard에서 확인
1. Authentication > Users
   - 테스트 계정 삭제
   - MASTER 계정 1개만 유지 (master@sympohub.com)
   - 필요한 AGENCY 계정만 유지

2. Authentication > URL Configuration
   - Site URL: `https://your-domain.com` (배포 도메인)
   - Redirect URLs 추가:
     - `https://your-domain.com/**`
     - `https://preview.your-domain.com/**` (스테이징)

3. Authentication > Providers
   - Email: 활성화
   - Google: 필요시 설정
   - 기타 Provider: 비활성화

### 6. 빌드 및 테스트

```bash
# 의존성 설치
npm install

# 타입 체크
npm run type-check

# 린팅
npm run lint

# 프로덕션 빌드
npm run build

# 빌드 결과 확인
ls -lh dist/

# 로컬 프리뷰 (선택사항)
npm run preview
```

#### 빌드 성공 기준
- ✅ 0 errors
- ✅ 0 warnings
- ✅ dist/ 폴더 생성됨
- ✅ index.html 존재
- ✅ assets/ 폴더 내 JS/CSS 번들 존재

### 7. 최종 검증

#### A. 로컬 프리뷰 테스트
```bash
npm run preview
# http://localhost:4173 접속
```

#### B. 테스트 항목
- [ ] 로그인 정상 작동
- [ ] 대시보드 데이터 로딩
- [ ] 참가자 목록 표시
- [ ] 참가자 업로드 (AGENCY)
- [ ] 참가자 업로드 Replace (MASTER)
- [ ] Rollback 기능 (MASTER)
- [ ] Excel 내보내기
- [ ] Realtime 동기화
- [ ] 룸핑 화면 표시
- [ ] 메시지 발송 화면 표시

#### C. 브라우저 콘솔 체크
- [ ] 에러 없음
- [ ] 불필요한 console.log 없음
- [ ] Network 요청 정상
- [ ] Supabase Realtime 연결 확인

---

## 🚀 Vercel 배포

### 1. Vercel 프로젝트 생성

```bash
# Vercel CLI 설치
npm i -g vercel

# Vercel 로그인
vercel login

# 프로젝트 초기화
vercel

# 프로덕션 배포
vercel --prod
```

### 2. Vercel Dashboard 설정

1. **Environment Variables**
   - Settings > Environment Variables
   - Production 환경에 .env.production 내용 추가
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_PHASE_LOCK=90`
   - `VITE_DEPLOY_ENV=production`

2. **Build Settings**
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Domain Settings**
   - Domains > Add Domain
   - 커스텀 도메인 추가 (선택사항)
   - DNS 레코드 설정

### 3. 배포 후 확인

1. **Vercel Dashboard**
   - Deployments > 최신 배포 확인
   - Build Logs 확인 (에러 없는지)
   - Function Logs 확인 (필요시)

2. **Production URL 테스트**
   - 배포 URL 접속
   - 위의 "최종 검증 B" 항목 재테스트
   - 모바일에서 접속 테스트

3. **Performance 확인**
   - Chrome DevTools > Lighthouse 실행
   - Performance Score 80+ 목표
   - Accessibility Score 90+ 목표

---

## 🔧 문제 해결

### 빌드 실패 시
```bash
# 캐시 삭제
rm -rf node_modules/.vite
rm -rf dist

# 재설치 및 빌드
npm install
npm run build
```

### Realtime 연결 안됨
1. Supabase Dashboard > Settings > API
2. Realtime 활성화 확인
3. RLS 정책 확인 (participants 테이블)

### Auth 리다이렉트 에러
1. Supabase Dashboard > Authentication > URL Configuration
2. Redirect URLs에 배포 도메인 추가
3. Site URL 확인

### Storage 접근 안됨
1. Supabase Dashboard > Storage > Buckets
2. RLS 정책 확인
3. Public 설정 확인 (필요시)

---

## 📊 모니터링

### Supabase 모니터링
- Dashboard > Logs
  - Database Logs
  - API Logs
  - Auth Logs
  - Storage Logs

### Vercel 모니터링
- Dashboard > Analytics
  - Visitors
  - Page Views
  - Top Pages
- Dashboard > Speed Insights
  - Real User Metrics
  - Core Web Vitals

---

## 🔄 롤백 절차

### Vercel에서 이전 버전으로 롤백
1. Vercel Dashboard > Deployments
2. 이전 배포 선택
3. "Promote to Production" 클릭

### Git에서 롤백
```bash
# 이전 태그로 되돌리기
git checkout v90-previous

# 새 릴리즈 브랜치 생성
git checkout -b release/v91-rollback

# 강제 푸시 (주의!)
git push origin release/v91-rollback --force
```

---

**최종 업데이트**: 2025-11-02  
**담당자**: SympoHub Development Team
