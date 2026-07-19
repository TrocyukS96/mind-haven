import fs from 'node:fs';

const env = fs.readFileSync('.env.local', 'utf8');
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

for (const key of ['DATABASE_URL', 'DIRECT_URL', 'POSTGRES_URL', 'POSTGRES_URL_NON_POOLING']) {
  const value = vars[key] || '';
  const isPostgres = value.startsWith('postgres://') || value.startsWith('postgresql://');
  const isTemplate = value.includes('${') || value.startsWith('@');
  console.log(
    `${key}: len=${value.length}, postgres=${isPostgres}, template=${isTemplate}, preview=${JSON.stringify(value.slice(0, 30))}`
  );
}

fs.writeFileSync(
  'scripts/env-debug.txt',
  JSON.stringify(
    Object.fromEntries(
      ['DATABASE_URL', 'DIRECT_URL', 'POSTGRES_URL', 'POSTGRES_URL_NON_POOLING'].map((key) => {
        const value = vars[key] || '';
        return [
          key,
          {
            len: value.length,
            postgres: value.startsWith('postgres://') || value.startsWith('postgresql://'),
            startsWith: value.slice(0, 12),
          },
        ];
      })
    ),
    null,
    2
  )
);
