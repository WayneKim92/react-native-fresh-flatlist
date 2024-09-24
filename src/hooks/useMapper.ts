import { useRef } from 'react';

export const useKeyPageMapper = () => {
  const map = useRef(new Map()).current;

  return {
    set: (key: string, page: number) => {
      map.set(key, page);
    },
    get: (key: string) => map.get(key),
    clear: () => map.clear(),
  };
};
