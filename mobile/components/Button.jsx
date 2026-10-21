import { View, Text } from "react-native";

export default function Button({
    label,
    children,
    onPress,
}) {
    return <TouchableOpacity onPress={onPress}>
        <View>
            {label && <Text> {label} </Text> || null}
            {children}
        </View>
    </TouchableOpacity>;
}
    