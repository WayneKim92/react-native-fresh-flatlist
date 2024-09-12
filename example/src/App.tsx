import 'abortcontroller-polyfill/dist/polyfill-patch-fetch';
import { useRef } from 'react';
import { Pressable, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  NavigationContainer,
  type NavigationContainerRef,
} from '@react-navigation/native';
import ListScreen from './screens/ListScreen';
import AnimatedListScreen from './screens/AnimatedListScreen';
import DetailScreen from './screens/DetailScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator>
        <Stack.Screen
          name={AnimatedListScreen.display}
          component={AnimatedListScreen}
          options={{
            // eslint-disable-next-line react/no-unstable-nested-components
            headerRight: () => (
              <Pressable
                onPress={() => {
                  navigationRef.current?.navigate(ListScreen.display);
                }}
              >
                <Text>v Non-Animated</Text>
              </Pressable>
            ),
          }}
        />
        <Stack.Screen
          name={ListScreen.display}
          component={ListScreen}
          options={{
            // eslint-disable-next-line react/no-unstable-nested-components
            headerRight: () => (
              <Pressable
                onPress={() => {
                  navigationRef.current?.navigate(AnimatedListScreen.display);
                }}
              >
                <Text>v Version</Text>
              </Pressable>
            ),
          }}
        />
        <Stack.Screen name={DetailScreen.display} component={DetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
