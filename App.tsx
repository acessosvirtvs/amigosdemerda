import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GameProvider } from './src/context/GameContext';

import HomeScreen from './src/screens/HomeScreen';
import PlayersScreen from './src/screens/PlayersScreen';
import GameScreen from './src/screens/GameScreen';
import VotingScreen from './src/screens/VotingScreen';
import ResultScreen from './src/screens/ResultScreen';
import FinalScreen from './src/screens/FinalScreen';

export type RootStackParamList = {
  Home: undefined;
  Players: undefined;
  Game: undefined;
  Voting: undefined;
  Result: undefined;
  Final: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GameProvider>
        <NavigationContainer>
          <StatusBar barStyle="light-content" backgroundColor="#000" />
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#000' },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Players" component={PlayersScreen} />
            <Stack.Screen name="Game" component={GameScreen} />
            <Stack.Screen
              name="Voting"
              component={VotingScreen}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen
              name="Result"
              component={ResultScreen}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen
              name="Final"
              component={FinalScreen}
              options={{ gestureEnabled: false }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </GameProvider>
    </GestureHandlerRootView>
  );
}
