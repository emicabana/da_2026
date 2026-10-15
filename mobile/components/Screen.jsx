import { View, Text } from "react-native";

export default function Screen({
    children,
    title,
}) {
    return <View>
        {title && <Text> {title} </Text> || null}
        {children}
    </View>;
}