import { Alert } from 'react-native';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export const showConfirmDialog = (
  options: ConfirmOptions
): Promise<boolean> => {
  return new Promise((resolve) => {
    Alert.alert(
      options.title,
      options.message,
      [
        {
          text: options.cancelText || 'Cancel',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: options.confirmText || 'OK',
          style: 'destructive',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
};
