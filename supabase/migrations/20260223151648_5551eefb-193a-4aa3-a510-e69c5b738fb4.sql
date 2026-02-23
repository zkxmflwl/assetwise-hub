
-- Allow anon INSERT on intangible_assets
CREATE POLICY "Allow anon insert intangible_assets"
ON public.intangible_assets
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon UPDATE on intangible_assets
CREATE POLICY "Allow anon update intangible_assets"
ON public.intangible_assets
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Allow anon DELETE on intangible_assets
CREATE POLICY "Allow anon delete intangible_assets"
ON public.intangible_assets
FOR DELETE
TO anon
USING (true);

-- Allow anon INSERT on tangible_assets
CREATE POLICY "Allow anon insert tangible_assets"
ON public.tangible_assets
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon UPDATE on tangible_assets
CREATE POLICY "Allow anon update tangible_assets"
ON public.tangible_assets
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Allow anon DELETE on tangible_assets
CREATE POLICY "Allow anon delete tangible_assets"
ON public.tangible_assets
FOR DELETE
TO anon
USING (true);
