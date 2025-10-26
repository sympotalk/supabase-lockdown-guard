# Phase 71-H5.UNIFIED-DETAIL.LAYOUT & TAB-SYNC.STABLE — COMPLETE ✅

## 목적
행사 상세 페이지를 단일 레이아웃으로 통합하고, 탭 전환을 URL 라우팅이 아닌 로컬 상태로 처리하여 상태 유지 및 성능 향상.

## 구현 완료 항목

### 1️⃣ 상세 레이아웃 구조 변경
**파일**: `src/layouts/EventDetailLayout.tsx`
- ✅ URL 기반 라우팅 제거 (`useLocation`, `Outlet` 제거)
- ✅ 로컬 상태 기반 탭 전환 (`useState` + `TabsContent`)
- ✅ localStorage를 통한 탭 선택 지속성 (`event_detail_tab_${eventId}`)
- ✅ 행사 데이터 로드 및 표시 (이름, 일정)
- ✅ 로딩 및 에러 상태 처리

### 2️⃣ 라우팅 단순화
**파일**: `src/App.tsx`
- ✅ 중첩 라우트 제거 (participants, rooming, messages, forms)
- ✅ 단일 라우트로 통합: `/admin/events/:eventId`

### 3️⃣ 행사 리스트 연결
**파일**: `src/pages/admin/Events.tsx`
- ✅ 카드 클릭 시 `/admin/events/${event.id}`로 이동
- ✅ 이전 `/participants` 경로 제거

### 4️⃣ 탭 구성 및 컴포넌트
- ✅ **참가자 관리** (`ParticipantsTab`)
- ✅ **숙박 및 룸핑** (`RoomingTab`)
- ✅ **문자·알림 발송** (`MessagesTab`)
- ✅ **설문·초청장** (`FormsTab`)

## UI/UX 정렬 기준

| 요소 | 정렬/톤 | 설명 |
|------|---------|------|
| 상단 Title | 좌측 정렬 | 행사명 (text-primary) + 일정 (text-muted-foreground) |
| 탭 리스트 | 하단 border + active:border-primary | 선택 명확화 |
| 탭 컨텐츠 | 통일 여백 (p-6) | 패널 간 통일감 |
| 배경 | white card + shadow-card | 기존 스타일 유지 |

## 검증 완료

| 항목 | 상태 | 기대 결과 |
|------|------|----------|
| 행사 카드 클릭 | ✅ | 상세 페이지 열림 |
| 탭 전환 | ✅ | 라우팅 변경 없이 즉시 변경 |
| 참가자/숙박/설문 데이터 | ✅ | 정상 표시 |
| UI 톤 | ✅ | SympoBlue + 시맨틱 토큰 일관 |
| 상태 복원 | ✅ | 마지막 탭 localStorage 기억 |

## 기술 스택
- **상태 관리**: React useState + localStorage
- **탭 컴포넌트**: Radix UI Tabs
- **데이터 페칭**: Supabase + useEffect
- **라우팅**: React Router (단순화)

## 로그 문구
```
[71-H5.UNIFIED-DETAIL.LAYOUT & TAB-SYNC.STABLE]
Event detail tabs integrated into unified layout with state-based switching.
Participants, Rooming, Messages, Forms panels fully synchronized.
localStorage persistence enabled for seamless UX.
```

## 다음 단계
- Phase 71-H6: 참가자 등록 및 수정 플로우 개선
- Phase 71-H7: 실시간 통계 갱신 최적화
