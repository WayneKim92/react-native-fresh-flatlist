import { useCallback, useEffect, useRef, useState } from 'react';
import FreshFlatList, {
  type FetchInputMeta,
  type FetchOutputMeta,
  type FreshFlatListRef,
} from 'react-native-fresh-flatlist';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import TestInputText from '../components/TestInputText';
import type { Board, RootStackParamList } from '../types';
import { fetchWithTimeout } from '../utils/functions';
import config from '../config.json';
import {
  useNavigation,
  type NavigationProp,
  useIsFocused,
} from '@react-navigation/native';
import {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Reanimated from 'react-native-reanimated';

export default function ReanimatedListScreen() {
  const [category, setCategory] = useState('ALL');
  const [size, setSize] = useState(10);
  const [ownerId, setOwnerId] = useState(29);
  const previousOwnerId = useRef(ownerId);
  const freshFlatListRef = useRef<FreshFlatListRef>(null);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();

  const lastScrollYRef = useRef(0);
  const offsetY = useSharedValue(0);
  const translateY = useSharedValue(0);
  const [headerHeight, setHeaderHeight] = useState<number>(0);

  const animatedStyle = useAnimatedStyle(() => {
    const currentScrollY = offsetY.value;
    const deltaY = Math.round(currentScrollY - lastScrollYRef.current);
    lastScrollYRef.current = currentScrollY;

    let direction = null;
    if (deltaY > 0) {
      direction = 'down';
    }
    if (deltaY < 0) {
      direction = 'up';
    }

    if (direction === 'up' && offsetY.value > headerHeight && deltaY !== null) {
      translateY.value = withTiming(0);
    } else if (
      direction === 'down' &&
      offsetY.value > headerHeight &&
      deltaY !== null
    ) {
      translateY.value = withTiming(-headerHeight);
    }

    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const scrollHandler = useAnimatedScrollHandler((event) => {
    offsetY.value = event.contentOffset.y;
  });

  const renderItem = useCallback(
    ({ item, index }: { item: Board; index: number }) => {
      return (
        <Pressable
          style={{ backgroundColor: 'gray', gap: 8, padding: 12 }}
          onPress={() => navigation.navigate('DetailScreen', { item })}
        >
          <View>
            <Text style={{ fontWeight: 'bold' }}>index : {index}</Text>
            <Text>{item.content}</Text>
          </View>

          <Pressable
            onPress={() => {
              // If you want to refresh the page to which the item belongs after changing the status of the item.
              // Example)
              freshFlatListRef.current?.refreshWatching(index);
            }}
          >
            <Text>LIKE!</Text>
          </Pressable>
        </Pressable>
      );
    },
    [navigation]
  );

  const fetchList = useCallback(
    async (fetchInputMeta: FetchInputMeta<Board>): FetchOutputMeta<Board> => {
      const { fetchPage, fetchType } = fetchInputMeta;

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
        isRenderReady: fetchType === 'first' ? true : undefined,
      };
    },
    [category, ownerId, size]
  );

  useEffect(() => {
    // Example)
    // If you want to rest the list when ownerId is changed
    if (previousOwnerId.current !== ownerId) {
      previousOwnerId.current = ownerId;
      freshFlatListRef.current?.reset();
    }
  }, [ownerId]);

  return (
    <SafeAreaView style={$styles.container}>
      <Reanimated.View
        style={[
          $styles.textController,
          {
            backgroundColor: 'white',
            zIndex: 1,
          },
          animatedStyle,
        ]}
        onLayout={(event) => {
          setHeaderHeight(event.nativeEvent.layout.height);
        }}
      >
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
      </Reanimated.View>
      <FreshFlatList<Board>
        ref={freshFlatListRef}
        isFocused={isFocused}
        fetchList={fetchList}
        renderItem={renderItem}
        devMode={true}
        FlatListComponent={Reanimated.FlatList}
        onScroll={scrollHandler}
        style={[
          {
            flex: 1,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
            paddingTop: headerHeight,
          },
        ]}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          gap: 12,
        }}
      />
    </SafeAreaView>
  );
}
ReanimatedListScreen.display = 'ReanimatedListScreen';

const $styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  textController: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
