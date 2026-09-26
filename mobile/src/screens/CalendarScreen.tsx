import { RecordRow } from '../components/RecordRow';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { groupRecords, monthDays, shiftMonth } from '../calendar';
import { localDate } from '../records';
import { useRecords } from '../RecordsProvider';

const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
export default function CalendarScreen() {
 const { records, loading, failed, load, today } = useRecords();
 const [month, setMonth] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() }));
 const [selected, setSelected] = useState(() => localDate(today));
 const grouped = useMemo(() => groupRecords(records), [records]);
 const cells = monthDays(month);
 const todayKey = localDate(today);
 function move(offset: number) {
  const next = shiftMonth(month, offset);
  setMonth(next);
  setSelected(`${next.year}-${String(next.month + 1).padStart(2, '0')}-01`);
 }
 return <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
  <FlatList data={loading || failed ? [] : grouped.get(selected) ?? []} keyExtractor={item => String(item.id)}
   contentContainerStyle={styles.content}
   ListHeaderComponent={<>
    <Text accessibilityRole="header" style={styles.title}>달력</Text>
    <View style={styles.monthHeading}>
     <Pressable accessibilityRole="button" accessibilityLabel="이전 달" onPress={() => move(-1)} style={styles.arrow}><Text style={styles.arrowText}>‹</Text></Pressable>
     <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={styles.month}>{month.year}년 {month.month + 1}월</Text>
     <Pressable accessibilityRole="button" accessibilityLabel="다음 달" onPress={() => move(1)} style={styles.arrow}><Text style={styles.arrowText}>›</Text></Pressable>
    </View>
    <View style={styles.week}>{weekdays.map(day => <Text key={day} style={styles.weekday}>{day}</Text>)}</View>
    {Array.from({ length: cells.length / 7 }, (_, row) => <View key={row} style={styles.week}>
     {cells.slice(row * 7, row * 7 + 7).map((key, col) => key ?
      <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: key === selected }}
       accessibilityLabel={`${key}${key === todayKey ? ', 오늘' : ''}${!loading && !failed ? `, 기록 ${grouped.get(key)?.length ?? 0}개` : ''}`}
       onPress={() => setSelected(key)} style={styles.day}>
       <View style={[styles.dayNumber, key === todayKey && styles.today, key === selected && styles.selected]}>
        <Text style={[styles.dayText, key === todayKey && styles.todayText, key === selected && styles.selectedText]}>{Number(key.slice(-2))}</Text>
       </View>
       <View style={[styles.dot, (!loading && !failed && grouped.has(key)) ? styles.hasRecords : undefined]} />
      </Pressable> : <View key={`blank-${col}`} style={styles.day} />)}
    </View>)}
    <Text accessibilityRole="header" style={styles.date}>{selected.replace(/-/g, '. ')}</Text>
   </>}
   ListEmptyComponent={loading ? <ActivityIndicator style={styles.empty} accessibilityLabel="기록 불러오는 중" /> : failed ?
    <View style={styles.empty}><Text style={styles.muted}>기록을 불러오지 못했어요.</Text><Pressable accessibilityRole="button" onPress={() => void load()} style={styles.retry}><Text style={styles.todayText}>다시 시도</Text></Pressable></View> :
    <Text style={[styles.empty, styles.muted]}>기록이 없어요.</Text>}
   renderItem={({ item }) => <RecordRow record={item} />}
  />
 </SafeAreaView>;
}
const styles = StyleSheet.create({
 screen: { flex: 1, backgroundColor: '#FFFFFF' }, content: { paddingBottom: 24 },
 title: { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 16, fontSize: 34, fontWeight: '700', letterSpacing: -0.6 },
 monthHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
 month: { fontSize: 20, fontWeight: '600' }, arrow: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, arrowText: { fontSize: 30, color: '#007AFF' },
 week: { flexDirection: 'row', paddingHorizontal: 8 }, weekday: { flex: 1, textAlign: 'center', paddingVertical: 10, color: '#6C6C70', fontSize: 13 },
 day: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', paddingVertical: 3 },
 dayNumber: { minWidth: 34, minHeight: 34, padding: 5, borderRadius: 17, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
 dayText: { fontSize: 16 }, today: { borderColor: '#007AFF' }, todayText: { color: '#007AFF', fontWeight: '600' },
 selected: { backgroundColor: '#007AFF' }, selectedText: { color: '#FFFFFF' },
 dot: { width: 4, height: 4, borderRadius: 2, marginTop: 3 }, hasRecords: { backgroundColor: '#6C6C70' },
 date: { marginTop: 20, paddingHorizontal: 16, paddingVertical: 8, fontSize: 13, fontWeight: '600', color: '#6C6C70', backgroundColor: '#F2F2F7' },
 empty: { padding: 24, alignItems: 'center' }, muted: { fontSize: 15, color: '#6C6C70', textAlign: 'center' }, retry: { padding: 14 },
});
