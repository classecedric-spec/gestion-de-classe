-- Add date_fin column to Module table
ALTER TABLE public."Module" 
ADD COLUMN IF NOT EXISTS date_fin DATE;
