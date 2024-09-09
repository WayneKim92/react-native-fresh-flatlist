import { SafeAreaView, StyleSheet, View } from 'react-native';
import FreshFlatList from 'react-native-fresh-flatlist'; // 경로를 실제 파일 경로로 수정하세요

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <FreshFlatList<{ a: number; b: number }>
        initData={[1, 2, 3, 4, 5]}
        renderItem={({ item }) => {
          console.log(item);
          return <View style={styles.box} />;
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 50,
    height: 50,
    marginVertical: 20,
    backgroundColor: 'red',
  },
});
