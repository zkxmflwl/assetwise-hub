import { useEffect } from 'react';
import { useBlocker, useBeforeUnload } from 'react-router-dom';

export function useUnsavedChangesGuard(hasDirty: boolean) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasDirty && currentLocation.pathname !== nextLocation.pathname
  );

  useBeforeUnload(
    (event) => {
      if (!hasDirty) return;
      event.preventDefault();
      event.returnValue = '';
    },
    { capture: true }
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;

    const confirmed = window.confirm(
      '저장하지 않은 데이터가 있습니다. 이동하시겠습니까?'
    );

    if (confirmed) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker.state]);

  return blocker;
}
