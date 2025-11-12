import { PressableProps, Pressable as PressableRaw } from 'react-native';

export function PressableWithOpacity({ style, ...rest }: PressableProps) {
    return (
        <PressableRaw
            {...rest}
            style={(state) => {
                const base = typeof style === 'function' ? style(state) : style;
                return [base || {}, { opacity: state.pressed ? 0.5 : 1 }];
            }}
        />
    );
}