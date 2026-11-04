import fs from "node:fs";

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
CREATE TABLE IF NOT EXISTS public.phone_directory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  division text NOT NULL CHECK (division IN ('employee', 'vendor')),
  encrypted_company text NOT NULL,
  encrypted_name text NOT NULL,
  encrypted_email text NOT NULL,
  encrypted_phone text NOT NULL,
  company_hash text NOT NULL,
  name_hash text NOT NULL,
  email_hash text NOT NULL,
  phone_hash text NOT NULL,
  iv text NOT NULL,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_directory_division ON public.phone_directory(division);
CREATE INDEX IF NOT EXISTS idx_phone_directory_phone_hash ON public.phone_directory(phone_hash);
CREATE INDEX IF NOT EXISTS idx_phone_directory_email_hash ON public.phone_directory(email_hash);
CREATE INDEX IF NOT EXISTS idx_phone_directory_name_hash ON public.phone_directory(name_hash);

ALTER TABLE public.phone_directory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public full access to phone_directory" ON public.phone_directory;
CREATE POLICY "Allow public full access to phone_directory" ON public.phone_directory
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);
`;

async function run() {
  console.log("Applying phone_directory table migration...");
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
