import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';

type TimerMode = 'prep' | 'cook';

interface RecipeTimerProps {
  startTime: number;
  prepEndTime?: number;
  onSwitchToCook?: () => void;
  onSwitchToPrep?: () => void;
}

export function RecipeTimer({
  startTime,
  prepEndTime,
  onSwitchToCook,
  onSwitchToPrep,
}: RecipeTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [mode, setMode] = useState<TimerMode>(prepEndTime ? 'cook' : 'prep');
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({ light: '#f0f0f0', dark: '#2a2a2a' }, 'background');
  const inactiveColor = useThemeColor({ light: '#888', dark: '#666' }, 'text');

  useEffect(() => {
    const updateTimer = () => {
      const elapsed = Date.now() - startTime;
      setElapsedTime(elapsed);
    };

    updateTimer(); // Initial update
    const interval = setInterval(updateTimer, 1000); // Update every second

    return () => clearInterval(interval);
  }, [startTime]);

  // Update mode based on prepEndTime
  useEffect(() => {
    if (prepEndTime && mode === 'prep') {
      setMode('cook');
    }
  }, [prepEndTime, mode]);

  const formatElapsedTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.max(Math.floor((totalSeconds % 3600) / 60), 0);
    const seconds = Math.max(totalSeconds % 60, 0);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSwitchMode = (newMode: TimerMode) => {
    if (newMode === mode) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (newMode === 'cook' && !prepEndTime) {
      // Switching from prep to cook
      onSwitchToCook?.();
    } else if (newMode === 'prep' && prepEndTime) {
      // Switching back to prep
      onSwitchToPrep?.();
    }

    setMode(newMode);
  };

  const prepDuration = prepEndTime ? prepEndTime - startTime : elapsedTime;
  const cookDuration = prepEndTime ? elapsedTime - prepDuration : 0;

  return (
    <ThemedView style={styles.container}>
      {/* Timer Display - Left Aligned */}
      <ThemedView style={styles.timerSection}>
        {mode === 'prep' ? (
          // Single timer for prep
          <ThemedView style={styles.timerRow}>
            <IconSymbol name="clock.fill" size={20} color={tintColor} />
            <ThemedText style={[styles.timerText, { color: tintColor }]}>
              {formatElapsedTime(elapsedTime)}
            </ThemedText>
          </ThemedView>
        ) : (
          // Two timers side by side for cook mode
          <ThemedView style={styles.sideBySideContainer}>
            <ThemedView style={styles.timerRow}>
              <IconSymbol name="clock.fill" size={18} color={inactiveColor} />
              <ThemedText style={[styles.sideBySideTime, { color: inactiveColor }]}>
                {formatElapsedTime(prepDuration)}
              </ThemedText>
            </ThemedView>
            <ThemedView style={styles.timerRow}>
              <IconSymbol name="flame" size={18} color={tintColor} />
              <ThemedText style={[styles.sideBySideTime, { color: tintColor, fontWeight: '700' }]}>
                {formatElapsedTime(cookDuration)}
              </ThemedText>
            </ThemedView>
          </ThemedView>
        )}
      </ThemedView>

      {/* Segmented Control - Right Side */}
      <ThemedView style={[styles.segmentedControl, { backgroundColor }]}>
        <Pressable
          onPress={() => handleSwitchMode('prep')}
          style={[
            styles.segment,
            mode === 'prep' && { backgroundColor: tintColor },
          ]}
        >
          <ThemedText
            style={[
              styles.segmentText,
              mode === 'prep' && { color: 'white', fontWeight: '600' },
            ]}
          >
            Prep
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => handleSwitchMode('cook')}
          style={[
            styles.segment,
            mode === 'cook' && { backgroundColor: tintColor },
          ]}
        >
          <ThemedText
            style={[
              styles.segmentText,
              mode === 'cook' && { color: 'white', fontWeight: '600' },
            ]}
          >
            Cook
          </ThemedText>
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  timerSection: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  timerText: {
    fontSize: 20,
    fontWeight: '600',
  },
  sideBySideContainer: {
    flexDirection: 'row',
    gap: 24,
    backgroundColor: 'transparent',
  },
  sideBySideTime: {
    fontSize: 18,
    fontWeight: '600',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  segment: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
