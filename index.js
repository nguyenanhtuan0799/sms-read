/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

import {RNAndroidNotificationListenerHeadlessJsName} from 'react-native-android-notification-listener';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, {EventType} from '@notifee/react-native';

const headlessNotificationListener = async ({notification}) => {
  /**
   * This notification is a JSON string in the follow format:
   *  {
   *      "app": string,
   *      "title": string,
   *      "titleBig": string,
   *      "text": string,
   *      "subText": string,
   *      "summaryText": string,
   *      "bigText": string,
   *      "audioContentsURI": string,
   *      "imageBackgroundURI": string,
   *      "extraInfoText": string,
   *      "groupedMessages": Array<Object> [
   *          {
   *              "title": string,
   *              "text": string
   *          }
   *      ]
   *  }
   */

  if (notification) {
    /**
     * Here you could store the notifications in a external API.
     * I'm using AsyncStorage here as an example.
     */

    if (notification.app === 'com.sms_bank') {
    } else {
      await AsyncStorage.setItem('@lastNotification', notification);
    }
  }
};
notifee.onBackgroundEvent(async ({type, detail}) => {
  const {notification, pressAction} = detail;

  // Check if the user pressed the "Mark as read" action
  if (
    type === EventType.ACTION_PRESS &&
    !!pressAction &&
    pressAction.id === 'mark-as-read'
  ) {
    // Decrement the count by 1
    await notifee.decrementBadgeCount();
    // Remove the notification
    if (notification && notification.id) {
      await notifee.cancelNotification(notification.id);
    }
  }
});

AppRegistry.registerHeadlessTask(
  RNAndroidNotificationListenerHeadlessJsName,
  () => headlessNotificationListener,
);

AppRegistry.registerComponent(appName, () => App);
