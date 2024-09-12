import {
  type ForwardedRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import FreshFlatList, {
  type FetchInputMeta,
  type FreshFlatListProps,
  type FreshFlatListRef,
} from 'react-native-fresh-flatlist';
import {
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
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

const AnimatedFreshFlatList = Animated.createAnimatedComponent(
  FreshFlatList
) as <T>(
  props: FreshFlatListProps<T> & { ref?: ForwardedRef<FreshFlatListRef> }
) => ReturnType<typeof FreshFlatList>;

export default function AnimatedListScreen() {
  const [category, setCategory] = useState('ALL');
  const [size, setSize] = useState(10);
  const [ownerId, setOwnerId] = useState(29);
  const previousOwnerId = useRef(ownerId);
  const freshFlatListRef = useRef<FreshFlatListRef>(null);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();

  const scrollY = useRef(new Animated.Value(0)).current;
  const animatedValue = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);
  const lastScrollYRef = useRef(0);
  const [headerHeight, setHeaderHeight] = useState<number>(0);

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
      freshFlatListRef.current?.reset();
    }
  }, [ownerId]);

  return (
    <SafeAreaView style={$styles.container}>
      <Animated.View
        style={[
          $styles.textController,
          {
            backgroundColor: 'white',
            zIndex: 1,
            transform: [
              {
                translateY: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -headerHeight],
                }),
              },
            ],
          },
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
      </Animated.View>
      <AnimatedFreshFlatList<Board>
        // ref={freshFlatListRef}
        isFocused={isFocused}
        fetchList={fetchList}
        renderItem={renderItem}
        devMode={true}
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
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: false,
            listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
              const { y } = event.nativeEvent.contentOffset;
              const currentScrollY = y;
              const deltaY = Math.round(
                currentScrollY - lastScrollYRef.current
              );
              lastScrollYRef.current = currentScrollY;
              let direction = null;
              if (deltaY < 0) {
                direction = 'up';
              } else if (deltaY > 0) {
                direction = 'down';
              }

              if (direction === 'up' && !isAnimating.current) {
                isAnimating.current = true;
                Animated.timing(animatedValue, {
                  toValue: 0,
                  duration: 300,
                  useNativeDriver: true,
                }).start(() => {
                  isAnimating.current = false;
                });
              }
              if (
                direction === 'down' &&
                currentScrollY > headerHeight &&
                !isAnimating.current
              ) {
                isAnimating.current = true;
                Animated.timing(animatedValue, {
                  toValue: 1,
                  duration: 300,
                  useNativeDriver: true,
                }).start(() => {
                  isAnimating.current = false;
                });
              }
            },
          }
        )}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          gap: 12,
        }}
      />
    </SafeAreaView>
  );
}
AnimatedListScreen.display = 'AnimatedListScreen';

const $styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  textController: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
