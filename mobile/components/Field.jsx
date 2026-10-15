import { View, Text } from "react-native";

export default function Field({
    label,
    children,
}) {
    return <View>
        {label && <Text> {label} </Text> || null}
        {children}
    </View>;
}
    