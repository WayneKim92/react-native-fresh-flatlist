import { useRef } from 'react';

export const usePageKeyMapper = <T>() => {
  const map = useRef(new Map()).current;

  return {
    set: (page: number, key: T) => {
      map.set(page, key);
    },
    get: (page: number) => map.get(page) as T | undefined,
    getAll: () => Array.from(map.entries()) as T[] | undefined,
    clear: () => map.clear(),
  };
};
