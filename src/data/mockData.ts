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