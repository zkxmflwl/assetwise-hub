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

/** 실적 요약 테이블용: 500만 미만 → 백만단위(10만 반올림), 500만 이상 → 천만단위(백만 반올림) */
export const formatSummaryAmount = (value: number): string => {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs < 5000000) {
    // 10만 단위 반올림 → 백만 단위 표시
    const rounded = Math.round(abs / 100000) * 100000;
    const millions = rounded / 1000000;
    if (rounded === 0) return '0';
    return `${sign}${millions.toFixed(1).replace(/\.0$/, '')}백만`;
  }
  // 백만 단위 반올림 → 천만 단위 표시
  const rounded = Math.round(abs / 1000000) * 1000000;
  const eok = Math.floor(rounded / 100000000);
  const man = Math.floor((rounded % 100000000) / 10000);
  if (eok > 0 && man > 0) return `${sign}${eok}억 ${man.toLocaleString('ko-KR')}만`;
  if (eok > 0) return `${sign}${eok}억`;
  if (man > 0) return `${sign}${man.toLocaleString('ko-KR')}만`;
  return '0';
};

export function formatRoundedAmount(value: number, unit: number) {
  const rounded = Math.round(value / unit) * unit;
  return rounded.toLocaleString('ko-KR');
}

// 누적: 백만 단위 반올림, 결과가 0이면 십만 단위 반올림
export function formatYtdAmount(value: number | null | undefined) {
  const num = value ?? 0;

  const millionRounded = Math.round(num / 1_000_000) * 1_000_000;
  if (millionRounded !== 0) {
    return formatRoundedAmount(num, 1_000_000);
  }

  return formatRoundedAmount(num, 100_000);
}

// 당월: 십만 단위 반올림
export function formatMonthlyAmount(value: number | null | undefined) {
  const num = value ?? 0;
  return formatRoundedAmount(num, 100_000);
}