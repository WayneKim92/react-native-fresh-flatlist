import { useCallback, useEffect, useRef, useState } from 'react';
import FreshFlatList, {
  type FetchInputMeta,
  type FetchOutputMeta,
  type FreshFlatListRef,
} from 'react-native-fresh-flatlist';
import {
  Button,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
import { Row } from '@wayne-kim/react-native-layout';

type Data = 'tabs' | Board;

export default function ReanimatedListScreen() {
  const [category, setCategory] = useState('ALL');
  const [size, setSize] = useState(20);
  const previousSize = useRef(size);
  const [ownerId, setOwnerId] = useState(29);
  const previousOwnerId = useRef(ownerId);
  const freshFlatListRef = useRef<FreshFlatListRef>(null);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();

  const lastScrollYRef = useRef(0);
  const offsetY = useSharedValue(0);
  const translateY = useSharedValue(0);
  const [headerHeight, setHeaderHeight] = useState<number>(0);

  // 다른 상태값에 의해 한번더 렌더링 되는 케이스 추가
  const [_extraState, setExtraState] = useState(0);

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
    ({ item, index }: { item: Data; index: number }) => {
      if (item === 'tabs') {
        return <View style={{ height: 50, backgroundColor: 'blue' }} />;
      }

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
            style={{
              backgroundColor: 'black',
              padding: 4,
              alignSelf: 'flex-start',
            }}
            onPress={() => {
              // If you want to refresh the page to which the item belongs after changing the status of the item.
              // Example)
              freshFlatListRef.current?.refreshWatching(index);
            }}
          >
            <Text style={{ color: 'white' }}>LIKE!</Text>
          </Pressable>
        </Pressable>
      );
    },
    [navigation]
  );

  const fetchList = useCallback(
    async (fetchInputMeta: FetchInputMeta<Data>): FetchOutputMeta<Data> => {
      const { fetchPage, fetchType } = fetchInputMeta;

      const response = await fetchWithTimeout(
        `${config.api}boards?contentType=BOARD&ownerId=${ownerId}&category=${category}&page=${fetchPage}&size=${size}&sort=createdAt`
      );

      const data: {
        boardList: Array<Data>;
        isLast: boolean;
      } = await response.json();

      let list: Data[] = [];
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
    // If you want to rest the list when ownerId is changed
    if (previousOwnerId.current !== ownerId) {
      previousOwnerId.current = ownerId;
      freshFlatListRef.current?.reset();
    }

    // If you want to rest the list when size is changed
    if (previousSize.current !== size) {
      previousSize.current = size;
      freshFlatListRef.current?.reset();
    }

    setTimeout(() => {
      freshFlatListRef.current?.refreshWatching();
      setExtraState((prev) => prev + 1);
    }, 100);
  }, [ownerId, size]);

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
        <Row flexGrow={1} alignItems={'center'}>
          <Button title={'-'} onPress={() => setSize(size - 10)} />
          <Text>{`Size: ${size}`}</Text>
          <Button title={'+'} onPress={() => setSize(size + 10)} />
        </Row>
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
          }}
        >
          <Pressable
            onPress={() => {
              if (freshFlatListRef.current) {
                const flatList = freshFlatListRef.current.flatList;

                if (flatList) {
                  flatList.scrollToIndex({ index: 0 });
                }
              }
            }}
            style={{
              padding: 8,
              marginRight: 16,
              marginBottom: 16,

              backgroundColor: 'black',
            }}
          >
            <Text style={{ color: 'white' }}>TOP</Text>
          </Pressable>
        </View>
      </Reanimated.View>
      <FreshFlatList<'tabs' | Board>
        ref={freshFlatListRef}
        isFocused={isFocused}
        unshiftData={['tabs']}
        fetchList={fetchList}
        renderItem={renderItem}
        devMode={true}
        onScroll={scrollHandler}
        refreshing={false}
        onRefresh={() => {
          freshFlatListRef.current?.reset();
        }}
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
        FlatListComponent={Reanimated.FlatList}
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
