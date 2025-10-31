-- Force PostgREST schema cache reload
SELECT pg_notify('pgrst', 'reload schema');