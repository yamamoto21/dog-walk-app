import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MOCK_PHOTOS = [
  { id: '1', date: '2026-05-16', location: '〇〇公園', emoji: '🌳' },
  { id: '2', date: '2026-05-15', location: '川沿い', emoji: '🌊' },
  { id: '3', date: '2026-05-14', location: '住宅街', emoji: '🏘️' },
];

export default function MapScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>思い出マップ</Text>

      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapEmoji}>🗺️</Text>
        <Text style={styles.mapText}>地図（GPS機能実装後に表示）</Text>
      </View>

      <Text style={styles.sectionTitle}>📷 思い出写真</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
        {MOCK_PHOTOS.map(photo => (
          <TouchableOpacity key={photo.id} style={styles.photoCard}>
            <Text style={styles.photoEmoji}>{photo.emoji}</Text>
            <Text style={styles.photoLocation}>{photo.location}</Text>
            <Text style={styles.photoDate}>{photo.date}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2D3436', padding: 24, paddingBottom: 16 },
  mapPlaceholder: {
    marginHorizontal: 24,
    height: 240,
    backgroundColor: '#E8F4F8',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  mapEmoji: { fontSize: 48 },
  mapText: { fontSize: 14, color: '#636E72', marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3436', paddingHorizontal: 24, marginBottom: 12 },
  photoRow: { paddingLeft: 24 },
  photoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    width: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  photoEmoji: { fontSize: 40 },
  photoLocation: { fontSize: 13, fontWeight: 'bold', color: '#2D3436', marginTop: 8 },
  photoDate: { fontSize: 11, color: '#B2BEC3', marginTop: 4 },
});
