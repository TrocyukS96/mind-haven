/**
 * Fixed-point decimal (8 fractional digits) backed by bigint.
 * Money amounts are rounded to 2 digits before they are stored.
 */

const SCALE = BigInt(8);
const POW = BigInt(10) ** SCALE;
const ZERO = BigInt(0);
const ONE = BigInt(1);
const TWO = BigInt(2);

function divRound(numerator: bigint, denominator: bigint): bigint {
  if (denominator === ZERO) {
    throw new Error('INVALID_AMOUNT');
  }

  const negative = (numerator < ZERO) !== (denominator < ZERO);
  const dividend = numerator < ZERO ? -numerator : numerator;
  const divisor = denominator < ZERO ? -denominator : denominator;
  const quotient = dividend / divisor;
  const remainder = dividend % divisor;
  const rounded = remainder * TWO >= divisor ? quotient + ONE : quotient;
  return negative ? -rounded : rounded;
}

export function parseDecimal(value: string | number): bigint {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('INVALID_AMOUNT');
    }
    return parseDecimal(value.toFixed(8));
  }

  const trimmed = value.trim().replace(',', '.');
  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;

  if (!/^\d+(\.\d+)?$/.test(unsigned)) {
    throw new Error('INVALID_AMOUNT');
  }

  const [whole, fraction = ''] = unsigned.split('.');
  const digits = (fraction + '00000000').slice(0, 8);
  let scaled = BigInt(whole) * POW + BigInt(digits);

  if (fraction.length > 8 && fraction[8] >= '5') {
    scaled += ONE;
  }

  return negative ? -scaled : scaled;
}

export function formatDecimal(scaled: bigint, fractionDigits = 8): string {
  const negative = scaled < ZERO;
  const absolute = negative ? -scaled : scaled;
  const whole = absolute / POW;
  const fraction = (absolute % POW).toString().padStart(8, '0').slice(0, fractionDigits);
  return `${negative ? '-' : ''}${whole.toString()}.${fraction}`;
}

export function decAdd(left: string, right: string): string {
  return formatDecimal(parseDecimal(left) + parseDecimal(right));
}

export function decSub(left: string, right: string): string {
  return formatDecimal(parseDecimal(left) - parseDecimal(right));
}

export function decMul(left: string, right: string): string {
  return formatDecimal(divRound(parseDecimal(left) * parseDecimal(right), POW));
}

export function decDiv(left: string, right: string): string {
  return formatDecimal(divRound(parseDecimal(left) * POW, parseDecimal(right)));
}

export function decCmp(left: string, right: string): -1 | 0 | 1 {
  const delta = parseDecimal(left) - parseDecimal(right);
  if (delta < ZERO) return -1;
  if (delta > ZERO) return 1;
  return 0;
}

export function decRound(value: string | number, fractionDigits: number): string {
  const factor = BigInt(10) ** (SCALE - BigInt(fractionDigits));
  const rounded = divRound(parseDecimal(value), factor) * factor;
  return formatDecimal(rounded, fractionDigits);
}

export function money(value: string | number): string {
  return decRound(value, 2);
}

export function decToNumber(value: string): number {
  return Number(value);
}

export function isCreditEntry(type: string): boolean {
  return type === 'income' || type === 'transfer_in' || type === 'capital_in';
}
