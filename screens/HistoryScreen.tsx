import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { Walk } from '../types';

const LEVEL_MAP: Record<string, { label: string; emoji: string; color: string }> = {
  good:   { label: '良い',   emoji: '😊', color: '#00B894' },
  normal: { label: '普通',   emoji: '😐', color: '#FDCB6E' },
  bad:    { label: '悪い',   emoji: '😞', color: '#E17055' },
  bite:   { label: '噛んだ', emoji: '😬', color: '#D63031' },
};

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

export default function HistoryScreen() {
  const [walks, setWalks] = useState<Walk[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWalks = useCallback(async () => {
    const { data, error } = await supabase
      .from('walks')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50);
    if (!error && data) setWalks(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchWalks(); }, [fetchWalks]);

  const deleteWalk = async (walk: Walk) => {
    const ok = window.confirm(`${walk.started_at.slice(0, 10)} の記録を削除しますか？`);
    if (!ok) return;
    await supabase.from('walks').delete().eq('id', walk.id);
    setWalks(prev => prev.filter(w => w.id !== walk.id));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FF8C42" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>散歩履歴</Text>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchWalks(); }} />}>
        {walks.length === 0 ? (
          <Text style={styles.emptyText}>まだ記録がありません{'\n'}散歩してみましょう！</Text>
        ) : (
          walks.map(walk => {
            const level = walk.level ? LEVEL_MAP[walk.level] : null;
            return (
              <View key={walk.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.date}>{walk.started_at.slice(0, 10)}</Text>
                  <View style={styles.cardHeaderRight}>
                    {level && (
                      <View style={[styles.levelBadge, { backgroundColor: level.color + '22' }]}>
                        <Text style={styles.levelEmoji}>{level.emoji}</Text>
                        <Text style={[styles.levelLabel, { color: level.color }]}>{level.label}</Text>
                      </View>
                    )}
                    <TouchableOpacity onPress={() => deleteWalk(walk)} style={styles.deleteButton}>
                      <Text style={styles.deleteText}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.stats}>
                  <View style={styles.stat}>
                    <Text style={styles.statEmoji}>⏱</Text>
                    <Text style={styles.statValue}>{formatTime(walk.duration_seconds ?? 0)}</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statEmoji}>📍</Text>
                    <Text style={styles.statValue}>{((walk.distance_meters ?? 0) / 1000).toFixed(1)} km</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statEmoji}>💩</Text>
                    <Text style={styles.statValue}>{walk.poop_count}回</Text>
                  </View>
                </View>
                {walk.memo ? <Text style={styles.memo}>📝 {walk.memo}</Text> : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2D3436', padding: 24, paddingBottom: 16 },
  emptyText: { textAlign: 'center', color: '#B2BEC3', marginTop: 60, fontSize: 16, lineHeight: 28 },
  card: {
    backgroundColor: '#fff', marginHorizontal: 24, marginBottom: 12, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  date: { fontSize: 16, fontWeight: 'bold', color: '#2D3436' },
  levelBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 4 },
  levelEmoji: { fontSize: 14 },
  levelLabel: { fontSize: 13, fontWeight: 'bold' },
  deleteButton: { padding: 4 },
  deleteText: { fontSize: 18 },
  stats: { flexDirection: 'row', gap: 16 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statEmoji: { fontSize: 14 },
  statValue: { fontSize: 14, color: '#636E72' },
  memo: { fontSize: 13, color: '#636E72', marginTop: 8, fontStyle: 'italic' },
});
