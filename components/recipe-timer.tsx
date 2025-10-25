import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

interface RecipeTimerProps {
  startTime: number;
}

export function RecipeTimer({ startTime }: RecipeTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const tintColor = useThemeColor({}, 'tint');

  useEffect(() => {
    const updateTimer = () => {
      const elapsed = Date.now() - startTime;
      setElapsedTime(elapsed);
    };

    updateTimer(); // Initial update
    const interval = setInterval(updateTimer, 1000); // Update every second

    return () => clearInterval(interval);
  }, [startTime]);

  const formatElapsedTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <ThemedView style={styles.timerContainer}>
      <IconSymbol name="clock.fill" size={20} color={tintColor} />
      <ThemedText style={[styles.timerText, { color: tintColor }]}>
        {formatElapsedTime(elapsedTime)}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  timerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 8,
    backgroundColor: 'transparent',
  },
  timerText: {
    fontSize: 20,
    fontWeight: '600',
  },
});
