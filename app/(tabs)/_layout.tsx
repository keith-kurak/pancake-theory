import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import React from 'react';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf="slider.horizontal.3" />
        <Label>Chooser</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <Icon sf="clock.fill" />
        <Label>History</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
