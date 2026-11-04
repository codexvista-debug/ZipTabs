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
ALTER TABLE public.phone_directory 
ADD COLUMN IF NOT EXISTS encrypted_notes text,
ADD COLUMN IF NOT EXISTS notes_hash text;

CREATE INDEX IF NOT EXISTS idx_phone_directory_notes_hash ON public.phone_directory(notes_hash);
`;

async function run() {
  console.log("Applying phone_directory notes encryption migration...");
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
