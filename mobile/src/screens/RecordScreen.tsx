import { RecordRow } from '../components/RecordRow';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addRecord, dateLabel } from '../records';
import { groupRecords } from '../calendar';
import { getDatabase } from '../database';
import { useRecords } from '../RecordsProvider';
export default function RecordScreen() {
 const { records, setRecords, loading, failed, load, today, setToday } = useRecords();
 const [input, setInput] = useState('');
 const [saving, setSaving] = useState(false);
 const busy = useRef(false);
 async function save() {
  if (busy.current || !input.trim() || loading || failed) return;
  busy.current = true; setSaving(true);
  try {
   const entry = await addRecord(await getDatabase(), input);
   setRecords(previous => [entry, ...previous].sort((a,b) => b.created_at-a.created_at || b.id-a.id));
   setInput(''); setToday(new Date()); Keyboard.dismiss();
  } catch { Alert.alert('저장하지 못했어요', '입력한 내용은 그대로 남아 있어요. 다시 시도해 주세요.'); }
  finally { busy.current = false; setSaving(false); }
 }
 const grouped = groupRecords(records);
 const sections = [...grouped].sort(([a],[b]) => b.localeCompare(a)).map(([date,data]) => ({date,data}));
 const disabled = !input.trim() || saving || loading || failed;
 return <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
  <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
   <View style={styles.heading}><Text accessibilityRole="header" style={styles.title}>기록</Text></View>
   <View style={styles.composer}>
    <TextInput accessibilityLabel="기록 내용" placeholder="무슨 생각 중?" placeholderTextColor="#85858B" multiline editable={!saving} value={input} onChangeText={setInput} style={styles.input} textAlignVertical="top" />
    <Pressable accessibilityRole="button" accessibilityLabel="기록 저장" accessibilityState={{disabled, busy:saving}} disabled={disabled} onPress={() => void save()} style={({pressed}) => [styles.save, pressed && styles.pressed]}>
     {saving ? <ActivityIndicator color="#007AFF" /> : <Text style={[styles.saveText, disabled && styles.disabled]}>기록</Text>}
    </Pressable>
   </View>
   {loading ? <View style={styles.empty}><ActivityIndicator accessibilityLabel="기록 불러오는 중" /></View> : failed ?
    <View style={styles.empty}><Text style={styles.muted}>기록을 불러오지 못했어요.</Text><Pressable accessibilityRole="button" onPress={() => void load()} style={styles.retry}><Text style={styles.saveText}>다시 시도</Text></Pressable></View> :
    <SectionList sections={sections} keyExtractor={item => String(item.id)} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" stickySectionHeadersEnabled={false} contentContainerStyle={records.length ? styles.list : styles.emptyList}
     ListEmptyComponent={<View style={styles.empty}><Text style={styles.muted}>기록이 없어요.</Text></View>}
     renderSectionHeader={({section}) => <View style={styles.section}><Text accessibilityRole="header" style={styles.sectionText}>{dateLabel(section.date,today)}</Text></View>}
     renderItem={({item}) => <RecordRow record={item} />}
    />}
  </KeyboardAvoidingView>
 </SafeAreaView>;
}
const styles = StyleSheet.create({
 screen:{flex:1,backgroundColor:'#FFFFFF'}, heading:{paddingHorizontal:16,paddingTop:32,paddingBottom:16},
 title:{fontSize:34,fontWeight:'700',letterSpacing:-0.6,color:'#000000'},
 composer:{marginHorizontal:16,marginBottom:24,padding:12,borderRadius:10,backgroundColor:'#EFEFF0'},
 input:{minHeight:84,maxHeight:180,fontSize:17,lineHeight:25,color:'#000000',padding:0},
 save:{alignSelf:'flex-end',minWidth:60,minHeight:44,alignItems:'flex-end',justifyContent:'center'},
 saveText:{fontSize:17,fontWeight:'600',color:'#007AFF'}, disabled:{color:'#AEAEB2'}, pressed:{opacity:0.5},
 list:{paddingBottom:24},emptyList:{flexGrow:1},
 section:{paddingHorizontal:16,paddingVertical:7,backgroundColor:'#F2F2F7',borderTopWidth:StyleSheet.hairlineWidth,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#C6C6C8'},
 sectionText:{fontSize:13,fontWeight:'600',color:'#6C6C70'},
 empty:{flex:1,alignItems:'center',justifyContent:'center',padding:24,gap:10},
 muted:{fontSize:15,lineHeight:22,color:'#6C6C70',textAlign:'center'},retry:{padding:14},
});
