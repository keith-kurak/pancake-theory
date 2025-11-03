import { useEffect, useState } from "react";
import { Keyboard } from "react-native";

const useKeyboardState = () => {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isKeyboardAnimating, setIsKeyboardAnimating] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setIsKeyboardOpen(true);
      setIsKeyboardAnimating(false);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardOpen(false);
      setIsKeyboardAnimating(false);
    });
    const isShowingSubscription = Keyboard.addListener("keyboardWillShow", () => {
      setIsKeyboardAnimating(true);
    });
    const isHidingSubscription = Keyboard.addListener("keyboardWillHide", () => {
      setIsKeyboardAnimating(true);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      isShowingSubscription.remove();
      isHidingSubscription.remove();
    };
  }, []);
  return { isKeyboardOpen, isKeyboardAnimating };
};

export default useKeyboardState;