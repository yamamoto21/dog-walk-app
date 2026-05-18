import { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { Walk, WalkPhoto } from '../types';

let MapView: any = null, Polyline: any = null, Marker: any = null;
if (Platform.OS !== 'web') {
  const RNMaps = require('react-native-maps');
  MapView = RNMaps.default;
  Polyline = RNMaps.Polyline;
  Marker = RNMaps.Marker;
}

const LEVEL_MAP: Record<string, { label: string; emoji: string; color: string }> = {
  good:   { label: '良い',   emoji: '😊', color: '#00B894' },
  normal: { label: '普通',   emoji: '😐', color: '#FDCB6E' },
  bad:    { label: '悪い',   emoji: '😞', color: '#E17055' },
  bite:   { label: '噛んだ', emoji: '😬', color: '#D63031' },
};
const COMPAT_MAP: Record<string, string> = { good: '💕', normal: '👍', bad: '⚠️' };

const getDuration = (walk: Walk): number => {
  if (walk.duration_seconds) return walk.duration_seconds;
  if (walk.ended_at) return Math.floor((new Date(walk.ended_at).getTime() - new Date(walk.started_at).getTime()) / 1000);
  return 0;
};
const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

type Encounter = {
  id: string;
  location: string | null;
  friend_dogs: { name: string; breed: string | null; compatibility: string };
};

type Props = {
  walk: Walk | null;
  photos: WalkPhoto[];
  onClose: () => void;
};

export default function WalkDetailModal({ walk, photos, onClose }: Props) {
  const [encounters, setEncounters] = useState<Encounter[]>([]);

  useEffect(() => {
    if (!walk) { setEncounters([]); return; }
    const date = walk.started_at.slice(0, 10);
    supabase
      .from('friend_encounters')
      .select('id, location, friend_dogs(name, breed, compatibility)')
      .gte('met_at', `${date}T00:00:00`)
      .lte('met_at', `${date}T23:59:59`)
      .then(({ data }) => setEncounters((data ?? []) as Encounter[]));
  }, [walk]);

  if (!walk) return null;

  const rawRoute: any[] = (walk as any).route ?? [];
  const route = rawRoute.filter(c => !c.poop);
  const poopSpots = rawRoute.filter(c => c.poop);
  const level = walk.level ? LEVEL_MAP[walk.level] : null;
  const midpoint = route[Math.floor(route.length / 2)];
  const initialRegion = midpoint ? {
    latitude: midpoint.latitude, longitude: midpoint.longitude,
    latitudeDelta: 0.01, longitudeDelta: 0.01,
  } : null;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{walk.started_at.slice(0, 10)} の散歩</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* 統計 */}
          <View style={styles.statsCard}>
            {level && (
              <View style={[styles.levelBadge, { backgroundColor: level.color + '22' }]}>
                <Text style={styles.levelEmoji}>{level.emoji}</Text>
                <Text style={[styles.levelLabel, { color: level.color }]}>{level.label}</Text>
              </View>
            )}
            <View style={styles.statsRow}>
              <View style={styles.stat}><Text style={styles.statEmoji}>⏱</Text><Text style={styles.statValue}>{formatTime(getDuration(walk))}</Text></View>
              <View style={styles.stat}><Text style={styles.statEmoji}>📍</Text><Text style={styles.statValue}>{((walk.distance_meters ?? 0) / 1000).toFixed(2)} km</Text></View>
              <View style={styles.stat}><Text style={styles.statEmoji}>💩</Text><Text style={styles.statValue}>{walk.poop_count}回</Text></View>
            </View>
          </View>

          {/* 地図 */}
          {Platform.OS !== 'web' && initialRegion && (
            <View style={styles.mapContainer}>
              <MapView style={styles.map} initialRegion={initialRegion}>
                {route.length > 1 && <Polyline coordinates={route} strokeColor="#FF8C42" strokeWidth={4} />}
                {route.length > 0 && <Marker coordinate={route[0]} pinColor="green" />}
                {route.length > 1 && <Marker coordinate={route[route.length - 1]} pinColor="red" />}
                {poopSpots.map((c: any, i: number) => (
                  <Marker key={`poop-${i}`} coordinate={c}><Text style={{ fontSize: 20 }}>💩</Text></Marker>
                ))}
                {photos.filter(p => p.lat && p.lng).map(p => (
                  <Marker key={`photo-${p.id}`} coordinate={{ latitude: p.lat!, longitude: p.lng! }}>
                    <Text style={{ fontSize: 20 }}>📷</Text>
                  </Marker>
                ))}
              </MapView>
            </View>
          )}

          {/* メモ */}
          {walk.memo && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📝 メモ</Text>
              <Text style={styles.memo}>{walk.memo}</Text>
            </View>
          )}

          {/* 写真 */}
          {photos.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📷 写真</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {photos.map(p => (
                  <Image key={p.id} source={{ uri: p.photo_url }} style={styles.photo} resizeMode="cover" />
                ))}
              </ScrollView>
            </View>
          )}

          {/* 出会った犬 */}
          {encounters.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🐶 出会った犬</Text>
              {encounters.map(e => (
                <View key={e.id} style={styles.dogRow}>
                  <Text style={styles.compatEmoji}>{COMPAT_MAP[e.friend_dogs.compatibility] ?? '🐾'}</Text>
                  <View>
                    <Text style={styles.dogName}>{e.friend_dogs.name}</Text>
                    {e.friend_dogs.breed && <Text style={styles.dogSub}>{e.friend_dogs.breed}</Text>}
                    {e.location && <Text style={styles.dogSub}>📍 {e.location}</Text>}
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#2D3436' },
  close: { fontSize: 22, color: '#636E72' },
  scroll: { paddingBottom: 40 },
  statsCard: {
    backgroundColor: '#fff', marginHorizontal: 24, borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  levelBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 12, gap: 4 },
  levelEmoji: { fontSize: 16 },
  levelLabel: { fontSize: 14, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', gap: 20 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statEmoji: { fontSize: 16 },
  statValue: { fontSize: 15, fontWeight: 'bold', color: '#2D3436' },
  mapContainer: { marginHorizontal: 24, borderRadius: 16, overflow: 'hidden', height: 220, marginBottom: 16 },
  map: { flex: 1 },
  section: { marginHorizontal: 24, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3436', marginBottom: 10 },
  memo: { fontSize: 15, color: '#636E72', lineHeight: 22 },
  photo: { width: 120, height: 120, borderRadius: 12, marginRight: 10 },
  dogRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  compatEmoji: { fontSize: 28 },
  dogName: { fontSize: 15, fontWeight: 'bold', color: '#2D3436' },
  dogSub: { fontSize: 13, color: '#636E72', marginTop: 2 },
});
