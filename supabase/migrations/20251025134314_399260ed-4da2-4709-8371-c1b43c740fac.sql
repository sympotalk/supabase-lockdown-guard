-- Phase 3.7.X-FULL.FIX.1: Set default status for events table
-- This prevents undefined status values from causing UI errors

ALTER TABLE events 
ALTER COLUMN status SET DEFAULT 'pending';