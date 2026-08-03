#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const TEAMS = [
  ["ALG", "algeria"],
  ["ARG", "argentina"],
  ["AUS", "australia"],
  ["AUT", "austria"],
  ["BEL", "belgium"],
  ["BIH", "bosnia-and-herzegovina"],
  ["BRA", "brazil"],
  ["CAN", "canada"],
  ["CIV", "cote-divoire"],
  ["COD", "dr-congo"],
  ["COL", "colombia"],
  ["CPV", "cape-verde"],
  ["CRO", "croatia"],
  ["CUW", "curacao"],
  ["CZE", "czechia"],
  ["ECU", "ecuador"],
  ["EGY", "egypt"],
  ["ENG", "england"],
  ["ESP", "spain"],
  ["FRA", "france"],
  ["GER", "germany"],
  ["GHA", "ghana"],
  ["HAI", "haiti"],
  ["IRN", "iran"],
  ["IRQ", "iraq"],
  ["JOR", "jordan"],
  ["JPN", "japan"],
  ["KOR", "south-korea"],
  ["KSA", "saudi-arabia"],
  ["MAR", "morocco"],
  ["MEX", "mexico"],
  ["NED", "netherlands"],
  ["NOR", "norway"],
  ["NZL", "new-zealand"],
  ["PAN", "panama"],
  ["PAR", "paraguay"],
  ["POR", "portugal"],
  ["QAT", "qatar"],
  ["RSA", "south-africa"],
  ["SCO", "scotland"],
  ["SEN", "senegal"],
  ["SUI", "switzerland"],
  ["SWE", "sweden"],
  ["TUN", "tunisia"],
  ["TUR", "turkey"],
  ["URU", "uruguay"],
  ["USA", "united-states"],
  ["UZB", "uzbekistan"]
];

const BASE = "https://scanini.app/es/teams";
const OUT = path.resolve(process.cwd(), "database");

function decodeHtml(s = "") {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function textFromHtml(html) {
  return decodeHtml(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  ).replace(/\s+/g, " ").trim();
}

function csv(v) {
  return `"${String(v ?? "").replaceAll('"', '""')}"`;
}

function sql(v) {
  return String(v ?? "").replaceAll("'", "''");
}

async function download(url) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 FiguMatch/2.0",
      "Accept": "text/html,application/xhtml+xml"
    }
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} en ${url}`);
  return r.text();
}

function parsePage(prefix, html, url) {
  const text = textFromHtml(html);
  const teamMatch = text.match(new RegExp(`${prefix}\\s*·\\s*20\\s+postales\\s*#?\\s*(.+?)\\s+postales`, "i"));
  const team = teamMatch?.[1]?.trim() || prefix;

  const re = new RegExp(
    `\\b(${prefix})\\s+(\\d{1,2})\\s+(.+?)\\s+` +
    `(logo de selección(?:\\s*·\\s*foil)?|foto del equipo|postal de jugador)\\b`,
    "gi"
  );

  const rows = [];
  for (const m of text.matchAll(re)) {
    const number = Number(m[2]);
    const kind = m[4].toLowerCase();
    let category = "Jugador";
    let name = m[3].trim();

    if (kind.startsWith("logo de selección")) {
      category = "Escudo";
      name = `Escudo de ${team}`;
    } else if (kind === "foto del equipo") {
      category = "Equipo";
      name = `Foto del equipo de ${team}`;
    }

    rows.push({
      code: `${prefix} ${number}`,
      number,
      team,
      name,
      category,
      source_url: url
    });
  }

  const unique = [...new Map(rows.map(r => [r.code, r])).values()]
    .sort((a,b) => a.number - b.number);

  if (unique.length !== 20) {
    throw new Error(`${prefix}: esperaba 20 figuritas y encontré ${unique.length}`);
  }
  return unique;
}

async function main() {
  console.log("Generando Base oficial FiguMatch 2026 v2...");
  await fs.mkdir(OUT, { recursive: true });

  const all = [];
  for (let i = 0; i < TEAMS.length; i++) {
    const [prefix, slug] = TEAMS[i];
    const url = `${BASE}/${slug}`;
    console.log(`[${i+1}/48] ${prefix} - ${url}`);
    const html = await download(url);
    all.push(...parsePage(prefix, html, url));
  }

  const unique = [...new Map(all.map(r => [r.code, r])).values()];
  if (unique.length !== 960) {
    throw new Error(`Esperaba 960 registros y obtuve ${unique.length}`);
  }

  unique.sort((a,b) => a.code.localeCompare(b.code, "en", {numeric:true}));

  const csvText = [
    "code,number,team,name,category,source_url",
    ...unique.map(r => [r.code,r.number,r.team,r.name,r.category,r.source_url].map(csv).join(","))
  ].join("\n");

  const values = unique.map(r =>
    `('${sql(r.code)}','${sql(r.name)}','${sql(r.category)}')`
  ).join(",\n");

  const sqlText = `BEGIN;

CREATE TEMP TABLE figumatch_v2 (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO figumatch_v2 (code, name, category) VALUES
${values};

DO $$
DECLARE c INTEGER;
BEGIN
  SELECT COUNT(*) INTO c FROM figumatch_v2;
  IF c <> 960 THEN
    RAISE EXCEPTION 'Se esperaban 960 registros y hay %', c;
  END IF;
END $$;

UPDATE stickers s
SET name = f.name,
    category = f.category
FROM figumatch_v2 f
WHERE UPPER(TRIM(s.code)) = f.code;

COMMIT;

SELECT COUNT(*) AS nombres_pendientes
FROM stickers
WHERE name IS NULL
   OR TRIM(name) = ''
   OR UPPER(TRIM(name)) = UPPER(TRIM(code));
`;

  await fs.writeFile(path.join(OUT, "figumatch_2026_v2.csv"), csvText, "utf8");
  await fs.writeFile(path.join(OUT, "update_figumatch_2026_v2.sql"), sqlText, "utf8");

  console.log("\nLISTO");
  console.log("CSV:", path.join(OUT, "figumatch_2026_v2.csv"));
  console.log("SQL:", path.join(OUT, "update_figumatch_2026_v2.sql"));
  console.log("Registros:", unique.length);
}

main().catch(err => {
  console.error("\nERROR:", err.message);
  console.error("No se generaron archivos incompletos.");
  process.exit(1);
});
