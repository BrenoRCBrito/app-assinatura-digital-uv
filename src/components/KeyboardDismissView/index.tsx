import React from 'react';
import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StyleProp,
    TouchableWithoutFeedback,
    View,
    ViewStyle,
} from 'react-native';

interface KeyboardDismissViewProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

export function KeyboardDismissView({ children, style }: KeyboardDismissViewProps) {
    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={[{ flex: 1 }, style]}>{children}</View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}