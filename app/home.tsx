import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link, Stack } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';

export default function HomePage() {
  // Redirect to index on native platforms
  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.container}>
      <ThemedView style={styles.content}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Pancake Theory
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Your personal breakfast recipe companion
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            What is Pancake Theory?
          </ThemedText>
          <ThemedText style={styles.description}>
            Pancake Theory helps you track and perfect your breakfast recipes.
            Whether you're making pancakes, waffles, or crepes, keep track of
            your ingredients, scale recipes, and save your cooking history.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Features
          </ThemedText>
          <ThemedView style={styles.featureList}>
            <ThemedText style={styles.feature}>
              📝 Save and organize your favorite breakfast recipes
            </ThemedText>
            <ThemedText style={styles.feature}>
              ⚖️ Scale recipes up or down with ease
            </ThemedText>
            <ThemedText style={styles.feature}>
              ⏱️ Track cooking time and progress
            </ThemedText>
            <ThemedText style={styles.feature}>
              📊 View your cooking history
            </ThemedText>
            <ThemedText style={styles.feature}>
              📝 Add personal notes to your recipes
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Download Now
          </ThemedText>
          <ThemedView style={styles.downloadButtons}>
            <Pressable
              style={styles.downloadButton}
              onPress={() => {
                // TODO: Add App Store link
                console.log('Download on App Store');
              }}
            >
              <ThemedText style={styles.downloadButtonText}>
                Download on the App Store
              </ThemedText>
            </Pressable>
            <Pressable
              style={styles.downloadButton}
              onPress={() => {
                // TODO: Add Google Play link
                console.log('Download on Google Play');
              }}
            >
              <ThemedText style={styles.downloadButtonText}>
                Get it on Google Play
              </ThemedText>
            </Pressable>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.footer}>
          <Link href="/privacy">
            <ThemedText style={styles.footerLink}>Privacy Policy</ThemedText>
          </Link>
        </ThemedView>
      </ThemedView>
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    maxWidth: 800,
    marginHorizontal: 'auto',
    paddingHorizontal: 24,
    paddingVertical: 48,
    gap: 32,
  },
  header: {
    alignItems: 'center',
    gap: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 48,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    textAlign: 'center',
    opacity: 0.7,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 28,
  },
  description: {
    fontSize: 18,
    lineHeight: 28,
    opacity: 0.8,
  },
  featureList: {
    gap: 12,
  },
  feature: {
    fontSize: 16,
    lineHeight: 24,
  },
  downloadButtons: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  downloadButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 200,
  },
  downloadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  footerLink: {
    fontSize: 14,
    opacity: 0.7,
    textDecorationLine: 'underline',
  },
});
