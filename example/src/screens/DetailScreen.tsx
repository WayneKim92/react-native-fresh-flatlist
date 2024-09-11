import { SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';
import { type RouteProp, useRoute } from '@react-navigation/native';
import type { RootStackParamList } from '../types';

type DetailScreenRouteProp = RouteProp<RootStackParamList, 'DetailScreen'>;
export default function DetailScreen() {
  const { params } = useRoute<DetailScreenRouteProp>();

  let strings: Array<string> = [];
  if (params?.item) {
    const item = params.item;
    Object.keys(item).forEach((key: string) => {
      // @ts-ignore
      const value = item[key];
      if (value && typeof value === 'string') {
        strings.push(value);
      }
    });
  }

  return (
    // 외부에서 처리할 연산, 내부에서 처리할 연산을 어떻게 구분하는 게 좋을까?
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8, flex: 1 }}
      >
        {strings.map((str, index) => (
          <Text key={index}>{str}</Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
DetailScreen.display = 'DetailScreen';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
