
-- [71-I.QA3-FIX.R10] Add manager_info, sfe_agency_code, sfe_customer_code to participants
alter table participants
  add column if not exists manager_info jsonb,
  add column if not exists sfe_agency_code text,
  add column if not exists sfe_customer_code text;

comment on column participants.manager_info is 'Manager information (team_name, manager_name, phone)';
comment on column participants.sfe_agency_code is 'SFE agency code';
comment on column participants.sfe_customer_code is 'SFE customer code';
