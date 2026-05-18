import { Alert, Platform } from 'react-native';

export const confirmDelete = (message: string): Promise<boolean> => {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(message));
  }
  return new Promise(resolve => {
    Alert.alert('確認', message, [
      { text: 'キャンセル', style: 'cancel', onPress: () => resolve(false) },
      { text: '削除', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
};
