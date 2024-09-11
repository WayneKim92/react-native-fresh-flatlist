import { useCallback, useEffect, useRef, useState } from 'react';
import FreshFlatList, {
  type FetchInputMeta,
  type FreshFlatListRef,
} from 'react-native-fresh-flatlist';
import {
  Button,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import TestInputText from '../components/TestInputText';
import type { Board, RootStackParamList } from '../types';
import { fetchWithTimeout } from '../utils/functions';
import config from '../ignore/config.json';
import {
  useNavigation,
  type NavigationProp,
  useIsFocused,
} from '@react-navigation/native';

export default function ListScreen() {
  const [category, setCategory] = useState('ALL');
  const [size, setSize] = useState(10);
  const [ownerId, setOwnerId] = useState(29);
  const previousOwnerId = useRef(ownerId);
  const freshFlatListRef = useRef<FreshFlatListRef>(null);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();

  const renderItem = useCallback(
    ({ item, index }: { item: Board; index: number }) => {
      return (
        <Pressable
          style={{ backgroundColor: 'gray', gap: 8, padding: 12 }}
          onPress={() => navigation.navigate('DetailScreen', { item })}
        >
          <View style={{ flexDirection: 'row' }}>
            <Image
              source={{ uri: item.writerImage }}
              style={{ width: 50, height: 50, borderRadius: 25 }}
            />
            <View style={{ paddingLeft: 8 }}>
              <Text>{item.writerSpaceName}</Text>
              <Text>@{item.writerHandle}</Text>
            </View>
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text style={{ fontWeight: 'bold' }}>index : {index}</Text>
              <Text>{item.content}</Text>
            </View>

            {item.imageList && item.imageList.length > 0 && (
              <Image
                source={{ uri: item.imageList[0] }}
                style={{ width: 75, height: 75, borderRadius: 8 }}
              />
            )}
          </View>

          <View>
            <Button
              title={'좋아요!'}
              onPress={() => {
                // If you want to refresh the page to which the item belongs after changing the status of the item.
                // Example)
                freshFlatListRef.current?.refreshWatching(index);
              }}
            />
          </View>
        </Pressable>
      );
    },
    [navigation]
  );

  const fetchList = useCallback(
    async (fetchInputMeta: FetchInputMeta<Board>) => {
      const { fetchPage } = fetchInputMeta;

      const response = await fetchWithTimeout(
        `${config.api}boards?contentType=BOARD&ownerId=${ownerId}&category=${category}&page=${fetchPage}&size=${size}&sort=createdAt`
      );

      const data: {
        boardList: Array<Board>;
        isLast: boolean;
      } = await response.json();

      let list: Board[] = [];
      if (data && data.boardList && data.boardList.length > 0) {
        list = data.boardList;
      }

      return {
        list: list as Board[],
        isLastPage: data.isLast,
      };
    },
    [category, ownerId, size]
  );

  useEffect(() => {
    // Example)
    // If you want to rest the list when ownerId is changed
    if (previousOwnerId.current !== ownerId) {
      previousOwnerId.current = ownerId;
      // freshFlatListRef.current?.reset();
    }
  }, [ownerId]);

  return (
    <SafeAreaView style={$styles.container}>
      <View style={$styles.textController}>
        <TestInputText
          label={'Owner Id'}
          value={ownerId.toString()}
          onChangeValue={(value) => setOwnerId(Number(value))}
          placeholder={'Order Id'}
        />
        <TestInputText
          label={'카테고리'}
          value={'ALL'}
          onChangeValue={setCategory}
          placeholder={'카테고리'}
        />
        <TestInputText
          label={'Size '}
          value={size.toString()}
          onChangeValue={(value) => setSize(Number(value))}
          placeholder={'개수'}
        />
      </View>
      <FreshFlatList<Board>
        ref={freshFlatListRef}
        isFocused={isFocused}
        fetchList={fetchList}
        renderItem={renderItem}
        devMode={true}
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          gap: 12,
        }}
      />
    </SafeAreaView>
  );
}
ListScreen.display = 'ListScreen';

const $styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  textController: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
