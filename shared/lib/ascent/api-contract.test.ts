import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ASCENT_API_CONTRACT } from '@/shared/lib/ascent/api-contract';

describe('ascent API contract', () => {
  it('maps every published route to a file and leaves pause unavailable', () => {
    expect(ASCENT_API_CONTRACT.some((endpoint) => /pause|resume/.test(endpoint.path))).toBe(false);

    for (const endpoint of ASCENT_API_CONTRACT) {
      const relative = endpoint.path.replace(/:([A-Za-z]+)/g, '[$1]').replace(/^\//, '');
      const file = path.join(process.cwd(), 'app', relative, 'route.ts');
      expect(existsSync(file), file).toBe(true);
    }
  });
});
