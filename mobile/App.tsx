import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Keyboard, KeyboardAvoidingView, Platform, Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { addRecord, dateLabel, initialize, loadRecords, type RecordEntry } from './src/records';

// The same file in the app documents directory is reopened after every restart.
let database: Promise<SQLiteDatabase> | undefined;
function getDatabase() {
 if (!database) database = (async () => {
  const db = await openDatabaseAsync('helpme-records.db');
  try { await initialize(db); return db; }
  catch (error) { await db.closeAsync(); throw error; }
 })().catch(error => { database = undefined; throw error; });
 return database;
}
export default function App() {
 return <SafeAreaProvider><StatusBar style="dark" /><RecordScreen /></SafeAreaProvider>;
}
function RecordScreen() {
 const [records, setRecords] = useState<RecordEntry[]>([]);
 const [input, setInput] = useState('');
 const [loading, setLoading] = useState(true);
 const [failed, setFailed] = useState(false);
 const [saving, setSaving] = useState(false);
 const [today, setToday] = useState(new Date());
 const busy = useRef(false);
 async function load() {
  setLoading(true); setFailed(false);
  try { setRecords(await loadRecords(await getDatabase())); }
  catch { setFailed(true); }
  finally { setLoading(false); }
 }
 useEffect(() => { void load(); }, []);
 useEffect(() => {
  const sub = AppState.addEventListener('change', state => { if (state === 'active') setToday(new Date()); });
  const timer = setInterval(() => setToday(new Date()), 60_000);
  return () => { sub.remove(); clearInterval(timer); };
 }, []);
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
 const grouped = new Map<string, RecordEntry[]>();
 records.forEach(record => { const group = grouped.get(record.local_date) ?? []; group.push(record); grouped.set(record.local_date, group); });
 const sections = [...grouped].sort(([a],[b]) => b.localeCompare(a)).map(([date,data]) => ({date,data}));
 const disabled = !input.trim() || saving || loading || failed;
 return <SafeAreaView style={styles.screen}>
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
     ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>첫 기록을 남겨보세요</Text><Text style={styles.muted}>오늘의 생각과 몸의 변화를 편하게 적어보세요.</Text></View>}
     renderSectionHeader={({section}) => <View style={styles.section}><Text accessibilityRole="header" style={styles.sectionText}>{dateLabel(section.date,today)}</Text></View>}
     renderItem={({item}) => <View style={styles.record}><Text style={styles.time}>{item.local_time}</Text><Text selectable style={styles.body}>{item.text}</Text></View>}
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
 record:{marginLeft:16,paddingRight:16,paddingVertical:12,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#C6C6C8',gap:4},
 time:{fontSize:13,color:'#6C6C70',fontWeight:'500'},body:{fontSize:17,lineHeight:26,color:'#000000'},
 empty:{flex:1,alignItems:'center',justifyContent:'center',padding:24,gap:10},
 emptyTitle:{fontSize:19,fontWeight:'600',color:'#3C3C43'},muted:{fontSize:15,lineHeight:22,color:'#6C6C70',textAlign:'center'},retry:{padding:14},
});
