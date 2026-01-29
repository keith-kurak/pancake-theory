import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { Platform } from 'react-native';

// TODO: fall back to JS tabs because native tabs don't look right on web

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        {Platform.select({
          ios: <NativeTabs.Trigger.Icon sf="slider.horizontal.3" />,
          android: <NativeTabs.Trigger.Icon src={<NativeTabs.Trigger.VectorIcon family={MaterialIcons} name="tune" />} />,
        })}
        <NativeTabs.Trigger.Label hidden>Chooser</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="browse">
        {Platform.select({
          ios: <NativeTabs.Trigger.Icon sf="list.bullet" />,
          android: <NativeTabs.Trigger.Icon src={<NativeTabs.Trigger.VectorIcon family={MaterialIcons} name="view-list" />} />,
        })}
        <NativeTabs.Trigger.Label hidden>Browse</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        {Platform.select({
          ios: <NativeTabs.Trigger.Icon sf="clock.fill" />,
          android: <NativeTabs.Trigger.Icon src={<NativeTabs.Trigger.VectorIcon family={MaterialIcons} name="schedule" />} />,
        })}
        <NativeTabs.Trigger.Label hidden>History</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
