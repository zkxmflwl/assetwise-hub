export const formatKRW = (value: number): string => {
  if (Math.abs(value) >= 100000000) {
    return `${(value / 100000000).toFixed(1)}억`;
  }
  if (Math.abs(value) >= 10000) {
    return `${(value / 10000000).toFixed(0)}천만`;
  }
  return value.toLocaleString('ko-KR');
};
