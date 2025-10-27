-- [71-J.2] Add lodging_status column for list management
alter table participants
  add column if not exists lodging_status text;

comment on column participants.lodging_status is '[71-J.2] 리스트 관리 전용 숙박현황 필드 (엑셀 업로드 대상 제외)';