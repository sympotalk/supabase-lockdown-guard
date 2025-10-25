# SympoHub Business → Pro 모듈 전이 가이드

## 📋 개요
이 문서는 Business 환경(sympohub-buddy)에서 제작된 UI/UX 모듈을
Pro 환경(supabase-lockdown-guard)으로 이식하기 위한 가이드입니다.

## 🎯 전이 대상 모듈

### 1️⃣ Components
```
/src/components/
├── auth/
│   ├── LoginForm.tsx
│   └── SignupForm.tsx
├── account/
│   ├── AccountLayout.tsx
│   ├── AccountSidebar.tsx
│   ├── AnimatedAccountSidebar.tsx
│   └── SidebarItem.tsx
├── agency/
│   ├── AgencyLayout.tsx
│   ├── AgencySidebar.tsx
│   ├── EditProfileModal.tsx
│   ├── PasswordModal.tsx
│   ├── ProfileCard.tsx
│   └── SettingsCard.tsx
├── ui/ (전체)
└── pd/
    ├── FocusTrap.tsx
    ├── LiveRegion.tsx
    ├── Spinner.tsx
    └── LoadingSkeleton.tsx
```

### 2️⃣ Pages
```
/src/pages/
├── auth/
│   ├── Login.tsx
│   └── Signup.tsx
└── agency/
    ├── Profile.tsx
    ├── Settings.tsx
    ├── Security.tsx
    └── Notifications.tsx
```

### 3️⃣ Libraries & Utilities
```
/src/lib/
├── pd/
│   ├── state.ts
│   ├── motion.ts
│   └── messages.ts
└── utils.ts
```

### 4️⃣ Documentation
```
/docs/
└── pd/
    ├── PrecisionSpecTemplate.md
    └── QA-Checklist.md
```

## 🔄 Business 환경 (GitHub 연결 절차)

### Step 1: GitHub 연결
1. Lovable 프로젝트에서 우측 상단 **GitHub 아이콘** 클릭
2. **Connect to GitHub** 선택
3. Repository: `sympohub-buddy` 선택
4. Branch: `ui-modules` 입력 (자동 생성됨)
5. **Connect** 클릭

### Step 2: Push 실행
1. 모든 변경사항이 자동으로 commit됨
2. Commit message: "Phase 3.3.2.5-GH — Exported Business UI Modules for Pro Integration"
3. Branch `ui-modules`로 자동 push

### Step 3: 검증
GitHub Repository 확인:
- URL: `https://github.com/[your-username]/sympohub-buddy`
- Branch: `ui-modules`
- 폴더 구조: `src/components/`, `src/pages/`, `src/lib/`, `docs/`

## 🚀 Pro 환경 (Import 절차)

### Step 1: Pro 프로젝트 열기
- 프로젝트: `supabase-lockdown-guard`
- Supabase 연동 완료 상태 확인

### Step 2: Import Source 설정
```bash
Source Repository: sympohub-buddy
Source Branch: ui-modules
Target Path: /src/
Merge Policy: Replace UI modules only (keep existing Supabase code)
```

### Step 3: Import 실행
1. Lovable Pro 프로젝트에서 **Import from GitHub** 선택
2. 위 설정값 입력
3. **Import** 클릭
4. Commit message: "Phase 3.3.2.5-GH — Imported Business UI Modules"

### Step 4: 통합 작업
Pro 환경에서 수정 필요한 부분:

#### 4.1 Supabase Client 연결
```typescript
// Business (mock)
const mockSupabase = { /* ... */ };

// Pro (실제 연동)
import { supabase } from "@/integrations/supabase/client";
```

#### 4.2 Auth Context 연결
```typescript
// Business
const mockUserRole = "AGENCY";

// Pro
const { user, role } = useAuth();
```

#### 4.3 API 호출 교체
```typescript
// Business
setTimeout(() => { /* mock success */ }, 1000);

// Pro
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', user.id);
```

## ✅ 검증 체크리스트

### Business 환경 (Push 후)
- [ ] GitHub Repository `sympohub-buddy` 생성 확인
- [ ] Branch `ui-modules` 생성 확인
- [ ] 모든 컴포넌트 파일 commit 확인
- [ ] Precision Design 문서 포함 확인

### Pro 환경 (Import 후)
- [ ] `/auth/login`, `/auth/signup` 정상 렌더링
- [ ] `/agency/profile`, `/agency/settings` 정상 렌더링
- [ ] Sidebar 애니메이션 작동
- [ ] Modal/Toast 정상 동작
- [ ] Precision Design Layer 컴포넌트 로드
- [ ] Supabase 연동 코드 정상 작동

## 🧠 주의사항

### Business 환경
- ✅ Mock 데이터 사용 (실제 API 호출 없음)
- ✅ UI/UX 완성도 검증
- ✅ Precision Design 표준 준수
- ⚠️ Supabase 코드 포함하지 않음

### Pro 환경
- ✅ Supabase 실시간 연동
- ✅ Auth Context 기반 인증
- ✅ RLS 정책 적용
- ⚠️ Business UI 모듈 덮어쓰기 주의

## 📌 다음 단계

이 전이 완료 후:
- **Phase 3.3.3-Pro**: Invite 기반 가입 및 에이전시 자동 고정 연동
- **Phase 3.4-Pro**: 실시간 데이터 동기화 및 권한 관리
- **Phase 3.5-Pro**: Production 배포 및 모니터링

## 🔗 관련 문서
- [Precision Design System](./pd/PrecisionSpecTemplate.md)
- [QA Checklist](./pd/QA-Checklist.md)
- Lovable GitHub Integration: https://docs.lovable.dev/features/github

---

**작성일**: 2025-01-XX  
**버전**: Phase 3.3.2.5-GH  
**상태**: Business → Pro 전이 준비 완료
