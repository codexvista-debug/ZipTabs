import dns from "node:dns";
import fs from "node:fs";
dns.setDefaultResultOrder("ipv4first");

// Read from process.env or .env.local
let PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "eezoqjadlmbypixcejmd";
let ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || "";

if (!ACCESS_TOKEN && fs.existsSync(".env.local")) {
  const envContent = fs.readFileSync(".env.local", "utf8");
  const match = envContent.match(/SUPABASE_ACCESS_TOKEN=([^\r\n]+)/);
  if (match) ACCESS_TOKEN = match[1].trim();
  const refMatch = envContent.match(/SUPABASE_PROJECT_REF=([^\r\n]+)/);
  if (refMatch) PROJECT_REF = refMatch[1].trim();
}

const sql = `
-- Add retention_type and expires_at columns to drive_files
ALTER TABLE public.drive_files 
ADD COLUMN IF NOT EXISTS retention_type text NOT NULL DEFAULT 'permanent' CHECK (retention_type IN ('permanent', 'temporary')),
ADD COLUMN IF NOT EXISTS expires_at timestamptz NULL;

-- Create index for quick querying of expiring files
CREATE INDEX IF NOT EXISTS idx_drive_files_expires_at ON public.drive_files(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drive_files_retention_type ON public.drive_files(retention_type);

-- Function to clean up expired temporary drive files and return count
CREATE OR REPLACE FUNCTION public.purge_expired_drive_files()
RETURNS TABLE(purged_id uuid, purged_storage_path text, purged_name text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  DELETE FROM public.drive_files
  WHERE retention_type = 'temporary'
    AND expires_at IS NOT NULL
    AND expires_at <= NOW()
  RETURNING id, storage_path, name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_expired_drive_files() TO anon, authenticated, service_role;
`;

async function run() {
  console.log("Running SQL migration...");
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query: sql })
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Migration failed:", res.status, errText);
    process.exit(1);
  }

  const result = await res.json();
  console.log("Migration successful!", result);
}

run();
