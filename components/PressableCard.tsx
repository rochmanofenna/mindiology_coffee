// components/PressableCard.tsx — Animated pressable wrapper with spring scale
import { useRef } from 'react';
import { TouchableOpacity, Animated, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  onPress?: () => void;
  disabled?: boolean;
  haptic?: boolean;
}

export function PressableCard({ children, style, onPress, disabled, haptic = false }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <TouchableOpacity
      activeOpacity={1}
      disabled={disabled}
      onPressIn={() => {
        Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start()}
      onPress={onPress}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </TouchableOpacity>
  );
}
