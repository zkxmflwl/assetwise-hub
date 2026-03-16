export const formatKRW = (value: number): string => {
  return value.toLocaleString('ko-KR');
};

/** 억/만 단위 표기 (예: 3억 3310만) */
export const formatKRWShort = (value: number): string => {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const eok = Math.floor(abs / 100000000);
  const man = Math.floor((abs % 100000000) / 10000);

  if (eok > 0 && man > 0) return `${sign}${eok}억 ${man.toLocaleString('ko-KR')}만`;
  if (eok > 0) return `${sign}${eok}억`;
  if (man > 0) return `${sign}${man.toLocaleString('ko-KR')}만`;
  return '0';
};

/** 공통: 반올림 후 억/만 단위 표기 */
export function formatRoundedAmount(value: number, unit: number): string {
  const rounded = Math.round(value / unit) * unit;
  return formatKRWShort(rounded);
}

/** 실적 요약 테이블용
 * 누적 계열: 천만 단위 반올림, 반올림 결과가 0이면 백만 단위 반올림
 */
export const formatSummaryAmount = (value: number): string => {
  const millionRounded = Math.round(value / 10_000_000) * 10_000_000;

  if (millionRounded !== 0) {
    return formatKRWShort(millionRounded);
  }

  const hundredThousandRounded = Math.round(value / 1_000_000) * 1_000_000;
  return formatKRWShort(hundredThousandRounded);
};

// 누적: 백만 단위 반올림, 결과가 0이면 십만 단위 반올림
export function formatYtdAmount(value: number | null | undefined): string {
  const num = value ?? 0;

  const millionRounded = Math.round(num / 1_000_000) * 1_000_000;
  if (millionRounded !== 0) {
    return formatKRWShort(millionRounded);
  }

  const hundredThousandRounded = Math.round(num / 100_000) * 100_000;
  return formatKRWShort(hundredThousandRounded);
}

// 당월: 백만 단위 반올림
export function formatMonthlyAmount(value: number | null | undefined): string {
  const num = value ?? 0;
  const rounded = Math.round(num / 1_000_000) * 1_000_000;
  return formatKRWShort(rounded);
}