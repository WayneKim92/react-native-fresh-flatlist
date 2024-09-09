import { FlatList, type FlatListProps } from 'react-native';
import { useEffect, useRef, useState } from 'react';

// 남득할만한 interface
// 내 기계는 알아서 딱, 센스 있게 딱!

// 입력 받을 수 있는 props는 오직 하나
// fetchList: (currentPage) => Promise<number>;
// initData: 초기에 fetch 없이 list를 보여주고 싶을 때

// RN 타입 중 export 안 되어 있는 타입만 여기에 나열하자
type onEndReachedParam = { distanceFromEnd: number };

/**
 * FreshTrigger
 * - general: 일반적인 상황에서 fetch를 호출한다.
 * - viewed-page: 페이지 이동 후 되돌아 왔을 때에도 fetch하여 해당 페이지를 갱신한다
 */
type FreshTrigger = 'general' | 'viewed-page' | string;
export type FetchType = 'first' | 'previous' | 'current' | 'next';
export type FetchInputMeta = {
  // fetchType: FetchType;
  fetchPage: number;
};
export type FetchOutputMeta<T> = Promise<{
  // fetchType: FetchType;
  list: T[];
  isLastPage: boolean;
}>;
interface FreshFlatListProps<T> extends Omit<FlatListProps<T>, 'data'> {
  freshTriggers?: FreshTrigger[];
  isFocused?: boolean;
  fetchList: (fetchInputMeta: FetchInputMeta) => FetchOutputMeta<T>;
}

const FreshFlatList = <T,>(props: FreshFlatListProps<T>) => {
  const { renderItem, fetchList, ...otherProps } = props;

  const [data, setData] = useState<T[]>([]);
  const currentPageRef = useRef(1);

  // initial fetch
  useEffect(() => {
    (async () => {
      console.log('initial fetch');
      const { list } = await fetchList({
        fetchPage: currentPageRef.current,
        // fetchType: currentFetchTypeRef.current,
      });
      setData((prevState) => [...prevState, ...list]);
    })();
  }, [fetchList]);

  // fetch when end reached
  const handleOnEndReached = async ({ distanceFromEnd }: onEndReachedParam) => {
    if (distanceFromEnd === 0) {
      return;
    }
    console.log('onEndReached');
    currentPageRef.current += 1;
    const { list } = await fetchList({
      fetchPage: currentPageRef.current,
    });
    setData((prevState) => [...prevState, ...list]);
  };

  return (
    <FlatList<T>
      data={data}
      renderItem={renderItem}
      onEndReachedThreshold={0.5}
      onEndReached={handleOnEndReached}
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
