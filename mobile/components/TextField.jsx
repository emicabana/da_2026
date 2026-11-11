import Field from './Field';
import { TextInput } from 'react-native';
import styles from '../style';

export default function TextField({
  label,
  value,
  onChangeText,
  ...props
}) {
  return <Field
    label={label}
  >
    <TextInput
      style={styles.field}
      value={value}
      onChangeText={onChangeText}
      placeholderTextColor="#6e7186"
      {...props}
    />
  </Field>;
}