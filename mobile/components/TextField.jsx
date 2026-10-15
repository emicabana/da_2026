import Field from "./Field";
import { TextInput } from "react-native";

export default function TextField({
    label,
    ...props
}) {
    return <Field 
        label={label}>
        <TextInput {...props} />
    </Field>;
}