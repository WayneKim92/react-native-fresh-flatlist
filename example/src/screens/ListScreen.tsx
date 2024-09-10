import { useEffect, useRef, useState } from 'react';
import FreshFlatList, {
  type FreshFlatListRef,
  useDevLog,
} from 'react-native-fresh-flatlist';
import { Image, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import TestInputText from '../components/TestInputText';
import type { Board } from '../ignore/types';
import { fetchWithTimeout } from '../utils/functions';
import config from '../ignore/config.json';

export default function ListScreen() {
  const [category, setCategory] = useState('ALL');
  const [size, setSize] = useState(30);
  const [ownerId, setOwnerId] = useState(3);
  const freshFlatListRef = useRef<FreshFlatListRef>(null);

  const devLog = useDevLog(__DEV__);

  useEffect(() => {
    console.log('####################################');
    console.log(freshFlatListRef.current);
    console.log('####################################');
    freshFlatListRef.current?.reset();
  }, [ownerId]);

  return (
    // 외부에서 처리할 연산, 내부에서 처리할 연산을 어떻게 구분하는 게 좋을까?
    <SafeAreaView style={styles.container}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
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
        devMode={__DEV__}
        fetchList={async (fetchInputMeta) => {
          const { fetchPage = 1, fetchType, previousList } = fetchInputMeta;

          devLog('#fetchInputMeta:', {
            fetchPage,
            fetchType,
            previousListLength: previousList.length,
          });

          let response;
          try {
            response = await fetchWithTimeout(
              `${config.api}boards?contentType=BOARD&ownerId=${ownerId}&category=${category}&page=${fetchPage}&size=${size}&sort=createdAt`
            );
          } catch (e) {
            response = new Response(null, {
              status: 408,
              statusText: 'Request Timeout',
            });
          }
          devLog('#response.status', response.status);
          if (response.status !== 200) {
            devLog(`#fetch status :${response.status}:`, response.statusText);
          }

          const data: {
            boardList: Array<Board>;
            isLast: boolean;
            isFirst: boolean;
          } = await response.json();

          let list: Board[] = [];
          if (data && data.boardList && data.boardList.length > 0) {
            list = data.boardList;
          }
          devLog('#fetch list:', list.length);
          devLog('#isLast:', data.isLast);
          return {
            list: list as Board[],
            isLastPage: data.isLast,
          };
        }}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }: { item: Board; index: number }) => {
          return (
            <View style={{ backgroundColor: 'gray', gap: 8, padding: 12 }}>
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
            </View>
          );
        }}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  box: {
    width: 50,
    height: 50,
    marginVertical: 20,
    backgroundColor: 'red',
    flexDirection: 'row',
    alignSelf: 'center',
  },
});
