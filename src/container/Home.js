import React, {useEffect, useCallback, useState} from 'react';
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
  Modal,
  Dimensions,
} from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import axios from 'axios';
// import VIForegroundService from '@voximplant/react-native-foreground-service';
import BackgroundService from 'react-native-background-actions';
import smsListener from 'react-native-android-sms-listener-foreground';
import NetInfo from '@react-native-community/netinfo';

import AsyncStorage from '@react-native-async-storage/async-storage';

const milliseconds = m => m * 60 * 1000;
const storeData = async (key, value) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (e) {
    // saving error
  }
};

const getData = async key => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    // error reading value
  }
};

const Home = () => {
  const [state, setState] = useState({
    branch_name: '',
    api: '',
    timeout: 1,
  });
  const [isConnected, setIsConnected] = useState();
  const [smsDisconnect, setSmsDisconnect] = useState([]);
  const [isStart, setIsStart] = useState(false);
  const [isPermission, setIsPermission] = useState(false);
  const [smsCount, setSmsCount] = useState(0);
  const [smsList, setSmsList] = useState([]);
  const [password, setPassword] = useState('');
  const [isShowModal, setIsShowModal] = useState(false);

  useEffect(() => {
    callStorageState();
    if (Platform.OS === 'android') {
      requestPermissions();
      NetInfo.fetch().then(state => {
        setIsConnected(state.isConnected);
      });
    }
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    return () => {
      unsubscribe.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isConnected && smsDisconnect.length > 0) {
      smsDisconnect.forEach(sms => {
        sendSMS({
          brand_name: sms.brand_name,
          content: sms.content,
        });
      });
      setSmsDisconnect([]);
    }
  }, [isConnected, sendSMS, smsDisconnect]);

  useEffect(() => {
    const deepLink = Linking.addEventListener('url', handleOpenURL);
    const resp = getPermission();
    const lister = smsListener.addListener(message => {
      const branchArr = state.branch_name.split(',');
      branchArr.forEach(branch => {
        if (branch.trim() === message?.originatingAddress) {
          NetInfo.fetch().then(state => {
            if (state.isConnected) {
              sendSMS({
                brand_name: message.originatingAddress,
                content: message.body,
              });
            } else {
              setSmsDisconnect(prev => {
                return [
                  ...prev,
                  {
                    brand_name: message.originatingAddress,
                    content: message.body,
                  },
                ];
              });
            }
          });
        }
      });
    });

    return () => {
      deepLink.remove();
      lister.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStart]);

  const callStorageState = async () => {
    const stateStorage = await getData('stateApp');
    if (stateStorage) {
      console.log('vào storage', stateStorage);
      setState(stateStorage);
    }
  };
  const callStoragePassword = async () => {
    const passwordStorage = await getData('password');
    if (password === passwordStorage) {
      setIsStart(false);
      stopBackgroundService();
      setSmsDisconnect([]);
      setIsShowModal(false);
      setPassword();
    } else {
      alert('Vui lòng nhập đúng mật khẩu');
      setIsShowModal(false);
    }
  };

  async function getPermission() {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS, {
      title: 'SmsBanking',
      message: 'Vui lòng cấp quyền đọc tin nhắn',
    });

    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      {
        title: 'SmsBanking',
        message: 'Vui lòng cấp quyền nhận tin nhắn',
      },
    );
  }

  const sleep = time =>
    new Promise(resolve => setTimeout(() => resolve(), time));

  const veryIntensiveTask = async taskDataArguments => {
    const countBackgroundRef = {current: smsCount};
    // Example of an infinite loop task
    const {delay} = taskDataArguments;
    await new Promise(async resolve => {
      const number = 5;
      for (let i = 0; BackgroundService.isRunning(); i++) {
        listSMS(countBackgroundRef);
        if (i % number === 0) {
          console.log(i);
          console.log('api test');
          sendSMSTest({
            brand_name: 'BAHADI',
            content: 'Test Loop API',
          });
        }
        await sleep(delay);
      }
    });
  };

  const options = {
    taskName: 'SmsBanking',
    taskTitle: 'Cập nhật theo dõi số dư ngân hàng',
    taskDesc:
      'Ứng dụng đang duy trì cập nhật sms về hệ thống. Nếu tắt sẽ không cập nhật được dữ liệu về',
    taskIcon: {
      name: 'app_logo',
      type: 'mipmap',
    },
    color: '#ff00ff',
    linkingURI: 'smsBanking://Root', // See Deep Linking for more info
    parameters: {
      delay: milliseconds(Number.parseInt(state.timeout)),
    },
  };

  const startBackgroundService = async () => {
    await BackgroundService.start(veryIntensiveTask, options);
  };
  const stopBackgroundService = async () => {
    await BackgroundService.stop();
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
        })
        .finally(function () {
          // always executed
        });
    },
    [state.api],
  );
  const sendSMSTest = useCallback(({brand_name, content}) => {
    axios
      .post('https://banhang.bahadi.vn/app/appapi/sms_bank.json', {
        brand_name: brand_name,
        content: content,
      })
      .then(function (response) {
        // console.log(response);
      })
      .catch(function (error) {
        // handle error
      })
      .finally(function () {
        // always executed
      });
  }, []);

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
          async (count, smsList) => {
            const arr = JSON.parse(smsList);

            setSmsList(arr);
            setSmsCount(count);
            setIsPermission(true);
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

  const listSMS = useCallback(countBackgroundRef => {
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
        const parseSmsList = JSON.parse(smsList);
        console.log(count, '???count', countBackgroundRef.current);

        if (count > countBackgroundRef.current) {
          console.log(count, '???count');
          setSmsList(parseSmsList);
          setSmsCount(count);
          countBackgroundRef.current = count;
        }
      },
    );
  }, []);

  function handleOpenURL(evt) {
    // Will be called when the notification is pressed
    console.log(evt.url);
    // do something
  }

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
    if (state.api && state.branch_name && Number.parseInt(state.timeout)) {
      setIsShowModal(true);
    } else {
      alert('Vui lòng nhập đủ trường');
    }
  };

  const handleStop = () => {
    setIsShowModal(true);
  };

  const handleConfirm = () => {
    if (password) {
      if (isStart) {
        callStoragePassword();
      } else {
        storeData('stateApp', state);
        storeData('password', password);
        setIsStart(true);
        setPassword('');
        startBackgroundService();
        setSmsDisconnect([]);
        setIsShowModal(false);
      }
    } else {
      alert('Vui lòng nhập mật khẩu');
    }
  };

  const renderLatestMessages = useCallback(() => {
    const branchArr = state?.branch_name?.split(',');
    const data = smsList?.filter(_sms => {
      return branchArr?.find(branch => {
        return branch?.trim() === _sms?.address && _sms;
      });
    });
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
            {data?.length || smsCount}
          </Text>
        </View>
        <ScrollView>
          {data?.map(sms => {
            return (
              <View
                style={{marginTop: 10, backgroundColor: '#fff', padding: 16}}
                key={sms?._id}>
                <Text style={{color: 'red', size: 16}}>
                  From: {sms?.address}
                </Text>
                <Text style={styles.text}>Body: {sms?.body}</Text>
                <Text style={styles.text}>Id: {sms?._id}</Text>
                <Text style={styles.text}>
                  Date (readable): {new Date(sms?.date).toString()}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }, [smsCount, smsList, state?.branch_name]);

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
          <Text style={styles.label}>Thời gian gọi(Phút)</Text>
          <TextInput
            style={styles.input}
            value={state.timeout?.toString()}
            keyboardType="phone-pad"
            onChangeText={value =>
              onChangeSetting({
                name: 'timeout',
                value: Number.parseInt(value),
              })
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

        {isStart ? (
          <TouchableOpacity style={styles.btnContainer} onPress={handleStop}>
            <Text style={{color: 'white', size: 16, fontWeight: '600'}}>
              Dừng lại
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.btnContainer} onPress={onChangeStart}>
            <Text style={{color: 'white', size: 16, fontWeight: '600'}}>
              Bắt đầu
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderModal = () => {
    return (
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalText}>Nhập mật khẩu</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mật khẩu</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={value => {
                setPassword(value);
              }}
              placeholder="Nhập mật khẩu"
            />
          </View>
          <View
            style={{
              width: '100%',
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}>
            <TouchableOpacity
              style={[
                styles.btnContainer,
                {width: '45%', backgroundColor: '#888888'},
              ]}
              onPress={() => {
                setIsShowModal(false);
              }}>
              <Text style={{color: 'white', size: 16, fontWeight: '600'}}>
                Huỷ bỏ
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnContainer, {width: '45%'}]}
              onPress={handleConfirm}>
              <Text style={{color: 'white', size: 16, fontWeight: '600'}}>
                Xác nhận
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
      <View
        style={{
          paddingHorizontal: 60,
          justifyContent: 'center',
          paddingTop: 16,
        }}>
        <Text
          style={[
            styles.modalText,
            {fontSize: 20, textAlign: 'center', textTransform: 'uppercase'},
          ]}>
          Phần mềm cập nhật số dư Ngân Hàng
        </Text>
      </View>
      {renderSetting()}
      {renderLatestMessages()}
      <Modal animationType="slide" transparent={true} visible={isShowModal}>
        {renderModal()}
      </Modal>
    </SafeAreaView>
  );
};

export default React.memo(Home);

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalView: {
    width: Dimensions.get('window').width * 0.9,
    height: Dimensions.get('window').height * 0.3,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
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
    borderRadius: 8,
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
  modalText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
