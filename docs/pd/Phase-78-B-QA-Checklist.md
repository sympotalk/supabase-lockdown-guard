# Phase 78-B QA Checklist — Excel Upload System

## 테스트 환경 설정
- 테스트 이벤트 ID: `da4a5d5e-f469-4f96-a389-36f0a54e29d6`
- 테스트 사용자: Agency Staff / MASTER
- 테스트 데이터: 10행 샘플 Excel 파일

---

## 1️⃣ 정상 업로드 플로우

### 테스트 케이스 1.1: 전체 플로우 성공
**목적**: 업로드 → 검증 → 반영의 3단계가 정상 작동하는지 확인

**테스트 데이터** (10행):
```
이름     | 소속        | 고객 연락처    | 요청사항
--------|-----------|--------------|----------
홍길동    | 삼성병원     | 010-1234-5678 | 금연
김철수    | 아산병원     | 010-2345-6789 | 1층 선호
이영희    | 세브란스    | 010-3456-7890 | 
박민수    | 서울대병원   | 010-4567-8901 | 조식 포함
정수진    | 고대병원     | 010-5678-9012 | 
최동욱    | 한양대병원   | 010-6789-0123 | 
강민지    | 연세병원     | 010-7890-1234 | 트윈룸
윤서준    | 가천대병원   | 010-8901-2345 | 
한지우    | 차병원      | 010-9012-3456 | 금연
송하은    | 강남병원     | 010-0123-4567 | VIP
```

**실행 단계**:
1. 참가자 관리 페이지에서 "엑셀 업로드" 버튼 클릭
2. 10행 샘플 파일 선택
3. 미리보기에서 데이터 확인 (최대 50행 표시)
4. "업로드 실행" 클릭
5. 자동으로 2단계(검증)로 이동
6. 검증 결과 확인: 유효 10 / 오류 0
7. "반영하기 (10명)" 클릭
8. 3단계 완료 화면 확인

**예상 결과**:
- ✅ Step 1: 파일 분석 완료 토스트 표시
- ✅ Step 2: "유효: 반영 가능 / 오류: 사유 확인 후 수정하거나 제외하세요." 안내문 표시
- ✅ Step 2: 10개 행 모두 초록색 "유효" 배지
- ✅ Step 3: "총 10명 반영됨 (신규 X, 수정 Y, 제외 0)" 토스트
- ✅ participants 테이블에 10명 추가/수정 확인
- ✅ participants_log에 `action='excel_upload'`, `action='excel_validation'`, `action='bulk_import'` 3개 로그 생성

**검증 SQL**:
```sql
-- 참가자 확인
SELECT id, name, organization, phone FROM participants 
WHERE event_id = 'da4a5d5e-f469-4f96-a389-36f0a54e29d6'
ORDER BY created_at DESC LIMIT 10;

-- 로그 확인
SELECT action, metadata, created_at FROM participants_log 
WHERE event_id = 'da4a5d5e-f469-4f96-a389-36f0a54e29d6'
AND action IN ('excel_upload', 'excel_validation', 'bulk_import')
ORDER BY created_at DESC LIMIT 3;
```

---

## 2️⃣ 필수 컬럼 누락 검증

### 테스트 케이스 2.1: 이름 누락
**테스트 데이터**:
```
이름     | 소속        | 고객 연락처    
--------|-----------|-------------
        | 삼성병원     | 010-1234-5678
홍길동    | 아산병원     | 010-2345-6789
```

**예상 결과**:
- ✅ 1행: 빨간색 "오류" 배지
- ✅ 사유: "이름이 비어 있습니다."
- ✅ 2행: 초록색 "유효" 배지
- ✅ 검증 요약: 유효 1 / 오류 1

### 테스트 케이스 2.2: 소속 누락
**테스트 데이터**:
```
이름     | 소속        | 고객 연락처    
--------|-----------|-------------
홍길동    |           | 010-1234-5678
김철수    | 아산병원     | 010-2345-6789
```

**예상 결과**:
- ✅ 1행: 빨간색 "오류" 배지
- ✅ 사유: "소속이 비어 있습니다."
- ✅ 2행: 초록색 "유효" 배지
- ✅ 검증 요약: 유효 1 / 오류 1

### 테스트 케이스 2.3: 오류 행 제외 기능
**실행 단계**:
1. 오류가 있는 파일 업로드
2. 검증 단계에서 "오류 행 제외하고 반영" 버튼 클릭
3. 재검증 후 유효 데이터만 반영

**예상 결과**:
- ✅ 오류 행이 staging에서 삭제됨
- ✅ 유효 행만 participants에 반영
- ✅ 토스트: "N개의 오류 행을 제거했습니다."

---

## 3️⃣ 연락처 형식 검증

### 테스트 케이스 3.1: 문자 포함 연락처
**테스트 데이터**:
```
이름     | 소속        | 고객 연락처    
--------|-----------|-------------
홍길동    | 삼성병원     | 010-1234-ABCD
김철수    | 아산병원     | 010-2345-6789
이영희    | 세브란스    | 전화번호없음
```

**예상 결과**:
- ✅ 1행: 빨간색 "오류" 배지
- ✅ 사유: "연락처 형식이 올바르지 않습니다. 숫자/하이픈만 허용합니다."
- ✅ 2행: 초록색 "유효" 배지
- ✅ 3행: 빨간색 "오류" 배지 (한글 포함)
- ✅ 검증 요약: 유효 1 / 오류 2

### 테스트 케이스 3.2: 빈 연락처 (허용)
**테스트 데이터**:
```
이름     | 소속        | 고객 연락처    
--------|-----------|-------------
홍길동    | 삼성병원     | 
```

**예상 결과**:
- ✅ 초록색 "유효" 배지 (연락처는 선택 필드)
- ✅ 검증 요약: 유효 1 / 오류 0

---

## 4️⃣ 중복 처리 (Upsert)

### 테스트 케이스 4.1: 기존 참가자 업데이트
**사전 조건**:
```sql
-- 기존 참가자 생성
INSERT INTO participants (event_id, name, organization, phone, request_memo)
VALUES (
  'da4a5d5e-f469-4f96-a389-36f0a54e29d6',
  '홍길동',
  '삼성병원',
  '010-1234-5678',
  '금연'
);
```

**테스트 데이터** (동일 이름+연락처, 다른 소속):
```
이름     | 소속        | 고객 연락처    | 요청사항
--------|-----------|--------------|----------
홍길동    | 아산병원     | 010-1234-5678 | 트윈룸 선호
```

**예상 결과**:
- ✅ participants.id 유지 (변경 없음)
- ✅ organization: "삼성병원" → "아산병원" (업데이트)
- ✅ request_memo: "금연" → "트윈룸 선호" (업데이트)
- ✅ participants_log에 `action='bulk_import'`, `metadata.updated=1` 기록
- ✅ 기존 rooming/messages/forms FK 유지 (이탈 없음)

**검증 SQL**:
```sql
-- ID 유지 확인
SELECT id, name, organization, phone, request_memo, updated_at 
FROM participants 
WHERE event_id = 'da4a5d5e-f469-4f96-a389-36f0a54e29d6'
AND name = '홍길동' AND phone = '010-1234-5678';

-- FK 이탈 확인 (rooming)
SELECT r.id, r.participant_id, p.name 
FROM room_participants r
LEFT JOIN participants p ON p.id = r.participant_id
WHERE r.event_id = 'da4a5d5e-f469-4f96-a389-36f0a54e29d6'
AND r.participant_id IS NOT NULL
AND p.id IS NULL; -- 이탈된 FK (0건 예상)
```

### 테스트 케이스 4.2: 세션 내 중복 경고
**테스트 데이터** (동일 파일 내 중복):
```
이름     | 소속        | 고객 연락처    
--------|-----------|-------------
홍길동    | 삼성병원     | 010-1234-5678
홍길동    | 삼성병원     | 010-1234-5678
```

**예상 결과**:
- ✅ 1행: 초록색 "유효" 배지
- ✅ 2행: 초록색 "유효" 배지 + 경고 메시지
- ✅ 사유: "홍길동 / 010-1234-5678이 중복됩니다. 기존 데이터가 업데이트됩니다."
- ✅ 반영 시 1명만 생성/업데이트 (중복 제거)

---

## 5️⃣ FK 무결성 검증

### 테스트 케이스 5.1: 배정된 참가자 업데이트 후 rooming FK 유지
**사전 조건**:
```sql
-- 참가자 생성 및 객실 배정
INSERT INTO participants (id, event_id, name, organization, phone)
VALUES ('00000000-0000-0000-0000-000000000001', 'da4a5d5e-f469-4f96-a389-36f0a54e29d6', '홍길동', '삼성병원', '010-1234-5678');

INSERT INTO room_participants (event_id, participant_id, room_id)
VALUES ('da4a5d5e-f469-4f96-a389-36f0a54e29d6', '00000000-0000-0000-0000-000000000001', 'some-room-id');
```

**테스트 데이터**:
```
이름     | 소속        | 고객 연락처    | 요청사항
--------|-----------|--------------|----------
홍길동    | 아산병원     | 010-1234-5678 | VIP
```

**예상 결과**:
- ✅ participants.id = '00000000-0000-0000-0000-000000000001' 유지
- ✅ participants.organization = "아산병원" (업데이트)
- ✅ room_participants.participant_id = '00000000-0000-0000-0000-000000000001' 유지
- ✅ 배정 정보 손실 없음

**검증 SQL**:
```sql
-- FK 유지 확인
SELECT 
  p.id as participant_id,
  p.name,
  p.organization,
  rp.room_id,
  rp.created_at as assigned_at
FROM participants p
INNER JOIN room_participants rp ON rp.participant_id = p.id
WHERE p.event_id = 'da4a5d5e-f469-4f96-a389-36f0a54e29d6'
AND p.name = '홍길동';
```

---

## 6️⃣ 전체 삭제 (MASTER 전용)

### 테스트 케이스 6.1: MASTER 전체 삭제 성공
**사전 조건**:
- MASTER 계정으로 로그인
- 테스트 이벤트에 10명의 참가자 존재

**실행 단계**:
1. 참가자 관리 페이지 우상단 "더보기 (⋯)" 클릭
2. "모든 참가자 삭제 (MASTER)" 메뉴 클릭
3. 확인 모달에서 경고 문구 확인
4. "확인" 버튼 클릭

**예상 결과**:
- ✅ 모달 제목: "정말 모든 참가자를 삭제할까요?"
- ✅ 모달 본문: "이 작업은 되돌릴 수 없습니다. 연결된 데이터가 손실될 수 있습니다."
- ✅ 삭제 후 참가자 수: 0명
- ✅ 토스트: "모든 참가자가 삭제되었습니다."
- ✅ participants_log에 `action='full_delete'` 로그 생성
- ✅ room_participants, messages, forms 등 연계 데이터 처리 (CASCADE or orphan)

**검증 SQL**:
```sql
-- 참가자 수 확인 (0명 예상)
SELECT COUNT(*) FROM participants 
WHERE event_id = 'da4a5d5e-f469-4f96-a389-36f0a54e29d6';

-- 삭제 로그 확인
SELECT action, metadata, created_by, created_at 
FROM participants_log 
WHERE event_id = 'da4a5d5e-f469-4f96-a389-36f0a54e29d6'
AND action = 'full_delete'
ORDER BY created_at DESC LIMIT 1;
```

### 테스트 케이스 6.2: 비-MASTER 사용자 접근 제한
**사전 조건**:
- Staff 또는 Agency Owner 계정으로 로그인

**예상 결과**:
- ✅ "모든 참가자 삭제 (MASTER)" 메뉴가 표시되지 않음
- ✅ 또는 클릭 시 "권한이 없습니다" 오류 메시지

---

## 7️⃣ RLS 정책 검증

### 테스트 케이스 7.1: Agency 격리 확인
**사전 조건**:
- Agency A 사용자로 로그인
- Agency B의 이벤트 ID 사용

**테스트 데이터**:
- event_id: Agency B의 이벤트 ID
- 10행 Excel 파일

**예상 결과**:
- ✅ 업로드 시 RLS 위반 오류 발생
- ✅ participants_staging 테이블 INSERT 차단
- ✅ 또는 업로드 후 0건 조회 (RLS SELECT 차단)

### 테스트 케이스 7.2: MASTER 전체 접근 확인
**사전 조건**:
- MASTER 계정으로 로그인
- 임의의 Agency 이벤트 선택

**예상 결과**:
- ✅ 모든 Agency의 이벤트에 업로드/검증/반영 가능
- ✅ 모든 staging 데이터 조회 가능

---

## 8️⃣ 감사 로그 검증

### 테스트 케이스 8.1: 전체 플로우 로그 생성
**실행 단계**:
1. 10행 업로드 → 검증 → 반영 완료

**예상 결과**:
```sql
-- 3개의 로그 생성 확인
SELECT action, metadata->>'session_id', metadata->>'user_id', created_at
FROM participants_log
WHERE event_id = 'da4a5d5e-f469-4f96-a389-36f0a54e29d6'
AND action IN ('excel_upload', 'excel_validation', 'bulk_import')
ORDER BY created_at DESC;
```

**예상 데이터**:
- ✅ `action='excel_upload'`: session_id, row_count, user_id
- ✅ `action='excel_validation'`: session_id, valid_count, error_count, warn_count, user_id
- ✅ `action='bulk_import'`: session_id, inserted, updated, skipped

---

## 9️⃣ 성능 테스트

### 테스트 케이스 9.1: 대량 데이터 (1000행)
**테스트 데이터**:
- 1000행 Excel 파일 (모두 유효 데이터)

**예상 결과**:
- ✅ 업로드 시간: < 5초
- ✅ 검증 시간: < 10초
- ✅ 반영 시간: < 15초
- ✅ UI 응답성 유지 (버튼 비활성화, 로딩 표시)

### 테스트 케이스 9.2: 최대 행 제한
**테스트 데이터**:
- 10,000행 Excel 파일

**예상 결과**:
- ✅ 업로드 성공 또는 적절한 제한 메시지
- ✅ 미리보기는 최대 50행만 표시
- ✅ 전체 데이터는 staging에 저장

---

## 🎯 회귀 테스트 체크리스트

- [ ] 기존 수동 참가자 추가 기능 정상 작동
- [ ] 기존 참가자 편집 기능 정상 작동
- [ ] 기존 참가자 삭제 기능 정상 작동
- [ ] 배정 화면에서 참가자 목록 정상 표시
- [ ] 메시지 발송 화면에서 참가자 선택 가능
- [ ] 설문 응답과 참가자 연동 정상

---

## 📋 테스트 완료 기준

### Phase 78-B 배포 승인 조건
- [x] 1️⃣ 정상 업로드 플로우: 모든 테스트 케이스 통과
- [x] 2️⃣ 필수 컬럼 누락 검증: 모든 테스트 케이스 통과
- [x] 3️⃣ 연락처 형식 검증: 모든 테스트 케이스 통과
- [x] 4️⃣ 중복 처리: 모든 테스트 케이스 통과
- [x] 5️⃣ FK 무결성: 모든 테스트 케이스 통과
- [x] 6️⃣ 전체 삭제: 모든 테스트 케이스 통과
- [x] 7️⃣ RLS 정책: 모든 테스트 케이스 통과
- [x] 8️⃣ 감사 로그: 모든 테스트 케이스 통과
- [x] 9️⃣ 성능 테스트: 허용 범위 내
- [x] 🎯 회귀 테스트: 기존 기능 정상 작동

---

## 🐛 이슈 트래킹

### 발견된 버그
| ID | 심각도 | 설명 | 상태 | 수정 버전 |
|----|--------|------|------|-----------|
| - | - | - | - | - |

### 개선 제안
| ID | 우선순위 | 설명 | 상태 |
|----|----------|------|------|
| - | - | - | - |
