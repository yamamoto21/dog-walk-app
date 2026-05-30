import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Image, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { Walk } from '../types';

const LEVEL_MAP: Record<string, { label: string; emoji: string }> = {
  good:   { label: '良い',   emoji: '😊' },
  normal: { label: '普通',   emoji: '😐' },
  bad:    { label: '悪い',   emoji: '😞' },
  bite:   { label: '噛んだ', emoji: '😬' },
};

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

const getDuration = (walk: Walk): number => {
  if (walk.duration_seconds) return walk.duration_seconds;
  if (walk.ended_at) {
    return Math.floor((new Date(walk.ended_at).getTime() - new Date(walk.started_at).getTime()) / 1000);
  }
  return 0;
};

export default function HomeScreen() {
  const [todayWalks, setTodayWalks] = useState<Walk[]>([]);
  const [recentWalks, setRecentWalks] = useState<Walk[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scaleX = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const bob = (duration: number) => Animated.sequence([
      Animated.timing(translateY, { toValue: -12, duration: duration / 4, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: duration / 4, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -12, duration: duration / 4, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: duration / 4, useNativeDriver: true }),
    ]);

    const walk = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleX, { toValue: 1, duration: 0, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(translateX, { toValue: 80, duration: 1200, useNativeDriver: true }),
          bob(1200),
        ]),
        Animated.timing(scaleX, { toValue: -1, duration: 0, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(translateX, { toValue: -80, duration: 1200, useNativeDriver: true }),
          bob(1200),
        ]),
      ])
    );
    walk.start();
    return () => walk.stop();
  }, []);

  const fetchData = useCallback(async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todayData } = await supabase
      .from('walks')
      .select('*')
      .gte('started_at', todayStart.toISOString());

    const { data: recentData } = await supabase
      .from('walks')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(3);

    if (todayData) setTodayWalks(todayData);
    if (recentData) setRecentWalks(recentData);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const todayPoopTotal = todayWalks.reduce((sum, w) => sum + (w.poop_count ?? 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}>
        <View style={styles.header}>
          <Animated.Image
            source={require('../assets/img/loading-dog.png')}
            style={[styles.dogImage, { transform: [{ translateX }, { translateY }, { scaleX }] }]}
          />
          <Text style={styles.greeting}>おかえり！</Text>
          <Text style={styles.subGreeting}>今日もいい散歩をしよう</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{todayWalks.length}</Text>
            <Text style={styles.statLabel}>今日の散歩</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{todayPoopTotal}</Text>
            <Text style={styles.statLabel}>今日の💩</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{recentWalks.length}</Text>
            <Text style={styles.statLabel}>最近の記録</Text>
          </View>
        </View>

        {recentWalks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>最近の散歩</Text>
            {recentWalks.map(walk => {
              const level = walk.level ? LEVEL_MAP[walk.level] : null;
              return (
                <View key={walk.id} style={styles.walkCard}>
                  <View style={styles.walkCardRow}>
                    <Text style={styles.walkDate}>{walk.started_at.slice(0, 10)}</Text>
                    {level && <Text style={styles.walkLevel}>{level.emoji} {level.label}</Text>}
                  </View>
                  <View style={styles.walkStats}>
                    <Text style={styles.walkStat}>⏱ {formatTime(getDuration(walk))}</Text>
                    <Text style={styles.walkStat}>💩 {walk.poop_count}回</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {recentWalks.length === 0 && (
          <View style={styles.section}>
            <Text style={styles.emptyText}>まだ記録がありません{'\n'}散歩してみましょう！</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fddb13' },
  header: { alignItems: 'center', paddingTop: 32, paddingBottom: 32, backgroundColor: '#fddb13' },
  dogImage: { width: 320, height: 320, resizeMode: 'contain' },
  greeting: { fontSize: 28, fontWeight: 'bold', color: '#000', marginTop: 8 },
  subGreeting: { fontSize: 14, color: '#000', marginTop: 4 },
  statsContainer: { flexDirection: 'row', marginHorizontal: 24, marginTop: 16, gap: 12 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#FF8C42' },
  statLabel: { fontSize: 11, color: '#636E72', marginTop: 4, textAlign: 'center' },
  section: { marginHorizontal: 24, marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3436', marginBottom: 12 },
  walkCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  walkCardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  walkDate: { fontSize: 15, fontWeight: 'bold', color: '#2D3436' },
  walkLevel: { fontSize: 14, color: '#636E72' },
  walkStats: { flexDirection: 'row', gap: 16 },
  walkStat: { fontSize: 13, color: '#636E72' },
  emptyText: { textAlign: 'center', color: '#B2BEC3', marginTop: 40, fontSize: 16, lineHeight: 28 },
});
