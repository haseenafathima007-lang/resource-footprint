import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FactorSetPayload, Factor } from '../src/types/factor.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function validateFactor(f: Factor, idx: number): void {
  if (!f.id || typeof f.id !== 'string') {
    throw new Error(`Factor at index ${idx} is missing a valid 'id'`);
  }
  if (!f.label || typeof f.label !== 'string') {
    throw new Error(`Factor ${f.id} is missing a valid 'label'`);
  }
  if (!f.unit || typeof f.unit !== 'string') {
    throw new Error(`Factor ${f.id} is missing a valid 'unit'`);
  }
  if (typeof f.low !== 'number' || typeof f.typical !== 'number' || typeof f.high !== 'number') {
    throw new Error(`Factor ${f.id} must have numeric low, typical, and high values`);
  }
  if (f.low > f.typical || f.typical > f.high) {
    throw new Error(`Factor ${f.id} range invalid: low (${f.low}) <= typical (${f.typical}) <= high (${f.high}) violated`);
  }
  if (!f.source || typeof f.source !== 'string') {
    throw new Error(`Factor ${f.id} is missing a valid 'source' citation`);
  }
}

export function generateFactorSeed(
  jsonPath = path.resolve(__dirname, '../src/data/factors.v1.json'),
  outputPath = path.resolve(__dirname, '../supabase/seed.sql')
): string {
  const content = fs.readFileSync(jsonPath, 'utf-8');
  const parsed: FactorSetPayload = JSON.parse(content);

  if (!parsed.version) throw new Error("Factor set missing 'version'");
  if (!parsed.region) throw new Error("Factor set missing 'region'");
  if (!parsed.effectiveFrom) throw new Error("Factor set missing 'effectiveFrom'");
  if (!Array.isArray(parsed.factors) || parsed.factors.length === 0) {
    throw new Error("Factor set missing non-empty 'factors' array");
  }

  parsed.factors.forEach((factor, idx) => validateFactor(factor, idx));

  // Escape single quotes for SQL string literal
  const escapedPayload = JSON.stringify(parsed).replace(/'/g, "''");

  const sql = `-- Generated automatically by scripts/generate-factor-seed.ts
-- Single source of truth: src/data/factors.v1.json
-- Version: ${parsed.version} (${parsed.region}), effective from: ${parsed.effectiveFrom}

insert into public.factor_sets (version, region, effective_from, payload)
values (
  '${parsed.version}',
  '${parsed.region}',
  '${parsed.effectiveFrom}',
  '${escapedPayload}'::jsonb
)
on conflict (version) do nothing;
`;

  fs.writeFileSync(outputPath, sql, 'utf-8');
  return sql;
}

// Run if called directly
if (process.argv[1] === __filename) {
  try {
    generateFactorSeed();
    console.log('✅ Generated supabase/seed.sql successfully from src/data/factors.v1.json');
  } catch (err) {
    console.error('❌ Failed to generate factor seed:', err);
    process.exit(1);
  }
}
