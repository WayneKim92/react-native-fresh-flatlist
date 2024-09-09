import { FlatList, type FlatListProps } from 'react-native';
import { useEffect, useRef, useState } from 'react';

// 남득할만한 interface
// 내 기계는 알아서 딱, 센스 있게 딱!

// 입력 받을 수 있는 props는 오직 하나
// fetchList: (currentPage) => Promise<number>;
// initData: 초기에 fetch 없이 list를 보여주고 싶을 때

/**
 * FreshTrigger
 * - general: 일반적인 상황에서 fetch를 호출한다.
 * - viewed-page: 페이지 이동 후 되돌아 왔을 때에도 fetch하여 해당 페이지를 갱신한다
 */
type FreshTrigger = 'general' | 'viewed-page' | string;
export type FetchType = 'first' | 'previous' | 'current' | 'next';
export type FetchMeta = {
  fetchType: FetchType;
  fetchPage: number;
};
interface FreshFlatListProps<T> extends Omit<FlatListProps<T>, 'data'> {
  freshTriggers?: FreshTrigger[];
  isFocused?: boolean;
  fetchList: ({ fetchPage, fetchType }: FetchMeta) => Promise<{
    fetchType: FetchType;
    list: T[];
  }>;
}

const FreshFlatList = <T,>(props: FreshFlatListProps<T>) => {
  const { renderItem, fetchList, ...otherProps } = props;

  const [data, setData] = useState<T[]>([]);
  const [currentFetchType] = useState<FetchType>('first');
  const currentPageRef = useRef(1);

  useEffect(() => {
    (async () => {
      console.log('fetch 전', {
        currentPage: currentPageRef.current,
        currentFetchType,
      });
      const { list, fetchType } = await fetchList({
        fetchPage: currentPageRef.current,
        fetchType: currentFetchType,
      });

      console.log('fetch 후', {
        currentPage: currentPageRef.current,
        fetchType,
        listLength: list.length,
      });
      setData(list);
    })();
  }, [currentFetchType, fetchList]);

  console.log('렌더링 in FreshFlatList.tsx');

  return (
    <FlatList<T>
      data={data}
      renderItem={renderItem}
      onViewableItemsChanged={(_info) => {
        console.log('onViewableItemsChanged');
      }}
      onEndReachedThreshold={0.5}
      onEndReached={({ distanceFromEnd }) => {
        if (distanceFromEnd === 0) {
          return;
        }
        console.log('onEndReached');
      }}
      contentContainerStyle={{ flexGrow: 1 }}
      {...otherProps}
    />
  );
};

/*
페이지 기반 useCase 나열하자
- 스크롤 끝에 도달하여 다음 페이지를 호출하고 렌더링 해야한다.
- 스크롤 최상단에서 당겨서 내리면 list를 다 지우고 새로운 1페이잔 렌더링 한다.
- 리스트 항목의 상세로 이동하였다가 다시 리스트로 돌아오면, 현재 페이지만 fetch하고 리스트를 렌더링 한다.
 */

export default FreshFlatList;
