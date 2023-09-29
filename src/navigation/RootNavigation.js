import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import Home from '../container/Home';

const RootNavigation = () => {
  const Stack = createStackNavigator();
  return (
    <Stack.Navigator
      screenOptions={{headerShown: false}}
      initialRouteName="Root">
      <Stack.Screen name="Root" component={Home} />
    </Stack.Navigator>
  );
};

export default RootNavigation;
