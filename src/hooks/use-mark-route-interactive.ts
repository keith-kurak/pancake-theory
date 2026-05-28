import { useObserve } from "@/utils/expo-observe";
import { useEffect } from "react";

export function useMarkRouteInteractive() {
  const { markInteractive } = useObserve();

  useEffect(() => {
    markInteractive();
  }, [markInteractive]);
}
