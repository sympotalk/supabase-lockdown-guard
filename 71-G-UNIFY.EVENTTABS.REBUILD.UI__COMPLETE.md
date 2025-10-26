# Phase 71-G.UNIFY.EVENTTABS.REBUILD.UI - Complete

## 목적
행사관리 리스트를 카드형 요약 UI로 재구성하고, SympoHub Blue 테마 기반 단정하고 직관적인 실무형 인터페이스 적용.

## 구현 완료 사항

### ✅ 1. 카드 그리드 레이아웃
- **반응형 그리드**: 
  - Desktop (lg): 3열
  - Tablet (md): 2열
  - Mobile: 1열
- **간격**: gap-5 (20px)

### ✅ 2. 카드 구성요소
각 카드에 다음 정보 표시:
- **행사명**: 18px bold, primary 색상, 2줄 제한
- **상태 뱃지**: 진행중(default) / 예정(outline) / 완료(secondary)
- **일정**: Calendar 아이콘 + yyyy.MM.dd 형식
- **참가자 수**: Users 아이콘 + 숫자
- **담당자**: User 아이콘 + 이름
- **진행률**: Progress bar (0~100%)
- **관리하기 버튼**: 행사 상세로 이동

### ✅ 3. SympoHub Blue 디자인 시스템 적용
- **Primary color**: `hsl(var(--primary))` - SympoBlue
- **Corner radius**: 16px (rounded-2xl)
- **Shadow**: shadow-card → shadow-card-hover
- **Font**: Pretendard, weight 500-600
- **Card padding**: 16px
- **Transition**: 200ms duration

### ✅ 4. 인터랙션
- **Hover 효과**: 
  - 그림자 강화 (shadow-card-hover)
  - 살짝 확대 (scale-[1.02])
  - 버튼 색상 변경 (primary-hover)
- **클릭**: `/admin/events/${event.id}` 이동
- **관리하기 버튼**: 이벤트 전파 방지 (stopPropagation)

### ✅ 5. 데이터 로직
- **SWR 캐시**: agencyScope 변경 시 자동 갱신
- **RLS 필터**: agency_id 기준 스코프 적용
- **진행률 계산**: participants_count 기반 (최대 100명 = 100%)
- **빈 상태 처리**: "첫 행사 등록하기" 버튼 제공

### ✅ 6. 로딩 상태
- 6개의 스켈레톤 카드 표시
- 로딩 완료 후 실제 데이터로 전환

## 변경 파일
- `src/pages/admin/Events.tsx`: 전체 UI 재구성

## 제거된 기능
- 검색 필터 (단순화를 위해 제거)
- 상태 필터 버튼 (단순화를 위해 제거)
- 테이블 뷰 (카드 뷰로 대체)
- 더보기 드롭다운 메뉴 (카드 클릭으로 대체)

## QA 체크리스트

✅ 카드 Hover 시 확대 + 그림자 강조  
✅ 클릭 시 `/admin/events/${event.id}` 이동  
✅ 새 행사 등록 후 자동 반영  
✅ RLS agency_id 필터 정상 작동  
✅ 반응형 UI (1~3열 그리드)  
✅ SympoHub Blue 테마 일관성  
✅ 빈 상태 처리  
✅ 로딩 스켈레톤  

## 로그
```
[71-G.UNIFY.EVENTTABS.REBUILD.UI] Event list rebuilt with SympoHub Blue cards and unified event entry.
```

## 다음 단계
- 행사 상세 페이지 (`/admin/events/${id}`) 구현
- 참가자관리 탭 중심 UX 구축
- 검색/필터 기능 재추가 (필요 시)
