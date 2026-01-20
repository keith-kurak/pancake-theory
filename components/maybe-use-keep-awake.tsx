import { useKeepAwake } from "expo-keep-awake";

export function MaybeUseKeepAwake(props: { enabled: boolean }) {
  if (props.enabled) {
    return <KeepAwakeEnabled />;
  } else {
    return null;
  }
}

function KeepAwakeEnabled() {
  useKeepAwake();
  return null;
}
