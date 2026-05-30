import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { Walk, WalkPhoto } from '../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Coordinate = { latitude: number; longitude: number; timestamp: number };
type WalkWithRoute = Walk & { route: Coordinate[] | null };

let MapView: any = null;
let Polyline: any = null;
let Marker: any = null;
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

const getDuration = (walk: Walk): number => {
  if (walk.duration_seconds) return walk.duration_seconds;
  if (walk.ended_at) {
    return Math.floor((new Date(walk.ended_at).getTime() - new Date(walk.started_at).getTime()) / 1000);
  }
  return 0;
};

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

export default function MapScreen() {
  const [walks, setWalks] = useState<WalkWithRoute[]>([]);
  const [selected, setSelected] = useState<WalkWithRoute | null>(null);
  const [photos, setPhotos] = useState<WalkPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<any>(null);

  const fetchWalks = useCallback(async () => {
    const { data } = await supabase
      .from('walks')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(20);
    if (data) {
      const withRoute = data.filter((w: WalkWithRoute) => w.route && Array.isArray(w.route) && w.route.length > 1);
      setWalks(withRoute);
      if (withRoute.length > 0) setSelected(withRoute[0]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!selected) return;
    supabase.from('walk_photos').select('*').eq('walk_id', selected.id).then(({ data }) => {
      setPhotos(data ?? []);
    });
  }, [selected]);

  useEffect(() => { fetchWalks(); }, [fetchWalks]);

  const handleSelect = (walk: WalkWithRoute) => {
    setSelected(walk);
    if (mapRef.current && walk.route && walk.route.length > 0) {
      mapRef.current.fitToCoordinates(walk.route.filter((c: any) => !c.poop), {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      });
    }
  };

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>散歩マップ</Text>
        <View style={styles.webPlaceholder}>
          <Text style={styles.webPlaceholderEmoji}>🗺️</Text>
          <Text style={styles.webPlaceholderText}>地図はスマホアプリで確認できます</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FF8C42" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const rawRoute = selected?.route ?? [];
  const route = rawRoute.filter((c: any) => !c.poop);
  const poopSpots = rawRoute.filter((c: any) => c.poop);
  const level = selected?.level ? LEVEL_MAP[selected.level] : null;
  const initialRegion = route.length > 0 ? {
    latitude: route[Math.floor(route.length / 2)].latitude,
    longitude: route[Math.floor(route.length / 2)].longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : {
    latitude: 35.6812,
    longitude: 139.7671,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>散歩マップ</Text>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        onLayout={() => {
          if (mapRef.current && route.length > 0) {
            mapRef.current.fitToCoordinates(rawRoute.filter((c: any) => !c.poop), {
              edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
              animated: false,
            });
          }
        }}
      >
        {route.length > 1 && (
          <Polyline
            coordinates={route}
            strokeColor="#FF8C42"
            strokeWidth={4}
          />
        )}
        {route.length > 0 && (
          <Marker coordinate={route[0]} title="スタート" pinColor="green" />
        )}
        {route.length > 1 && (
          <Marker coordinate={route[route.length - 1]} title="ゴール" pinColor="red" />
        )}
        {poopSpots.map((coord: any, i: number) => (
          <Marker key={`poop-${i}`} coordinate={coord} title={`💩 ${i + 1}回目`}>
            <Text style={{ fontSize: 24 }}>💩</Text>
          </Marker>
        ))}
        {photos.filter(p => p.lat && p.lng).map(p => (
          <Marker key={`photo-${p.id}`} coordinate={{ latitude: p.lat!, longitude: p.lng! }} title="📷 写真">
            <Text style={{ fontSize: 24 }}>📷</Text>
          </Marker>
        ))}
      </MapView>

      {selected && (
        <View style={styles.statsBar}>
          <Text style={styles.statsDate}>{selected.started_at.slice(0, 10)}</Text>
          <View style={styles.statsRow}>
            <Text style={styles.stat}>⏱ {formatTime(getDuration(selected))}</Text>
            <Text style={styles.stat}>📍 {((selected.distance_meters ?? 0) / 1000).toFixed(2)} km</Text>
            <Text style={styles.stat}>💩 {selected.poop_count}回</Text>
            {level && <Text style={styles.stat}>{level.emoji} {level.label}</Text>}
          </View>
        </View>
      )}

      {walks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>散歩を記録するとルートが表示されます</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.walkList} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {walks.map(walk => {
            const lv = walk.level ? LEVEL_MAP[walk.level] : null;
            const isSelected = selected?.id === walk.id;
            return (
              <TouchableOpacity
                key={walk.id}
                style={[styles.walkCard, isSelected && styles.walkCardActive]}
                onPress={() => handleSelect(walk)}
              >
                <Text style={[styles.walkCardDate, isSelected && styles.walkCardDateActive]}>
                  {walk.started_at.slice(5, 10)}
                </Text>
                <Text style={styles.walkCardStat}>
                  {((walk.distance_meters ?? 0) / 1000).toFixed(1)} km
                </Text>
                {lv && <Text style={styles.walkCardLevel}>{lv.emoji}</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fddb13' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#000', padding: 24, paddingBottom: 12 },
  map: { flex: 1 },
  statsBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statsDate: { fontSize: 13, color: '#000', marginBottom: 4 },
  statsRow: { flexDirection: 'row', gap: 16 },
  stat: { fontSize: 14, color: '#000' },
  walkList: { maxHeight: 100, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  walkCard: {
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 14, paddingVertical: 12, marginVertical: 10, marginRight: 8,
    borderRadius: 12, borderWidth: 2, borderColor: '#DFE6E9', backgroundColor: '#fff', minWidth: 72,
  },
  walkCardActive: { borderColor: '#FF8C42', backgroundColor: '#FFF3EC' },
  walkCardDate: { fontSize: 13, fontWeight: 'bold', color: '#000' },
  walkCardDateActive: { color: '#FF8C42' },
  walkCardStat: { fontSize: 12, color: '#000', marginTop: 2 },
  walkCardLevel: { fontSize: 16, marginTop: 2 },
  emptyContainer: { padding: 24, alignItems: 'center' },
  emptyText: { color: '#000', fontSize: 14 },
  webPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  webPlaceholderEmoji: { fontSize: 64 },
  webPlaceholderText: { fontSize: 16, color: '#000', marginTop: 16 },
});
