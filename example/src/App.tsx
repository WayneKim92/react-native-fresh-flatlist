import { Image, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import FreshFlatList, {
  type FetchMeta,
  type FetchType,
} from 'react-native-fresh-flatlist';
import config from './ignore/config.json';
import { type Board } from './ignore/types';

export default function App() {
  // 네트워크 로직은 어떻게 입력할 것인가?
  const fetchList = async ({ fetchType, fetchPage }: FetchMeta) => {
    let page = 1;
    if (fetchType === 'first') {
      page = 1;
    }
    if (fetchType === 'next') {
      page = fetchPage + 1;
    }

    const response = await fetch(
      `${config.api}boards?contentType=BOARD&ownerId=3&category=ALL&page=${page}&size=60&sort=createdAt`
    );

    const data = await response.json();

    let list = null;
    if (data && data.boardList) {
      list = data.boardList;
    }

    return {
      fetchType: 'current' as FetchType,
      list: list as Board[],
    };
  };

  console.log('렌더링 in App.tsx');

  return (
    // 외부에서 처리할 연산, 내부에서 처리할 연산을 어떻게 구분하는 게 좋을까?
    <SafeAreaView style={styles.container}>
      <FreshFlatList<Board>
        fetchList={fetchList}
        renderItem={({ item }) => {
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
                <Text>{item.content}</Text>

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
