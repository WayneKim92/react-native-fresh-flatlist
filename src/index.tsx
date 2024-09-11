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
export type FetchType = 'first' | 'watching' | 'end-reached';
export type FetchInputMeta<T> = {
  fetchType: FetchType;
  fetchPage: number;
  previousAllData: T[];
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
  /**
   * Reset the list to the initial state.
   */
  reset: () => void;
  /**
   * Refresh the current page of the list.
   * @param index If the index is given, the page containing the index is refreshed. If not, the current page is refreshed.
   */
  refreshWatching: (index: number) => void;
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
    isFocused,
    onEndReachedThreshold = 1,
    ...otherProps
  } = props;

  const [data, setData] = useState<T[]>([]);

  const cache = useRef<Map<number, { data: T[]; timestamp: string }>>(
    new Map()
  ).current;
  const recentlyFetchLastEdgePageRef = useRef(FIRST_PAGE);
  const watchingPagesRef = useRef({ first: FIRST_PAGE, second: FIRST_PAGE });
  const currentStopNextFetchRef = useRef(false);
  const isFirstFetchRef = useRef(true);

  const devLog = useDevLog(devMode);

  devLog('#FreshFlatList | data:', data.length);
  devLog('#FreshFlatList | isFocused:', isFocused);
  devLog(
    '#FreshFlatList | recentlyFetchLastEdgePage:',
    recentlyFetchLastEdgePageRef.current
  );
  devLog('#FreshFlatList | watchingPage:', watchingPagesRef.current);

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

  const joinData = useCallback(
    (fetchData: T[]) => {
      setData((prevState) => {
        const newData = [...prevState, ...fetchData];
        devLog('#data:', newData.length);
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

  const fetchAndCache = useCallback(
    async (fetchType: FetchType, page: number) => {
      devLog('#fetchAndCache | fetchType:', fetchType);
      devLog('#fetchAndCache | fetchPage:', page);

      const { list, isLastPage } = await fetchList({
        fetchPage: page,
        fetchType: fetchType,
        previousAllData: getAllCachedData(),
      });

      const timestamp = new Date().toISOString();
      cache.set(page, { data: list, timestamp });
      return { list, isLastPage };
    },
    [cache, devLog, fetchList, getAllCachedData]
  );

  const refreshWatchingList = useCallback(
    async (index?: number) => {
      let pageFromIndex = 0;
      if (index) {
        let itemCount = 0;
        for (const [page, items] of cache.entries()) {
          itemCount += items.data.length;
          if (index < itemCount) {
            pageFromIndex = page;
            break;
          }
        }
      }

      // 액션이 일어났던 페이지만 새로고침
      if (index) {
        await fetchAndCache('watching', pageFromIndex);
        refreshDataFromCache();
        return;
      }

      // 현재 보이는 페이지가 하나일 때
      const isOnlyOnePageWatching =
        watchingPagesRef.current.first === watchingPagesRef.current.second;
      if (isOnlyOnePageWatching) {
        await fetchAndCache('watching', watchingPagesRef.current.first);
        refreshDataFromCache();
        return;
      }

      if (!isOnlyOnePageWatching) {
        await fetchAndCache('watching', watchingPagesRef.current.first);
        await fetchAndCache('watching', watchingPagesRef.current.second);
        refreshDataFromCache();
        return;
      }
      refreshDataFromCache();
    },
    [cache, fetchAndCache, refreshDataFromCache]
  );

  // Methods that can be controlled from outside the component
  useImperativeHandle(ref, () => ({
    reset: () => {
      resetData();
    },
    refreshWatching: refreshWatchingList,
  }));

  // initial fetch
  useEffect(() => {
    if (isFocused === false) return;
    if (!isFirstFetchRef.current) return;

    devLog('#initial fetch | isFocused', isFocused);
    devLog('#initial fetch | isFirstFetchRef', isFirstFetchRef.current);

    (async () => {
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
      const viewableItemsCount = viewableItems.length;
      if (
        !viewableItems ||
        viewableItemsCount === 0 ||
        !viewableItems[0] ||
        !viewableItems[viewableItemsCount - 1]
      ) {
        return;
      }

      // Get the index of the first visible item
      const firstVisibleItemIndex = viewableItems[0].index;
      const secondVisibleItemIndex =
        // @ts-ignore
        viewableItems[viewableItemsCount - 1].index;
      if (
        firstVisibleItemIndex === null ||
        firstVisibleItemIndex === undefined ||
        secondVisibleItemIndex === null ||
        secondVisibleItemIndex === undefined
      ) {
        return;
      }

      // Iterate through the cache to find the current page
      let itemCount = 0;
      let findFirstPage = false;
      let findSecondPage = false;
      for (const [page, items] of cache.entries()) {
        itemCount += items.data.length;
        if (!findFirstPage && firstVisibleItemIndex < itemCount) {
          findFirstPage = true;
          watchingPagesRef.current = {
            ...watchingPagesRef.current,
            first: page,
          };
        }
        if (!findSecondPage && secondVisibleItemIndex < itemCount) {
          findSecondPage = true;
          watchingPagesRef.current = {
            ...watchingPagesRef.current,
            second: page,
          };
        }
        if (findFirstPage && findSecondPage) {
          break;
        }
      }

      // devLog('#FreshFlatList | firstVisibleItemIndex:', firstVisibleItemIndex);
      // devLog('#FreshFlatList | lastVisibleItemIndex:', secondVisibleItemIndex);
      // devLog('#FreshFlatList | watchingPages:', watchingPagesRef.current);
    },
    [cache]
  );

  // fresh current page when new screen focused, Ignore first screen focused
  useEffect(() => {
    if (isFocused === undefined || isFirstFetchRef.current) return;
    isFirstFetchRef.current = false;

    if (isFocused) {
      devLog('#fetch when screen focused');
      refreshWatchingList();
    }
  }, [
    devLog,
    fetchAndCache,
    fetchList,
    isFocused,
    joinData,
    refreshDataFromCache,
    refreshWatchingList,
  ]);

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
