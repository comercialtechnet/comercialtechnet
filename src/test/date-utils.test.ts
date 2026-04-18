import { describe, expect, it } from 'vitest';
import { toDateKey } from '@/lib/use-filtered-data';

describe('toDateKey', () => {
  it('normaliza ISO com e sem zero padding', () => {
    expect(toDateKey('2026-04-18')).toBe(20260418);
    expect(toDateKey('2026-4-8')).toBe(20260408);
    expect(toDateKey('2026-04-18T10:30:00Z')).toBe(20260418);
  });

  it('normaliza formato BR e timestamp textual', () => {
    expect(toDateKey('18/04/2026')).toBe(20260418);
    expect(toDateKey('2026-04-18 00:00:00')).toBe(20260418);
  });

  it('retorna null para valor inválido', () => {
    expect(toDateKey('data invalida')).toBeNull();
    expect(toDateKey(undefined)).toBeNull();
  });
});
