import { useCallback } from 'react';

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
