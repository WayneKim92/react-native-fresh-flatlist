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

// List of RN types that are not exported from the RN package
type onEndReachedParam = { distanceFromEnd: number };
type onViewableItemsChangedParam<T> = {
  viewableItems: Array<ViewToken<T>>;
  changed: Array<ViewToken<T>>;
};

// list of constants
const FIRST_PAGE = 1;

// Type of FreshFlatList
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
  extends Omit<FlatListProps<T>, 'data' | 'onEndReached' | 'keyExtractor'> {
  isFocused?: boolean;
  fetchList: (fetchInputMeta: FetchInputMeta<T>) => FetchOutputMeta<T>;
  devMode?: boolean;
}
export interface FreshFlatListRef {
  reset: () => void;
}

// Define FreshFlatList
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

  const [data, setData] = useState<T[]>([]);

  const cache = useRef<Map<number, { data: T[]; timestamp: string }>>(
    new Map()
  ).current;
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

  const keyExtractor = useCallback(
    (_item: T, index: number) => {
      let itemIndex = index;
      let pageIndex = 1;
      let timestamp = '';

      for (const [page, pageData] of cache.entries()) {
        if (itemIndex < pageData.data.length) {
          pageIndex = page;
          timestamp = pageData.timestamp;
          break;
        }
        itemIndex -= pageData.data.length;
      }

      return `${pageIndex}-${itemIndex}-${timestamp}`;
    },
    [cache]
  );

  const fetchAndCache = useCallback(
    async (fetchType: FetchType, page: number) => {
      const { list, isLastPage } = await fetchList({
        fetchPage: page,
        fetchType: fetchType,
        previousList: previousListRef.current,
      });

      const timestamp = new Date().toISOString();
      cache.set(page, { data: list, timestamp });
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
      allData = [...allData, ...pageData.data];
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
          itemCount += items.data.length;
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
      keyExtractor={keyExtractor}
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

export { useDevLog } from './hooks/useDevLog';
