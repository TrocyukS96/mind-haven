import fs from 'node:fs';

const ENV_FILE = process.env.ENV_FILE ?? '.env.local';
const PLACEHOLDER = '[SENSITIVE]';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const vars = {};

  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
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

  return vars;
}

function isValidPostgresUrl(value) {
  return (
    typeof value === 'string' &&
    value.length > 20 &&
    (value.startsWith('postgres://') || value.startsWith('postgresql://'))
  );
}

const vars = loadEnvFile(ENV_FILE);
const databaseUrl = vars.DATABASE_URL ?? vars.POSTGRES_URL;
const directUrl = vars.DIRECT_URL ?? vars.POSTGRES_URL_NON_POOLING;

const errors = [];

if (!databaseUrl || databaseUrl === PLACEHOLDER) {
  errors.push('DATABASE_URL или POSTGRES_URL не заданы или содержат заглушку [SENSITIVE].');
} else if (!isValidPostgresUrl(databaseUrl)) {
  errors.push('DATABASE_URL имеет неверный формат. Ожидается postgres:// или postgresql://');
}

if (!directUrl || directUrl === PLACEHOLDER) {
  errors.push('DIRECT_URL или POSTGRES_URL_NON_POOLING не заданы или содержат заглушку [SENSITIVE].');
} else if (!isValidPostgresUrl(directUrl)) {
  errors.push('DIRECT_URL имеет неверный формат. Ожидается postgres:// или postgresql://');
}

if (errors.length > 0) {
  console.error('\n❌ Невалидные переменные окружения для Prisma:\n');
  errors.forEach((error) => console.error(`  • ${error}`));
  console.error(`
Как исправить:
  1. Vercel → Project mind-haven → Storage → Postgres → вкладка ".env.local"
  2. Скопируйте POSTGRES_URL и POSTGRES_URL_NON_POOLING
  3. Вставьте в .env.local:

     DATABASE_URL="<значение POSTGRES_URL>"
     DIRECT_URL="<значение POSTGRES_URL_NON_POOLING>"

  4. Запустите снова: npm run db:push

Примечание: vercel env pull в автоматическом режиме может записать [SENSITIVE] вместо реальных значений.
Скопируйте строки подключения вручную из Vercel Dashboard.
`);
  process.exit(1);
}

const envContent = fs.readFileSync(ENV_FILE, 'utf8');
const lines = envContent.split('\n').filter(Boolean);
const mapped = new Map(lines.map((line) => [line.split('=')[0], line]));

mapped.set('DATABASE_URL', `DATABASE_URL="${databaseUrl}"`);
mapped.set('DIRECT_URL', `DIRECT_URL="${directUrl}"`);

fs.writeFileSync('.env', [...mapped.values()].join('\n') + '\n');
console.log('✓ DATABASE_URL и DIRECT_URL готовы для Prisma');
