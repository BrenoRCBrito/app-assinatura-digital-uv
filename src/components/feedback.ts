import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';

type ConfirmOptions = Readonly<{
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}>;

export function showError(title: string, message: string): void {
  Alert.alert(title, message);
}

export function showSuccess(message: string): void {
  Toast.show({ type: 'success', text1: message });
}

export function showInfo(message: string): void {
  Toast.show({ type: 'info', text1: message });
}

export function confirm({ title, message, confirmLabel, onConfirm }: ConfirmOptions): void {
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: confirmLabel, onPress: onConfirm },
  ]);
}

export function confirmDestructive({ title, message, confirmLabel, onConfirm }: ConfirmOptions): void {
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
