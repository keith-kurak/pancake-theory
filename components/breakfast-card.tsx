import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BREAKFAST_TYPES } from '@/constants/breakfast-ratios';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { BreakfastType } from '@/types/breakfast';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

interface BreakfastCardProps {
  type: BreakfastType;
}

// Map breakfast types to image files
const BREAKFAST_IMAGES: Record<BreakfastType, any> = {
  pancakes: require('@/assets/breakfasts/pancakes.png'),
  waffles: require('@/assets/breakfasts/waffles.png'),
  crepes: require('@/assets/breakfasts/crepes.png'),
  'dutch baby': require('@/assets/breakfasts/dutchbaby.png'),
  popover: require('@/assets/breakfasts/popovers.png'),
  donut: require('@/assets/breakfasts/donuts.png'),
  clafoutis: require('@/assets/breakfasts/clafoutis.png'),
};

export function BreakfastCard({ type }: BreakfastCardProps) {
  const backgroundColor = useThemeColor(
    { light: '#f8f8f8', dark: '#2a2a2a' },
    'background'
  );
  const borderColor = useThemeColor(
    { light: '#e0e0e0', dark: '#404040' },
    'text'
  );
  const tintColor = useThemeColor({}, 'tint');

  const breakfastInfo = BREAKFAST_TYPES[type];
  const imageSource = BREAKFAST_IMAGES[type];

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/recipes/${type}` as any);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor, borderColor },
        pressed && styles.pressed,
      ]}
    >
      <ThemedView style={[styles.content, { backgroundColor: 'transparent' }]}>
        <ThemedText style={styles.title}>{breakfastInfo.name}</ThemedText>

        <Image
          source={imageSource}
          style={styles.image}
          contentFit="contain"
        />

        <ThemedView
          style={[styles.ratioContainer, { backgroundColor: 'transparent' }]}
        >
          <ThemedText style={styles.ratioLabel}>Ratio:</ThemedText>
          <ThemedText style={styles.ratioText}>
            {breakfastInfo.ratios.flour} : {breakfastInfo.ratios.liquid} :{' '}
            {breakfastInfo.ratios.eggs}
          </ThemedText>
        </ThemedView>
        <ThemedText style={[styles.subtitle, { color: tintColor }]}>
          Tap to view recipes →
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 24,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    flex: 1,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 16,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  image: {
    width: 180,
    height: 180,
  },
  ratioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratioLabel: {
    fontSize: 14,
    marginRight: 8,
    opacity: 0.7,
  },
  ratioText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
});
