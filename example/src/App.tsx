import 'abortcontroller-polyfill/dist/polyfill-patch-fetch';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import ListScreen from './screens/ListScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name={ListScreen.display} component={ListScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
