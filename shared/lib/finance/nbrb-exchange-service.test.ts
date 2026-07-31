import { describe, expect, it } from 'vitest';
import { buildRatesMapFromErApi } from './nbrb-exchange-service';

describe('buildRatesMapFromErApi', () => {
  it('builds BYN-based rates from USD quote payload', () => {
    const rates = buildRatesMapFromErApi({
      result: 'success',
      time_last_update_utc: 'Fri, 31 Jul 2026 00:02:31 +0000',
      rates: {
        USD: 1,
        BYN: 2.915708,
        RUB: 79.932757,
        CNY: 6.765736,
      },
    });

    expect(rates.BYN).toMatchObject({ scale: 1, rate: 1 });
    expect(rates.USD).toMatchObject({ scale: 1, rate: 2.915708 });
    expect(rates.RUB.rate / rates.RUB.scale).toBeCloseTo(2.915708 / 79.932757, 6);
    expect(rates.CNY.rate / rates.CNY.scale).toBeCloseTo(2.915708 / 6.765736, 6);
  });
});
