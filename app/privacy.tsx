import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link, Stack } from 'expo-router';
import { Platform, ScrollView, StyleSheet } from 'react-native';

export default function PrivacyPage() {
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
              Privacy Policy
            </ThemedText>
            <ThemedText style={styles.lastUpdated}>
              Last updated: October 25, 2025
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Introduction
            </ThemedText>
            <ThemedText style={styles.paragraph}>
              Pancake Theory (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or
              &ldquo;us&rdquo;) is committed to protecting your privacy. This
              Privacy Policy explains how we collect, use, and safeguard your
              information when you use our mobile application.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Information We Collect
          </ThemedText>
          <ThemedText style={styles.paragraph}>
            Pancake Theory stores all data locally on your device. We do not
            collect, transmit, or store any personal information on external
            servers. The information stored locally includes:
          </ThemedText>
          <ThemedView style={styles.list}>
            <ThemedText style={styles.listItem}>
              • Recipe information you create or modify
            </ThemedText>
            <ThemedText style={styles.listItem}>
              • Cooking history and timestamps
            </ThemedText>
            <ThemedText style={styles.listItem}>
              • Personal notes you add to recipes
            </ThemedText>
            <ThemedText style={styles.listItem}>
              • Recipe scaling preferences
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            How We Use Your Information
          </ThemedText>
          <ThemedText style={styles.paragraph}>
            All data is stored locally on your device and is used solely to
            provide the app&apos;s functionality:
          </ThemedText>
          <ThemedView style={styles.list}>
            <ThemedText style={styles.listItem}>
              • Display your saved recipes and cooking history
            </ThemedText>
            <ThemedText style={styles.listItem}>
              • Track your in-progress recipes
            </ThemedText>
            <ThemedText style={styles.listItem}>
              • Save your personal recipe notes and preferences
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Data Storage and Security
          </ThemedText>
          <ThemedText style={styles.paragraph}>
            Your data is stored locally on your device using secure storage
            mechanisms provided by your operating system. We do not have access
            to this data, and it is not transmitted to any external servers or
            third parties.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Third-Party Services
          </ThemedText>
          <ThemedText style={styles.paragraph}>
            Pancake Theory does not use any third-party analytics, advertising,
            or tracking services. We do not share your information with any
            third parties.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Data Deletion
          </ThemedText>
          <ThemedText style={styles.paragraph}>
            You can delete all your data at any time by uninstalling the app.
            All locally stored data will be permanently removed from your
            device.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Children&apos;s Privacy
          </ThemedText>
          <ThemedText style={styles.paragraph}>
            Our app does not collect any personal information from anyone,
            including children under 13. All data is stored locally on the
            device.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Changes to This Privacy Policy
          </ThemedText>
          <ThemedText style={styles.paragraph}>
            We may update this Privacy Policy from time to time. We will notify
            you of any changes by posting the new Privacy Policy on this page
            and updating the &ldquo;Last updated&rdquo; date.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Contact Us
          </ThemedText>
          <ThemedText style={styles.paragraph}>
            If you have any questions about this Privacy Policy, please contact
            us through the app&apos;s support channels.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.footer}>
          <Link href="/home">
            <ThemedText style={styles.footerLink}>Back to Home</ThemedText>
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
    gap: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 42,
  },
  lastUpdated: {
    fontSize: 14,
    opacity: 0.6,
    fontStyle: 'italic',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 24,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
  },
  list: {
    gap: 8,
    paddingLeft: 8,
  },
  listItem: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
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
