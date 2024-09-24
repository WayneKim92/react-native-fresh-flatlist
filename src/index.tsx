// 코드가 길어지니 함수형 컴포넌트가 더 복잡한 거 같다. 클래스로 바꾸는게 나을까? useEffect의 의존성 배열에 값이 많아지니 문제다...
import {
  type FlatListProps,
  FlatList,
  Animated,
  View,
  ActivityIndicator,
} from 'react-native';
import {
  type ComponentType,
  type ForwardedRef,
  type ReactNode,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import { useDevLog } from './hooks/useDevLog';
import { type ViewToken } from '@react-native/virtualized-lists';

// List of RN types that are not exported from the RN package
type onEndReachedParam = { distanceFromEnd: number };
type onViewableItemsChangedParam<T> = {
  // @ts-ignore 구버전 RN에서 제네릭이 아닌 케이스 있음
  viewableItems: Array<ViewToken<T>>;
  // @ts-ignore 구버전 RN에서 제네릭이 아닌 케이스 있음
  changed: Array<ViewToken<T>>;
};

// list of constants
const FIRST_PAGE = 1;

// Type of FreshFlatList
type CacheType<T> = Map<number, { data: T[]; timestamp: string }>;
export type FetchType = 'first' | 'watching' | 'end-reached';
export type FetchInputMeta<T> = {
  fetchType: FetchType;
  fetchPage: number;
  previousAllData: T[];
};
export type FetchOutputMeta<T> = Promise<{
  list: T[];
  isLastPage: boolean;
  isRenderReady?: boolean;
}>;

export interface FreshFlatListProps<T>
  extends Omit<FlatListProps<T>, 'data' | 'onEndReached' | 'keyExtractor'> {
  isFocused?: boolean;
  fetchList: (fetchInputMeta: FetchInputMeta<T>) => FetchOutputMeta<T>;
  devMode?: boolean;
  fetchCoolTime?: number;
  unshiftData?: T[];
  FlatListComponent?:
    | ComponentType<FlatListProps<T>>
    | typeof Animated.FlatList<T>;
  LoadingComponent?: ReactNode;
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
  refreshWatching: (index?: number) => void;
  /**
   * Get the FlatList component.
   */
  flatList: FlatList<any> | null;
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
    onEndReachedThreshold = 0.5,
    fetchCoolTime = 1000,
    FlatListComponent = FlatList,
    LoadingComponent,
    unshiftData,
    ...otherProps
  } = props;

  const flatListRef = useRef<FlatList>(null);

  const [isLoading, setIsLoading] = useState<Boolean>(true);
  const [data, setData] = useState<T[]>([]);

  const cache = useRef<CacheType<T>>(new Map()).current;
  const isFetchingFirstPageRef = useRef(false);
  const isFetchingLastEdgePageRef = useRef(false);
  const recentlyFetchLastEdgePageRef = useRef(FIRST_PAGE);
  const watchingPagesRef = useRef({ first: FIRST_PAGE, second: FIRST_PAGE });
  const stopNextFetchRef = useRef(false);
  const isFirstFetchRef = useRef(true);
  const previousIsFocused = useRef(isFocused);

  const devLog = useDevLog(devMode);

  // devLog('#FreshFlatList | data:', data.length);
  // devLog('#FreshFlatList | isFocused:', isFocused);
  // devLog(
  //   '#FreshFlatList | recentlyFetchLastEdgePage:',
  //   recentlyFetchLastEdgePageRef.current
  // );
  // devLog('#FreshFlatList | watchingPage:', watchingPagesRef.current);

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

  const reset = useCallback(() => {
    recentlyFetchLastEdgePageRef.current = FIRST_PAGE;
    watchingPagesRef.current = { first: FIRST_PAGE, second: FIRST_PAGE };
    isFirstFetchRef.current = true;
    stopNextFetchRef.current = false;
    cache.clear();
    setIsLoading(true);
    setData([]);
    devLog('#reset', {
      recentlyFetchLastEdgePage: recentlyFetchLastEdgePageRef.current,
      watchingPages: watchingPagesRef.current,
      isFirstFetch: isFirstFetchRef.current,
      stopNextFetch: stopNextFetchRef.current,
      cache: cache.size,
      data: data.length,
      isLoading,
    });
  }, [cache, data.length, devLog, isLoading]);

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

      // 불필요한 리스트 fetch 방지
      const currentTime = Date.now();
      const cacheEntry = cache.get(page);
      if (
        cacheEntry &&
        currentTime - new Date(cacheEntry.timestamp).getTime() < fetchCoolTime
      ) {
        devLog(
          '#fetchAndCache | 중복 호출 방지 | fetchCoolTime:',
          currentTime - new Date(cacheEntry.timestamp).getTime()
        );
        return { list: [], isLastPage: false };
      }
      cache.set(page, {
        data: [],
        timestamp: new Date().toISOString(),
      });

      // fetch
      const { list, isLastPage } = await fetchList({
        fetchPage: page,
        fetchType: fetchType,
        previousAllData: getAllCachedData(),
      });
      setIsLoading(false);
      cache.set(page, {
        data: list,
        timestamp: new Date().toISOString(),
      });
      return { list, isLastPage };
    },
    [cache, devLog, fetchCoolTime, fetchList, getAllCachedData]
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
      devLog('#isOnlyOnePageWatching | index', index);

      // 액션이 일어났던 페이지만 새로고침
      if (index) {
        await fetchAndCache('watching', pageFromIndex);
        refreshDataFromCache();
        return;
      }

      // 현재 보이는 페이지가 하나일 때
      const isOnlyOnePageWatching =
        watchingPagesRef.current.first === watchingPagesRef.current.second;

      // devLog('#isOnlyOnePageWatching', isOnlyOnePageWatching);

      if (isOnlyOnePageWatching) {
        await fetchAndCache('watching', watchingPagesRef.current.first);
        refreshDataFromCache();
        return;
      }

      if (!isOnlyOnePageWatching) {
        await Promise.all([
          fetchAndCache('watching', watchingPagesRef.current.first),
          fetchAndCache('watching', watchingPagesRef.current.second),
        ]);
        // devLog(
        //   '#refreshWatchingList | isOnlyOnePageWatching:',
        //   isOnlyOnePageWatching
        // );
        refreshDataFromCache();
        return;
      }
      refreshDataFromCache();
    },
    [cache, devLog, fetchAndCache, refreshDataFromCache]
  );

  // Methods that can be controlled from outside the component
  useImperativeHandle(ref, () => ({
    reset,
    refreshWatching: refreshWatchingList,
    flatList: flatListRef.current,
  }));

  // #리스트가 비어있는 상태에서 리스트 첫페이지 가져오기
  useEffect(() => {
    if (isFocused === false) {
      devLog('#initial fetch | 포커스 아웃 상태');
      return;
    }
    if (data.length !== 0) {
      devLog(
        '#initial fetch | 데이터가 없는 상태가 아니라서 첫페이지 로딩 타임이 아님'
      );
      return;
    }
    if (!isFirstFetchRef.current) {
      devLog('#initial fetch | 이미 첫페이지가 로드되어 있음');
      return;
    }
    isFirstFetchRef.current = false;

    (async () => {
      devLog('#initial fetch | start fetch first page');
      isFetchingFirstPageRef.current = true;
      const { list } = await fetchAndCache('first', FIRST_PAGE);
      isFetchingFirstPageRef.current = false;
      joinData(list);
    })();
  }, [data, devLog, fetchAndCache, fetchList, isFocused, joinData]);

  // fetch when end reached
  const handleOnEndReached = async ({ distanceFromEnd }: onEndReachedParam) => {
    if (distanceFromEnd === 0) {
      return;
    }
    devLog('#onEndReached');

    if (isFetchingFirstPageRef.current) {
      devLog('#stoped fetch in onEndReached: first page already fetching');
      return;
    }

    if (stopNextFetchRef.current) {
      devLog('#stoped fetch in onEndReached: list is already last page');
      return;
    }

    if (isFetchingLastEdgePageRef.current) {
      devLog('#stoped fetch in onEndReached: already fetching');
      return;
    }
    devLog('#start fetch in onEndReached');
    isFetchingLastEdgePageRef.current = true;
    recentlyFetchLastEdgePageRef.current += 1;
    const { list, isLastPage } = await fetchAndCache(
      'end-reached',
      recentlyFetchLastEdgePageRef.current
    );
    isFetchingLastEdgePageRef.current = false;

    if (isLastPage) stopNextFetchRef.current = true;
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

  // #스크린 재진입이 발생하였을 때, 새로고침
  useEffect(() => {
    devLog('#new screen focused:', isFocused);

    if (isFocused === undefined) {
      devLog('#스크린 재진입 효과 | 포커스 아웃 상태', isFocused);
      return;
    }
    if (previousIsFocused.current) {
      devLog('#스크린 재진입 효과 | 이미 포커스 인 상태', isFocused);
      previousIsFocused.current = isFocused;
      return;
    }
    previousIsFocused.current = isFocused;
    if (isFocused) {
      devLog(
        '#스크린 재진입이 발생하여서 현재 보고 있는 페이지의 리스트만 새로고침을 합니다.'
      );
      refreshWatchingList();
    }
  }, [devLog, isFocused, joinData, refreshWatchingList]);

  return (
    <>
      {/* @ts-ignore */}
      <FlatListComponent<T>
        ref={flatListRef}
        keyExtractor={keyExtractor}
        data={unshiftData ? [...unshiftData, ...data] : data}
        renderItem={renderItem}
        onEndReachedThreshold={onEndReachedThreshold}
        onEndReached={handleOnEndReached}
        onViewableItemsChanged={handleOnViewableItemsChanged}
        {...otherProps}
      />

      {isLoading &&
        (LoadingComponent ? (
          LoadingComponent
        ) : (
          <View
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <ActivityIndicator />
          </View>
        ))}
    </>
  );
}

export default forwardRef(FreshFlatList) as <T>(
  props: FreshFlatListProps<T> & {
    ref?: ForwardedRef<FreshFlatListRef> | MutableRefObject<FreshFlatListRef>;
  }
) => ReturnType<typeof FreshFlatList>;

export { useDevLog } from './hooks/useDevLog';
export { useKeyPageMapper } from './hooks/useMapper';
