import { describe, expect, it } from 'vitest';
import { extractYandexCompletionText } from '@/shared/lib/voice/yandex-gpt-response';

describe('extractYandexCompletionText', () => {
  it('extracts final assistant text', () => {
    const text = extractYandexCompletionText({
      result: {
        alternatives: [
          {
            message: { role: 'assistant', text: '{"title":"Call client"}' },
            status: 'ALTERNATIVE_STATUS_FINAL',
          },
        ],
      },
    });

    expect(text).toBe('{"title":"Call client"}');
  });

  it('throws when completion is empty', () => {
    expect(() => extractYandexCompletionText({ result: { alternatives: [] } })).toThrow(
      'AI returned an empty response'
    );
  });
});
