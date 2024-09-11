import { useCallback } from 'react';

/**
 * 개발용 로그를 출력합니다. 개발 중 발생한 버그를 추적할 때 사용합니다.
 * @deprecated
 * 본 프로젝트 외에서 사용하는 것은 추천하지 않습니다. 라이브러리가 안정화 되면 삭제될 수 있습니다.
 */
export const useDevLog = (showDevLog: boolean = false) => {
  return useCallback(
    (...arg: any[]) => {
      if (showDevLog) {
        console.log(...arg);
      }
    },
    [showDevLog]
  );
};
