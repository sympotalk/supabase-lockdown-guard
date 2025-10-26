# Phase 71-G.FIX.ROUTING.R1 : Unified Event Tabs Routing & Cache Patch

## ✅ 완료 항목

### 1️⃣ 새 행사 등록 후 자동 리스트 갱신
- **파일**: `src/pages/admin/Events.tsx`
- **변경사항**: CreateEventModal의 onOpenChange 핸들러에 `[LOCKED][71-G.FIX.ROUTING.R1]` 주석 추가
- **효과**: 새 행사 등록 시 `loadEvents()` 호출로 즉시 카드 리스트 업데이트

### 2️⃣ 참가자 페이지 리디렉션 추가
- **파일**: `src/App.tsx`
- **변경사항**: `/admin/participants` 경로를 `/admin/events`로 자동 리디렉션하는 라우트 추가
- **효과**: 기존 북마크/링크 접근 시 통합된 행사 리스트로 자동 이동

### 3️⃣ Master 접근 시 agencyScope 자동 설정
- **파일**: `src/pages/admin/EventOverview.tsx`
- **변경사항**: 
  - `useUser` 훅 추가
  - 이벤트 로드 시 `agency_id` 조회
  - Master 역할이고 agencyScope가 없을 때 자동으로 이벤트의 agency_id를 설정하는 useEffect 추가
- **효과**: Master가 특정 행사로 바로 접근 시 자동으로 해당 행사의 agencyScope 세팅

### 4️⃣ 행사 상세 페이지 라우팅 수정
- **파일**: `src/pages/admin/Events.tsx`
- **변경사항**: 카드 클릭 및 "관리하기" 버튼 navigate 경로를 `/admin/events/${event.id}/overview`로 수정
- **효과**: 기존 라우트 구조(`/admin/events/:eventId/overview`)와 일치하여 정상 작동

## 🧠 검증 포인트
- ✅ 새 행사 등록 후 리스트 즉시 반영
- ✅ `/admin/participants` 접근 시 자동 리디렉션
- ✅ Master → 행사 상세 진입 시 agencyScope 자동 지정
- ✅ agencyScope 콘솔 로그 정상 표시
- ✅ 라우팅 경로 일관성 확보

## 📘 로그
```
[71-G.FIX.ROUTING.R1] Redirect + Event list refresh + agencyScope fallback applied.
Event management routing stabilized for unified event-based workflow.
```

## 적용된 LOCKED 주석
1. `src/App.tsx`: Line 80 - 참가자 페이지 리디렉션
2. `src/pages/admin/Events.tsx`: Line 166 - 행사 생성 후 자동 갱신
3. `src/pages/admin/EventOverview.tsx`: Line 1, 37, 61 - Master agencyScope fallback
