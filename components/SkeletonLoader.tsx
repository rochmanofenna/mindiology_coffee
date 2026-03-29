// components/SkeletonLoader.tsx — Pulsing skeleton placeholder
import { useRef, useEffect } from 'react';
import { View, ScrollView, Animated, type ViewStyle } from 'react-native';

interface Props {
  variant?: 'list' | 'card' | 'banner';
  count?: number;
  height?: number;
  style?: ViewStyle;
  gap?: number;
}

export function SkeletonLoader({
  variant = 'list',
  count = 5,
  height = 90,
  style,
  gap = 10,
}: Props) {
  const pulse = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  if (variant === 'banner') {
    return (
      <View style={style}>
        <Animated.View
          style={{
            backgroundColor: '#E8E0D8',
            borderRadius: 16,
            height: 150,
            width: '100%',
            opacity: pulse,
          }}
        />
      </View>
    );
  }

  if (variant === 'card') {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={style}
        contentContainerStyle={{ gap }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <Animated.View
            key={i}
            style={{
              backgroundColor: '#E8E0D8',
              borderRadius: 16,
              width: 160,
              height: 200,
              opacity: pulse,
            }}
          />
        ))}
      </ScrollView>
    );
  }

  // Default: 'list' variant — original behavior
  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, i) => (
        <Animated.View
          key={i}
          style={{
            backgroundColor: '#E8E0D8',
            borderRadius: 16,
            height,
            marginBottom: gap,
            opacity: pulse,
          }}
        />
      ))}
    </View>
  );
}
