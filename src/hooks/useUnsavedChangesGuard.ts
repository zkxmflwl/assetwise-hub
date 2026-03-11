import { useEffect, useCallback } from 'react';
import { useBlocker } from 'react-router-dom';

export function useUnsavedChangesGuard(hasDirty: boolean) {
  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) =>
        hasDirty && currentLocation.pathname !== nextLocation.pathname,
      [hasDirty],
    ),
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      const confirmed = window.confirm('저장하지 않은 데이터가 있습니다. 이동하시겠습니까?');
      if (confirmed) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);

  return blocker;
}
