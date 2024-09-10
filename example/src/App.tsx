import { Image, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import FreshFlatList, {
  type FetchInputMeta,
  type FetchOutputMeta,
} from 'react-native-fresh-flatlist';
import config from './ignore/config.json';
import { type Board } from './ignore/types';
import { useEffect, useState } from 'react';
import TestInputText from './TestInputText';
import { useDevLog } from '../../src/hooks/useDevLog';

export default function App() {
  const [category, setCategory] = useState('ALL');
  const [size, setSize] = useState(30);
  const [ownerId, setOwnerId] = useState(3);

  const devLog = useDevLog(__DEV__);

  // 네트워크 로직은 어떻게 입력할 것인가?
  const fetchList = async (
    fetchInputMeta: FetchInputMeta<Board>
  ): FetchOutputMeta<Board> => {
    const { fetchPage = 1, fetchType, previousList } = fetchInputMeta;

    devLog('#fetchInputMeta:', {
      fetchType,
      previousListLength: previousList.length,
    });

    const response = await fetch(
      `${config.api}boards?contentType=BOARD&ownerId=${ownerId}&category=${category}&page=${fetchPage}&size=${size}&sort=createdAt`
    );

    devLog('#response.status', response.status);

    const data: { boardList: Array<Board>; isLast: boolean; isFirst: boolean } =
      await response.json();

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
  };

  useEffect(() => {}, []);

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
        devMode
        fetchList={fetchList}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => {
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
