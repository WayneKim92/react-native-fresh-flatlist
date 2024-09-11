import { FlatList, type FlatListProps } from 'react-native';
import {
  type ForwardedRef,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { useDevLog } from './hooks/useDevLog';
import type { ViewToken } from '@react-native/virtualized-lists';

// 남득할만한 interface
// 내 기계는 알아서 딱, 센스 있게 딱!

// 입력 받을 수 있는 props는 오직 하나
// fetchList: (currentPage) => Promise<number>;
// initData: 초기에 fetch 없이 list를 보여주고 싶을 때

// RN 타입 중 export 안 되어 있는 타입만 여기에 나열하자
type onEndReachedParam = { distanceFromEnd: number };
type onViewableItemsChangedParam<T> = {
  viewableItems: Array<ViewToken<T>>;
  changed: Array<ViewToken<T>>;
};

// 상수 목록
const FIRST_PAGE = 1;
/**
 * FreshTrigger
 * - general: 일반적인 상황에서 fetch를 호출한다.
 * - viewed-page: 페이지 이동 후 되돌아 왔을 때에도 fetch하여 해당 페이지를 갱신한다
 */
type FreshTrigger = 'general' | 'viewed-page' | string;
export type FetchType = 'first' | 'current' | 'end-reached';
export type FetchInputMeta<T> = {
  fetchType: FetchType;
  fetchPage: number;
  previousList: T[];
};
export type FetchOutputMeta<T> = Promise<{
  list: T[];
  isLastPage: boolean;
}>;

interface FreshFlatListProps<T>
  extends Omit<FlatListProps<T>, 'data' | 'onEndReached'> {
  freshTriggers?: FreshTrigger[];
  isFocused?: boolean;
  fetchList: (fetchInputMeta: FetchInputMeta<T>) => FetchOutputMeta<T>;
  devMode?: boolean;
}
export interface FreshFlatListRef {
  reset: () => void;
}

function FreshFlatList<T>(
  props: FreshFlatListProps<T>,
  ref: ForwardedRef<FreshFlatListRef>
) {
  const {
    renderItem,
    fetchList,
    devMode,
    isFocused = null,
    onEndReachedThreshold = 1,
    ...otherProps
  } = props;

  const cache = useRef<Map<number, T[]>>(new Map()).current;
  const [data, setData] = useState<T[]>([]);
  const previousListRef = useRef(data);
  const recentlyFetchLastEdgePageRef = useRef(FIRST_PAGE);
  const currentPageRef = useRef(FIRST_PAGE);
  const currentStopNextFetchRef = useRef(false);

  const isFirstFetchRef = useRef(true);

  const devLog = useDevLog(devMode);

  devLog('#FreshFlatList | data:', data.length);
  devLog('#FreshFlatList | isFocused:', isFocused);
  devLog(
    '#FreshFlatList | recentlyFetchLastEdgePage:',
    recentlyFetchLastEdgePageRef.current
  );
  devLog('#FreshFlatList | currentPage:', currentPageRef.current);

  const fetchAndCache = useCallback(
    async (fetchType: FetchType, page: number) => {
      const { list, isLastPage } = await fetchList({
        fetchPage: page,
        fetchType: fetchType,
        previousList: previousListRef.current,
      });

      cache.set(page, list);
      return { list, isLastPage };
    },
    [cache, fetchList]
  );

  const joinData = useCallback(
    (fetchData: T[]) => {
      setData((prevState) => {
        const newData = [...prevState, ...fetchData];
        devLog('#data:', newData.length);
        previousListRef.current = newData;
        return newData;
      });
    },
    [devLog]
  );

  const resetData = useCallback(() => {
    setData([]);
    recentlyFetchLastEdgePageRef.current = FIRST_PAGE;
  }, []);

  const getAllCachedData = useCallback(() => {
    let allData: T[] = [];
    cache.forEach((pageData) => {
      allData = [...allData, ...pageData];
    });
    return allData;
  }, [cache]);

  const refreshDataFromCache = useCallback(() => {
    setData(getAllCachedData());
  }, [getAllCachedData]);

  // Methods that can be controlled from outside the component
  useImperativeHandle(ref, () => ({
    reset: () => {
      resetData();
    },
  }));

  // initial fetch
  useEffect(() => {
    if (isFocused === false) return;
    if (!isFirstFetchRef.current) return; // 값 변경은 "fresh current page when new screen focused"에서 처리

    (async () => {
      devLog('initial fetch');
      const { list } = await fetchAndCache('first', FIRST_PAGE);
      joinData(list);
    })();
  }, [devLog, fetchAndCache, fetchList, isFocused, joinData]);

  // fetch when end reached
  const handleOnEndReached = async ({ distanceFromEnd }: onEndReachedParam) => {
    if (distanceFromEnd === 0) {
      return;
    }
    devLog('#onEndReached');

    if (currentStopNextFetchRef.current) {
      devLog('#stoped fetch in onEndReached: list is already last page');
      return;
    }

    devLog('#start fetch in onEndReached');

    recentlyFetchLastEdgePageRef.current += 1;
    const { list, isLastPage } = await fetchAndCache(
      'end-reached',
      recentlyFetchLastEdgePageRef.current
    );
    if (isLastPage) currentStopNextFetchRef.current = true;
    joinData(list);
  };

  // monitor current page
  const handleOnViewableItemsChanged = useCallback(
    ({ viewableItems }: onViewableItemsChangedParam<T>) => {
      if (!viewableItems || viewableItems.length === 0 || !viewableItems[0])
        return;

      // Get the index of the first visible item
      const firstVisibleItemIndex = viewableItems[0].index;

      if (firstVisibleItemIndex) {
        let itemCount = 0;

        // Iterate through the cache to find the current page
        for (const [page, items] of cache.entries()) {
          itemCount += items.length;
          if (firstVisibleItemIndex < itemCount) {
            currentPageRef.current = page;
            break;
          }
        }
      }
    },
    [cache]
  );

  // fresh current page when new screen focused, Ignore first screen focused
  useEffect(() => {
    if (isFocused === null) return;
    if (isFirstFetchRef.current) {
      isFirstFetchRef.current = false;
      return;
    }

    if (isFocused) {
      devLog('#fetch when screen focused');

      (async () => {
        await fetchAndCache('current', currentPageRef.current);
        refreshDataFromCache();
      })();
    }
  }, [
    devLog,
    fetchAndCache,
    fetchList,
    isFocused,
    joinData,
    refreshDataFromCache,
  ]);

  devLog('#render in FreshFlatList');

  return (
    <FlatList<T>
      data={data}
      renderItem={renderItem}
      onEndReachedThreshold={onEndReachedThreshold}
      onEndReached={handleOnEndReached}
      onViewableItemsChanged={handleOnViewableItemsChanged}
      {...otherProps}
    />
  );
}

export default forwardRef(FreshFlatList) as <T>(
  props: FreshFlatListProps<T> & { ref?: ForwardedRef<FreshFlatListRef> }
) => ReturnType<typeof FreshFlatList>;

/*
페이지 기반 useCase 나열하자
- 스크롤 끝에 도달하여 다음 페이지를 호출하고 렌더링 해야한다.
- 스크롤 최상단에서 당겨서 내리면 list를 다 지우고 새로운 1페이잔 렌더링 한다.
- 리스트 항목의 상세로 이동하였다가 다시 리스트로 돌아오면, 현재 페이지만 fetch하고 리스트를 렌더링 한다.
 */
export { useDevLog } from './hooks/useDevLog';
