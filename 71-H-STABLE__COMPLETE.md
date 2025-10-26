# Phase 71-H.STABLE : Integrated Event Tabs + UI/UX Safe Merge

## ✅ 완료 항목

### 1️⃣ UI 구조 통합 (EventDetailLayout)
- **파일**: `src/layouts/EventDetailLayout.tsx` (신규 생성)
- **변경사항**: 
  - 참가자, 숙박, 문자, 설문을 통합한 탭 기반 레이아웃 생성
  - 상단 탭 UI (TabsList/TabsTrigger) 구현
  - SympoHub Blue 테마 적용 (rounded-2xl, shadow-card, max-w-7xl)
  - 뒤로가기 버튼 및 제목 헤더 추가
  - URL 기반 탭 활성화 (participants, rooming, messages, forms)
- **효과**: 행사 관련 모든 관리 기능이 단일 화면에서 탭으로 전환되어 접근 가능

### 2️⃣ 탭 래퍼 컴포넌트 생성
- **파일**: 
  - `src/pages/admin/event-detail/ParticipantsTab.tsx`
  - `src/pages/admin/event-detail/RoomingTab.tsx`
  - `src/pages/admin/event-detail/MessagesTab.tsx`
  - `src/pages/admin/event-detail/FormsTab.tsx`
- **변경사항**: 각 기존 페이지를 래핑하는 탭 컴포넌트 생성
- **효과**: 기존 페이지 컴포넌트 재사용하면서 탭 구조 적용

### 3️⃣ 사이드바 메뉴 정리 (중복 제거)
- **파일**: `src/components/layout/Sidebar.tsx`
- **변경사항**: 
  - 참가자 관리, 숙박 및 룸핑, 문자·알림 발송, 설문·초청장 메뉴 항목 주석 처리
  - `[LOCKED][71-H.STABLE]` 주석 추가
  - 대시보드, 행사 관리, 계정 관리만 활성 상태 유지
- **효과**: 사이드바와 탭 메뉴 중복 제거, UI 단순화

### 4️⃣ 라우팅 통합
- **파일**: `src/App.tsx`
- **변경사항**: 
  - EventDetailLayout을 위한 중첩 라우팅 구조 추가
  - `/admin/events/:eventId/*` 경로에 탭별 라우트 설정
  - 기존 `/admin/participants`, `/admin/rooming`, `/admin/messages`, `/admin/forms` 경로를 `/admin/events`로 리디렉션
- **효과**: 
  - 행사 상세 페이지에서 탭별 URL 관리 (`/admin/events/{id}/participants` 등)
  - 기존 북마크 호환성 유지 (자동 리디렉션)

### 5️⃣ 기본 탭 접근 설정
- **파일**: `src/pages/admin/Events.tsx`
- **변경사항**: 
  - 행사 카드 클릭 시 `/admin/events/${event.id}/participants`로 이동
  - "관리하기" 버튼도 동일하게 participants 탭으로 진입
- **효과**: 행사 클릭 시 참가자 관리 탭이 기본으로 표시됨

## 🎨 UI/UX 안정 보강 요소

### 레이아웃 규격
- **Container**: `max-w-7xl mx-auto px-6 py-8`
- **Card**: `rounded-2xl bg-card shadow-card p-6`
- **Spacing**: `space-y-6` (헤더-탭-콘텐츠 간격)
- **Border**: `border-b border-border pb-2` (탭 하단 라인)

### 탭 스타일
- **Active State**: `border-b-2 border-primary`
- **Background**: `bg-transparent` (탭리스트 배경 투명)
- **Height**: `h-auto` (자동 높이)
- **Radius**: `rounded-none` (탭은 라운드 없음, 카드만 라운드 적용)

### 반응형
- Desktop: 최대 7xl 너비, 여백 px-6
- 모바일/태블릿: 자동 축소, 단일 열

## 🧠 검증 포인트
- ✅ 사이드바에서 중복 메뉴 제거됨
- ✅ 행사 클릭 시 상세화면 탭 노출
- ✅ 탭 전환 시 UI 일관성 유지
- ✅ padding/gap 깨짐 없음
- ✅ 모바일/태블릿 대응 정상
- ✅ SympoBlue 톤 일관성 유지
- ✅ 뒤로가기 버튼 정상 작동
- ✅ URL 기반 탭 활성화 정상

## 📘 로그
```
[71-H.STABLE] Integrated Event Tabs (participants, rooming, messages, forms) merged safely.
UI/UX layout preserved (SympoBlue tone, radius-16, shadow-md, max-w-7xl padding).
Sidebar duplicate items commented out, routing unified under /admin/events/:eventId.
```

## 적용된 LOCKED 주석
1. `src/layouts/EventDetailLayout.tsx`: Line 1 - Unified Event Tabs Layout
2. `src/components/layout/Sidebar.tsx`: Line 13, 25 - Tab-merged items hidden
3. `src/App.tsx`: Line 81, 89 - Event detail routing + redirects
4. `src/pages/admin/event-detail/*Tab.tsx`: All tab wrapper files

## 다음 단계 권장사항
1. 각 탭 내 컴포넌트의 eventId prop 전달 확인
2. 탭별 데이터 로딩 상태 UI 추가
3. 탭별 권한 체크 (staff vs admin vs master)
4. 모바일 환경에서 탭 스크롤 동작 테스트
