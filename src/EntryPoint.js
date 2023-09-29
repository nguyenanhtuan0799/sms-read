import {NavigationContainer} from '@react-navigation/native';
import React, {useEffect} from 'react';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import RootNavigation from './navigation/RootNavigation';
import {Linking} from 'react-native';

const EntryPoint = () => {
  const linking = {
    prefixes: ['smsBanking://'],
    config: {
      screens: {
        Root: 'Root',
      },
    },
  };
  return (
    <SafeAreaProvider>
      <NavigationContainer linking={linking}>
        <RootNavigation />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default EntryPoint;
