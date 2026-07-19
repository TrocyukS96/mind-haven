import fs from 'node:fs';

const env = fs.readFileSync('.env', 'utf8');
const vars = {};

for (const line of env.split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (!match) continue;
  let value = match[2].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  vars[match[1]] = value;
}

for (const key of [
  'DATABASE_URL',
  'DIRECT_URL',
  'POSTGRES_URL',
  'POSTGRES_URL_NON_POOLING',
  'POSTGRES_PRISMA_URL',
]) {
  const value = vars[key] || '';
  const startsWithPostgres = value.startsWith('postgres://') || value.startsWith('postgresql://');
  console.log(`${key}: len=${value.length}, postgres=${startsWithPostgres}, preview=${JSON.stringify(value.slice(0, 20))}`);
}
