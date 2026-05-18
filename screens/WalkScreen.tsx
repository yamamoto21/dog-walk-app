import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { WalkLevel } from '../types';

const WALK_LEVELS: { key: WalkLevel; label: string; emoji: string }[] = [
  { key: 'good',   label: '良い',  emoji: '😊' },
  { key: 'normal', label: '普通',  emoji: '😐' },
  { key: 'bad',    label: '悪い',  emoji: '😞' },
  { key: 'bite',   label: '噛んだ', emoji: '😬' },
];

type Coordinate = { latitude: number; longitude: number; timestamp: number };

const calcDistance = (a: Coordinate, b: Coordinate): number => {
  const R = 6371000;
  const dLat = (b.latitude - a.latitude) * Math.PI / 180;
  const dLon = (b.longitude - a.longitude) * Math.PI / 180;
  const lat1 = a.latitude * Math.PI / 180;
  const lat2 = b.latitude * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

export default function WalkScreen() {
  const [isWalking, setIsWalking] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [poopCount, setPoopCount] = useState(0);
  const [walkLevel, setWalkLevel] = useState<WalkLevel | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [hasGps, setHasGps] = useState(false);
  const [memo, setMemo] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const routeRef = useRef<Coordinate[]>([]);
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const photoDataRef = useRef<{ url: string; lat: number | null; lng: number | null; taken_at: string }[]>([]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isWalking) {
      interval = setInterval(() => setSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isWalking]);

  useEffect(() => {
    return () => { locationSub.current?.remove(); };
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const startGps = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('GPS許可が必要です', '設定から位置情報のアクセスを許可してください');
      return false;
    }
    routeRef.current = [];
    locationSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5 },
      (loc) => {
        const coord: Coordinate = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: loc.timestamp,
        };
        const route = routeRef.current;
        if (route.length > 0) {
          const added = calcDistance(route[route.length - 1], coord);
          if (added < 100) {
            setDistanceMeters(d => d + added);
          }
        }
        routeRef.current = [...route, coord];
      }
    );
    setHasGps(true);
    return true;
  };

  const uploadPhoto = async (uri: string): Promise<string | null> => {
    try {
      const fileName = `${Date.now()}.jpg`;
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;
      const result = await FileSystem.uploadAsync(
        `${supabaseUrl}/storage/v1/object/walk-photos/${fileName}`,
        fileUri,
        {
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          httpMethod: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'image/jpeg',
          },
        }
      );

      if (result.status !== 200 && result.status !== 201) {
        Alert.alert('アップロードエラー', `status: ${result.status}\n${result.body}`);
        return null;
      }

      const { data: urlData } = supabase.storage.from('walk-photos').getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (e: any) {
      Alert.alert('アップロードエラー', e?.message ?? '不明なエラー');
      return null;
    }
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('カメラの許可が必要です', '設定からカメラのアクセスを許可してください');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setUploading(true);
      const url = await uploadPhoto(result.assets[0].uri);
      setUploading(false);
      if (url !== null) {
        const route = routeRef.current;
        const last = route.length > 0 ? route[route.length - 1] : null;
        photoDataRef.current = [...photoDataRef.current, {
          url,
          lat: last?.latitude ?? null,
          lng: last?.longitude ?? null,
          taken_at: new Date().toISOString(),
        }];
        setPhotoUrls(prev => [...prev, url]);
      }
    }
  };

  const handleStart = async () => {
    setSeconds(0);
    setPoopCount(0);
    setWalkLevel(null);
    setDistanceMeters(0);
    setMemo('');
    setPhotoUrls([]);
    photoDataRef.current = [];
    setStartedAt(new Date().toISOString());
    setIsWalking(true);
    await startGps();
  };

  const handleStop = async () => {
    if (!walkLevel) {
      Alert.alert('散歩レベルを選んでください', '今日の散歩はどうでしたか？');
      return;
    }
    locationSub.current?.remove();
    locationSub.current = null;

    setSaving(true);
    const endedAt = new Date().toISOString();
    const { data: walkData, error } = await supabase.from('walks').insert({
      started_at: startedAt,
      ended_at: endedAt,
      distance_meters: Math.round(distanceMeters),
      poop_count: poopCount,
      level: walkLevel,
      route: routeRef.current,
      memo: memo.trim() || null,
    }).select().single();

    if (error || !walkData) {
      setSaving(false);
      setIsWalking(false);
      setSeconds(0);
      setHasGps(false);
      Alert.alert('保存エラー', error?.message ?? '不明なエラー');
      return;
    }

    if (photoDataRef.current.length > 0) {
      await supabase.from('walk_photos').insert(
        photoDataRef.current.map(p => ({
          walk_id: walkData.id,
          photo_url: p.url,
          lat: p.lat,
          lng: p.lng,
          taken_at: p.taken_at,
        }))
      );
    }

    setSaving(false);
    setIsWalking(false);
    setSeconds(0);
    setHasGps(false);

    const level = WALK_LEVELS.find(l => l.key === walkLevel);
    Alert.alert(
      '散歩完了！記録しました 🐾',
      `距離: ${(distanceMeters / 1000).toFixed(2)} km\nうんち: ${poopCount}回\nレベル: ${level?.label}`
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>散歩記録</Text>

        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>経過時間</Text>
          <Text style={styles.timer}>{formatTime(seconds)}</Text>
          <Text style={styles.distanceLabel}>
            📍 {(distanceMeters / 1000).toFixed(2)} km
            {isWalking && (hasGps ? ' 　🛰 GPS受信中' : ' 　📡 GPS取得中...')}
          </Text>
        </View>

        {!isWalking ? (
          <TouchableOpacity style={styles.startButton} onPress={handleStart}>
            <Text style={styles.startButtonText}>🐾 散歩を開始する</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.poopButton} onPress={() => {
                setPoopCount(c => c + 1);
                const route = routeRef.current;
                if (route.length > 0) {
                  const last = route[route.length - 1];
                  routeRef.current = [...route, { ...last, poop: true }];
                }
              }}>
                <Text style={styles.poopEmoji}>💩</Text>
                <Text style={styles.poopCount}>{poopCount}回</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cameraButton} onPress={handleCamera} disabled={uploading}>
                <Text style={styles.cameraEmoji}>{uploading ? '⏳' : '📷'}</Text>
                <Text style={styles.cameraLabel}>{uploading ? 'アップロード中...' : '写真を撮る'}</Text>
              </TouchableOpacity>
            </View>

            {photoUrls.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
                {photoUrls.map((url, i) => (
                  <Image key={i} source={{ uri: url }} style={styles.photoThumb} />
                ))}
              </ScrollView>
            )}

            <View style={styles.levelSection}>
              <Text style={styles.levelTitle}>今日の散歩レベル</Text>
              <View style={styles.levelRow}>
                {WALK_LEVELS.map(level => (
                  <TouchableOpacity
                    key={level.key}
                    style={[styles.levelButton, walkLevel === level.key && styles.levelButtonActive]}
                    onPress={() => setWalkLevel(level.key)}
                  >
                    <Text style={styles.levelEmoji}>{level.emoji}</Text>
                    <Text style={[styles.levelLabel, walkLevel === level.key && styles.levelLabelActive]}>
                      {level.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.memoSection}>
              <Text style={styles.memoTitle}>メモ（任意）</Text>
              <TextInput
                style={styles.memoInput}
                value={memo}
                onChangeText={setMemo}
                placeholder="今日の散歩の様子を記録..."
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity
              style={[styles.stopButton, saving && styles.stopButtonDisabled]}
              onPress={handleStop}
              disabled={saving}
            >
              <Text style={styles.stopButtonText}>{saving ? '保存中...' : '散歩を終了する'}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  scroll: { padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2D3436', marginBottom: 24 },
  timerCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  timerLabel: { fontSize: 14, color: '#636E72' },
  timer: { fontSize: 56, fontWeight: 'bold', color: '#FF8C42', marginVertical: 8 },
  distanceLabel: { fontSize: 15, color: '#636E72' },
  startButton: {
    backgroundColor: '#FF8C42', paddingVertical: 18, borderRadius: 16, alignItems: 'center',
    shadowColor: '#FF8C42', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  startButtonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  poopButton: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  poopEmoji: { fontSize: 40 },
  poopCount: { fontSize: 18, fontWeight: 'bold', color: '#636E72', marginTop: 8 },
  cameraButton: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cameraEmoji: { fontSize: 40 },
  cameraLabel: { fontSize: 14, color: '#636E72', marginTop: 8 },
  levelSection: { marginBottom: 24 },
  levelTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3436', marginBottom: 12 },
  levelRow: { flexDirection: 'row', gap: 8 },
  levelButton: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  levelButtonActive: { borderColor: '#FF8C42', backgroundColor: '#FFF3EC' },
  levelEmoji: { fontSize: 24 },
  levelLabel: { fontSize: 12, color: '#636E72', marginTop: 4 },
  levelLabelActive: { color: '#FF8C42', fontWeight: 'bold' },
  photoRow: { marginBottom: 16 },
  photoThumb: { width: 80, height: 80, borderRadius: 8, marginRight: 8 },
  memoSection: { marginBottom: 24 },
  memoTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3436', marginBottom: 8 },
  memoInput: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 15,
    borderWidth: 1, borderColor: '#DFE6E9', minHeight: 80, textAlignVertical: 'top',
  },
  stopButton: { backgroundColor: '#636E72', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  stopButtonDisabled: { backgroundColor: '#B2BEC3' },
  stopButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
