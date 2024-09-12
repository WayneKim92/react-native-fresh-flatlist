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
import ReanimatedListScreen from './screens/ReanimatedListScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator>
        <Stack.Screen
          name={ReanimatedListScreen.display}
          component={ReanimatedListScreen}
          options={{
            headerLeft: () => (
              <Pressable onPress={() => navigationRef.current?.goBack()}>
                <Text>can goBack?</Text>
              </Pressable>
            ),
            headerRight: () => (
              <Pressable
                onPress={() =>
                  navigationRef.current?.navigate(AnimatedListScreen.display)
                }
              >
                <Text>v Animated</Text>
              </Pressable>
            ),
          }}
        />
        <Stack.Screen
          name={AnimatedListScreen.display}
          component={AnimatedListScreen}
          options={{
            headerLeft: () => (
              <Pressable onPress={() => navigationRef.current?.goBack()}>
                <Text>can goBack?</Text>
              </Pressable>
            ),
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
            headerLeft: () => (
              <Pressable onPress={() => navigationRef.current?.goBack()}>
                <Text>can goBack?</Text>
              </Pressable>
            ),
            headerRight: () => (
              <Pressable
                onPress={() =>
                  navigationRef.current?.navigate(ReanimatedListScreen.display)
                }
              >
                <Text>v Reanimated</Text>
              </Pressable>
            ),
          }}
        />
        <Stack.Screen name={DetailScreen.display} component={DetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
