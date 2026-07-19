import fs from 'node:fs';

const env = fs.readFileSync('.env.vercel.tmp', 'utf8');
const keys = ['DATABASE_URL', 'POSTGRES_URL', 'POSTGRES_URL_NON_POOLING'];

for (const key of keys) {
  const line = env.split('\n').find((entry) => entry.startsWith(`${key}=`));
  const value = line?.slice(key.length + 1).replace(/^"|"$/g, '') ?? '';
  console.log(`${key}: placeholder=${value === '[SENSITIVE]'}, len=${value.length}, postgres=${value.startsWith('postgres')}`);
}
