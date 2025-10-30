-- Phase 73-L.7.31-G: Complete DB-Frontend Alignment (Revised)
-- Rename columns to match frontend field names

-- A. memo → request_note (데이터 유지)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'participants' 
    AND column_name = 'memo'
  ) THEN
    ALTER TABLE public.participants 
      RENAME COLUMN memo TO request_note;
    
    COMMENT ON COLUMN public.participants.request_note 
      IS '요청사항/메모 (엑셀: 메모, 요청사항)';
  END IF;
END $$;

-- B. sfe_agency_code → sfe_company_code (데이터 유지)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'participants' 
    AND column_name = 'sfe_agency_code'
  ) THEN
    ALTER TABLE public.participants 
      RENAME COLUMN sfe_agency_code TO sfe_company_code;
    
    COMMENT ON COLUMN public.participants.sfe_company_code 
      IS 'SFE 거래처코드 (엑셀: SFE 거래처코드, Company Code)';
  END IF;
END $$;

-- C. Ensure sfe_customer_code has comment
COMMENT ON COLUMN public.participants.sfe_customer_code 
  IS 'SFE 고객코드 (엑셀: SFE 고객코드, Customer Code)';