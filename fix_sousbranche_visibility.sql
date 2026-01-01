-- FIX: Enable visibility for "SousBranche" table
-- Allows authenticated users to view, insert, update, delete their own data.

-- 1. Enable RLS
ALTER TABLE public."SousBranche" ENABLE ROW LEVEL SECURITY;

-- 2. Drop potential existing policies to ensure clean state
DROP POLICY IF EXISTS "Users can view own SousBranche" ON public."SousBranche";
DROP POLICY IF EXISTS "Users can insert own SousBranche" ON public."SousBranche";
DROP POLICY IF EXISTS "Users can update own SousBranche" ON public."SousBranche";
DROP POLICY IF EXISTS "Users can delete own SousBranche" ON public."SousBranche";

-- 3. Create Policies
CREATE POLICY "Users can view own SousBranche" ON public."SousBranche"
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own SousBranche" ON public."SousBranche"
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own SousBranche" ON public."SousBranche"
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own SousBranche" ON public."SousBranche"
FOR DELETE USING (auth.uid() = user_id);
