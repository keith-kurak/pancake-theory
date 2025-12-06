import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { Platform } from 'react-native';

// TODO: fall back to JS tabs because native tabs don't look right on web

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        {Platform.select({
          ios: <Icon sf="slider.horizontal.3" />,
          android: <Icon src={<VectorIcon family={MaterialIcons} name="tune" />} />,
        })}
        <Label hidden>Chooser</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="browse">
        {Platform.select({
          ios: <Icon sf="list.bullet" />,
          android: <Icon src={<VectorIcon family={MaterialIcons} name="view-list" />} />,
        })}
        <Label hidden>Browse</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        {Platform.select({
          ios: <Icon sf="clock.fill" />,
          android: <Icon src={<VectorIcon family={MaterialIcons} name="schedule" />} />,
        })}
        <Label hidden>History</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
