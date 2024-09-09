import { Text, TextInput } from 'react-native';
import { Column, Row, Spacer } from '@wayne-kim/react-native-layout';

interface TestInputTextProps {
  label: string;
  value: string;
  placeholder?: string;
  onChangeValue: (value: string) => void;
}

export default function TestInputText(props: TestInputTextProps) {
  return (
    <Row>
      <Column style={{ flexGrow: 1, flexShrink: 3, width: 0 }}>
        <Text>{props.label}</Text>
      </Column>
      <Spacer size={4} />
      <TextInput
        style={{ flexGrow: 3, flexShrink: 3 }}
        value={props.value}
        onChangeText={props.onChangeValue}
        placeholder={props.placeholder}
      />
    </Row>
  );
}
