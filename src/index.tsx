import { FlatList, type FlatListProps } from 'react-native';
import { useState } from 'react';

interface ExtendedFlatListProps<T> extends FlatListProps<T> {
  initData: T[];
}

const FreshFlatList = <T,>(props: Omit<ExtendedFlatListProps<T>, 'data'>) => {
  const { initData, renderItem } = props;

  const [data, _setData] = useState<T[]>(initData);

  return <FlatList<T> data={data} renderItem={renderItem} />;
};

export default FreshFlatList;
