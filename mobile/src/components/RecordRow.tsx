import { StyleSheet, Text, View } from 'react-native';
import type { RecordEntry } from '../records';

export function RecordRow({ record }: { record: RecordEntry }) {
 return <View style={styles.row}>
  <Text style={styles.time}>{record.local_time}</Text>
  <Text selectable style={styles.body}>{record.text}</Text>
 </View>;
}
const styles = StyleSheet.create({
 row: { marginLeft: 16, paddingRight: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#C6C6C8', gap: 4 },
 time: { fontSize: 13, color: '#6C6C70', fontWeight: '500' },
 body: { fontSize: 17, lineHeight: 26, color: '#000000' },
});
