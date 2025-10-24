import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';

// TODO: fall back to JS tabs because native tabs don't look right on web

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf="slider.horizontal.3" />
        <Label hidden>Chooser</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <Icon sf="clock.fill" />
        <Label hidden>History</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
