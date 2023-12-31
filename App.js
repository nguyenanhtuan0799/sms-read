import React, {useEffect, useMemo, useCallback, useState} from 'react';
import {
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  // NativeModules,
  Alert,
  StatusBar,
  TextInput,
  SafeAreaView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import axios from 'axios';
import BackgroundFetch from 'react-native-background-fetch';

const App = () => {
  const [state, setState] = useState({
    smsList: [],
    minDate: '',
    maxDate: '',
    isPermission: false,
    branch_name: 'BAHADI',
    api: 'https://banhang.bahadi.vn/app/appapi/sms_bank.json',
    timeout: 10000,
    isStart: false,
    count: 0,
  });

  useEffect(() => {
    if (Platform.OS === 'android') {
      requestPermissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state.isStart && state.isPermission) {
      initBackgroundFetch();
      BackgroundFetch.scheduleTask({
        taskId: 'com.app.sendSMS',
        forceAlarmManager: true,
        periodic: true,
        delay: 100, // <-- milliseconds
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isPermission, state.isStart]);

  useEffect(() => {
    if (state.isStart) {
      BackgroundFetch.start();
      console.log('start');
    } else {
      BackgroundFetch.stop();
      console.log('stop');
    }
  }, [state.isStart]);

  const initBackgroundFetch = async () => {
    let countBackgroundRef = {current: state.count};

    const status = await BackgroundFetch.configure(
      {
        minimumFetchInterval: 15, // <-- minutes (15 is minimum allowed)
        stopOnTerminate: false,
        enableHeadless: true,
        startOnBoot: true,
        // Android options
        forceAlarmManager: false, // <-- Set true to bypass JobScheduler.
        requiredNetworkType: BackgroundFetch.NETWORK_TYPE_NONE, // Default
        requiresCharging: false, // Default
        requiresDeviceIdle: false, // Default
        requiresBatteryNotLow: false, // Default
        requiresStorageNotLow: false, // Default
      },
      async taskId => {
        console.log('[BackgroundFetch] taskId', taskId);
        // Create an Event record.
        switch (taskId) {
          case 'com.app.sendSMS':
            listSMS(countBackgroundRef);
            console.log('runing background');
            break;
          default:
            console.log('Default fetch task');
        }
        // Finish.
        BackgroundFetch.finish(taskId);
      },
      async taskId => {
        // Oh No!  Our task took too long to complete and the OS has signalled
        // that this task must be finished immediately.
        console.log('[Fetch] TIMEOUT taskId:', taskId);
        BackgroundFetch.finish(taskId);
      },
    );
  };

  const sendSMS = useCallback(
    ({brand_name, content}) => {
      axios
        .post(state.api, {
          brand_name: brand_name,
          content: content,
        })
        .then(function (response) {
          // console.log(response);
        })
        .catch(function (error) {
          // handle error
          Alert.alert(error);
        })
        .finally(function () {
          // always executed
        });
    },
    [state.api],
  );

  const requestPermissions = async () => {
    let granted = {};
    try {
      granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'Cấp quyền đọc tin nhắn',
          message: 'Vui lòng cấp quyền đọc tin nhắn!',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        var filter = {
          box: 'inbox',
          maxCount: 1000000,
        };
        SmsAndroid.list(
          JSON.stringify(filter),
          fail => {
            console.log('Failed with this error: ' + fail);
          },
          (count, smsList) => {
            var arr = JSON.parse(smsList)?.filter(
              _sms => _sms.address === state.branch_name,
            );
            setState(prevData => ({
              ...prevData,
              count: count,
              smsList: arr,
              isPermission: true,
            }));
          },
        );
      } else {
        Alert.alert({
          title: 'Cấp quyền',
          message: 'Vui lòng cấp quyền đọc tin nhắn!',
          buttons: [
            {
              text: 'Huỷ',
              style: 'cancel',
            },
            {
              text: 'Cài đặt',
              style: 'default',
              onPress: () => Linking.openSettings,
            },
          ],
          // options?: AlertOptions,
        });
        console.log('SMS permission denied', granted);
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const listSMS = useCallback(
    countBackgroundRef => {
      var filter = {
        box: 'inbox',
        maxCount: 1000000000,
      };

      SmsAndroid.list(
        JSON.stringify(filter),
        fail => {
          console.log('Failed with this error: ' + fail);
        },
        (count, smsList) => {
          const parseSmsList = JSON.parse(smsList).reverse();
          console.log(count, '???', countBackgroundRef.current);
          if (
            parseSmsList[count - 1]?.address === state.branch_name &&
            count > countBackgroundRef.current
          ) {
            sendSMS({
              brand_name: parseSmsList[count - 1]?.address,
              content: parseSmsList[count - 1]?.body,
            });
            setState(prevData => {
              return {
                ...prevData,
                smsList: JSON.parse(smsList)?.filter(
                  _sms => _sms.address === state.branch_name,
                ),
                count: count,
              };
            });
            countBackgroundRef.current = count;
          }
        },
      );
    },
    [sendSMS, state.branch_name],
  );

  const onChangeSetting = ({name, value}) => {
    if (!!name && value) {
      setState(prevData => ({
        ...prevData,
        [name]: value,
      }));
    } else {
      setState(prevData => ({
        ...prevData,
        [name]: '',
      }));
    }
  };

  const onChangeStart = () => {
    if (state.api && state.branch_name && state.timeout) {
      setState(prevData => ({
        ...prevData,
        isStart: !prevData.isStart,
      }));
    } else {
      alert('Vui lòng nhập đủ trường');
    }
  };

  const renderShowSMS = useCallback(() => {
    return state.smsList?.map(sms => {
      return (
        <View
          style={{marginTop: 10, backgroundColor: '#fff', padding: 16}}
          key={sms?._id}>
          <Text style={{color: 'red', size: 16}}>From: {sms?.address}</Text>
          <Text style={styles.text}>Body: {sms?.body}</Text>
          <Text style={styles.text}>Id: {sms?._id}</Text>
          <Text style={styles.text}>
            Date (readable): {new Date(sms?.date).toString()}
          </Text>
        </View>
      );
    });
  }, [state.smsList]);

  const renderLatestMessages = () => {
    return (
      <View style={{flex: 1, width: '100%'}}>
        <View
          style={{
            padding: 16,
            backgroundColor: '#fff',
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}>
          <Text style={{fontWeight: 'bold', color: '#00000', fontSize: 16}}>
            DANH SÁCH TIN NHẮN
          </Text>
          <Text style={{fontWeight: 'bold', color: '#00000', fontSize: 16}}>
            {state.count}
          </Text>
        </View>
        <ScrollView>{renderShowSMS()}</ScrollView>
      </View>
    );
  };

  const renderSetting = () => {
    return (
      <View style={styles.settingContainer}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Địa chỉ api</Text>
          <TextInput
            style={styles.input}
            value={state.api}
            placeholder="Nhập địa chỉ point"
            onChangeText={value => onChangeSetting({name: 'api', value: value})}
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Thời gian gọi(ms)</Text>
          <TextInput
            style={styles.input}
            value={state.timeout?.toString()}
            keyboardType="phone-pad"
            onChangeText={value =>
              onChangeSetting({name: 'timeout', value: value})
            }
            placeholder="Nhập thời gian"
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Branch name</Text>
          <TextInput
            style={styles.input}
            value={state.branch_name?.toString()}
            onChangeText={value =>
              onChangeSetting({name: 'branch_name', value: value})
            }
            placeholder="Nhập branch name"
          />
        </View>
        <TouchableOpacity style={styles.btnContainer} onPress={onChangeStart}>
          <Text style={{color: 'white', size: 16, fontWeight: '600'}}>
            {state.isStart ? 'Dừng' : 'Bắt đầu'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (Platform.OS !== 'android') {
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>Welcome to React Native!</Text>
        <Text style={styles.instructions}>To get started, edit App.js</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6a51ae" />
      {renderSetting()}
      {renderLatestMessages()}
    </SafeAreaView>
  );
};

export default React.memo(App);

const styles = StyleSheet.create({
  settingContainer: {
    padding: 16,
    width: '100%',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    backgroundColor: '#f6f8fa',
  },
  welcome: {
    color: 'black',
    fontSize: 20,
    textAlign: 'center',
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
  inputContainer: {width: '100%', marginTop: 12},
  input: {
    borderWidth: 1,
    marginTop: 6,
    borderColor: '#d3d3d3',
    borderRadius: 4,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    color: '#000000',
  },
  btnContainer: {
    marginTop: 16,
    backgroundColor: 'red',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  text: {
    color: '#000000',
    fontSize: 15,
  },
});
