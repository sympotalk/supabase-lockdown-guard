# Session Management Guide

## 📋 개요

SympoHub의 세션 관리 시스템은 사용자 인증 상태를 유지하고, 탭 복귀 시 자동으로 세션을 복원합니다.

## 🔑 주요 기능

### 1. 지속적인 세션 유지
- 새로고침 시에도 로그인 상태 유지
- localStorage를 통한 토큰 저장
- Supabase Auth의 자동 토큰 갱신

### 2. 탭 복귀 시 자동 세션 복원
- `visibilitychange` 이벤트 감지
- 세션 만료 시 자동 갱신 시도
- 실패 시 로그인 페이지로 안전하게 리디렉션

### 3. UX 중단 방지 모달
- 복원 중: "세션 복원 중입니다..." (로딩 스피너)
- 성공: "세션이 복원되었습니다!" (체크 아이콘)
- 실패: "세션이 만료되었습니다" (경고 아이콘)

## 🛠️ Supabase 설정

세션 자동 복원이 정상 작동하려면 다음 설정이 필요합니다:

### Supabase Dashboard 설정

1. **Authentication → Settings 이동**

2. **Refresh Token Rotation 활성화**
   - `Refresh Token Rotation`: **ON**
   - 토큰이 자동으로 갱신됩니다

3. **JWT Expiry 설정**
   - `JWT expiry`: **3600** (1시간) 이상 권장
   - 더 긴 세션이 필요한 경우 7200(2시간) 또는 그 이상으로 설정

4. **Auto Refresh 허용**
   - `Enable automatic token refresh`: **Checked**

### 환경 변수 확인

`.env` 파일에 다음이 설정되어 있는지 확인:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🏗️ 아키텍처

### 컴포넌트 구조

```
UserProvider (src/context/UserContext.tsx)
  ├─ SessionSyncManager (src/components/auth/SessionSyncManager.tsx)
  │   ├─ visibilitychange 이벤트 리스너
  │   ├─ 세션 복원 로직
  │   └─ 복원 상태 모달
  └─ App Routes
```

### 세션 복원 플로우

```
1. 탭 복귀 (visibilitychange)
   ↓
2. 현재 세션 확인 (getSession)
   ↓
3. 세션 없음?
   ├─ Yes → 복원 시도 (refreshSession)
   │   ├─ 성공 → 세션 복원 완료 (모달 2초 표시)
   │   └─ 실패 → 로그인 페이지로 리디렉션 (2초 후)
   └─ No → 정상 유지
```

## 🔍 로깅

개발 중 다음 로그를 통해 세션 상태를 확인할 수 있습니다:

```
[SessionSync] Tab became visible, checking session...
[SessionSync] No session found, attempting refresh...
[SessionSync] Session restored successfully
[SessionSync] Session is valid
[SessionSync] Skipping on auth page
```

## 🧪 테스트 방법

### 1. 새로고침 테스트
1. 로그인
2. F5 또는 Cmd+R로 새로고침
3. ✅ 로그인 상태 유지 확인

### 2. 탭 복귀 테스트
1. 로그인
2. 다른 탭으로 이동 (10분 이상 대기)
3. 원래 탭으로 복귀
4. ✅ "세션 복원 중..." 모달 확인
5. ✅ 자동 복원 또는 로그인 페이지 이동

### 3. 세션 만료 테스트
1. 로그인
2. Supabase Dashboard에서 JWT expiry를 60초로 설정
3. 60초 대기
4. 탭 복귀 또는 페이지 새로고침
5. ✅ 복원 시도 후 로그인 페이지로 이동

## 🔐 보안 고려사항

### 1. 토큰 저장
- Supabase는 localStorage에 암호화된 토큰 저장
- XSS 공격 방지를 위한 HttpOnly 설정 불가 (SPA 특성상)
- Content Security Policy로 보안 강화 권장

### 2. 세션 만료
- JWT expiry 시간을 너무 길게 설정하지 않기
- Refresh Token Rotation으로 토큰 탈취 위험 최소화

### 3. 민감한 작업
- 중요한 작업(비밀번호 변경 등)은 재인증 요구
- CSRF 토큰 추가 고려

## 📝 문제 해결

### 세션이 자동 복원되지 않아요
1. Supabase Dashboard에서 설정 확인
   - Refresh Token Rotation이 ON인가?
   - JWT expiry가 0이 아닌가?
2. 브라우저 콘솔에서 에러 확인
3. localStorage에 `sb-sigylynftjsczhuzvbax-auth-token` 존재 확인

### 로그인 페이지에서 계속 리디렉션돼요
1. SessionSyncManager가 auth 페이지에서 작동하지 않도록 설정됨
2. `/auth/login` 경로 확인
3. UserContext의 loading 상태 확인

### 모달이 표시되지 않아요
1. framer-motion 설치 확인: `npm list framer-motion`
2. z-index 충돌 확인 (SessionSyncManager는 z-50 사용)
3. AnimatePresence가 정상 작동하는지 확인

## 🚀 배포 시 체크리스트

- [ ] Supabase JWT expiry 설정 (1시간 이상 권장)
- [ ] Refresh Token Rotation ON
- [ ] 환경 변수 설정 (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- [ ] HTTPS 사용 확인
- [ ] Content Security Policy 설정
- [ ] 로그 레벨 조정 (production에서는 최소화)

## 📚 관련 문서

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Session Management](https://supabase.com/docs/guides/auth/sessions)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
