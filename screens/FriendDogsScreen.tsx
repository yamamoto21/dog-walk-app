import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { FriendDog } from '../types';

type FriendDogWithMet = FriendDog & { metToday: boolean };
type MetModalState = { dog: FriendDogWithMet; location: string } | null;

const COMPATIBILITY_OPTIONS = [
  { key: 'good',   label: '仲良し', emoji: '💕' },
  { key: 'normal', label: '普通',   emoji: '👍' },
  { key: 'bad',    label: '要注意', emoji: '⚠️' },
];

const today = () => new Date().toISOString().slice(0, 10);

export default function FriendDogsScreen() {
  const [dogs, setDogs] = useState<FriendDogWithMet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [place, setPlace] = useState('');
  const [compatibility, setCompatibility] = useState('good');
  const [saving, setSaving] = useState(false);
  const [metModal, setMetModal] = useState<MetModalState>(null);

  const fetchDogs = useCallback(async () => {
    const { data: dogsData, error } = await supabase
      .from('friend_dogs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !dogsData) { setLoading(false); setRefreshing(false); return; }

    const { data: encounters } = await supabase
      .from('friend_encounters')
      .select('friend_dog_id')
      .gte('met_at', today());

    const metIds = new Set((encounters ?? []).map((e: { friend_dog_id: string }) => e.friend_dog_id));
    setDogs(dogsData.map((d: FriendDog) => ({ ...d, metToday: metIds.has(d.id) })));
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchDogs(); }, [fetchDogs]);

  const toggleMetToday = async (dog: FriendDogWithMet) => {
    if (dog.metToday) {
      await supabase
        .from('friend_encounters')
        .delete()
        .eq('friend_dog_id', dog.id)
        .gte('met_at', today());
      setDogs(dogs.map(d => d.id === dog.id ? { ...d, metToday: false } : d));
    } else {
      setMetModal({ dog, location: '' });
    }
  };

  const deleteDog = async (dog: FriendDogWithMet) => {
    const ok = window.confirm(`${dog.name}を削除しますか？`);
    if (!ok) return;
    await supabase.from('friend_dogs').delete().eq('id', dog.id);
    setDogs(prev => prev.filter(d => d.id !== dog.id));
  };

  const saveMetToday = async () => {
    if (!metModal) return;
    await supabase.from('friend_encounters').insert({
      friend_dog_id: metModal.dog.id,
      met_at: new Date().toISOString(),
      location: metModal.location.trim() || null,
    });
    setDogs(dogs.map(d => d.id === metModal.dog.id ? { ...d, metToday: true } : d));
    setMetModal(null);
  };

  const addDog = async () => {
    if (!name.trim()) { Alert.alert('名前を入力してください'); return; }
    setSaving(true);
    const { data, error } = await supabase.from('friend_dogs').insert({
      name: name.trim(),
      breed: breed.trim() || null,
      meeting_spot: place.trim() || null,
      compatibility,
    }).select();
    console.log('友達犬保存:', JSON.stringify(data), JSON.stringify(error));
    setSaving(false);
    if (error) { Alert.alert('保存エラー', error.message); return; }
    setShowModal(false);
    setName(''); setBreed(''); setPlace(''); setCompatibility('good');
    fetchDogs();
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
      <View style={styles.header}>
        <Text style={styles.title}>お友達犬</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)}>
          <Text style={styles.addButtonText}>＋ 追加</Text>
        </TouchableOpacity>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDogs(); }} />}>
        {dogs.length === 0 ? (
          <Text style={styles.emptyText}>友達犬を登録しましょう！</Text>
        ) : (
          dogs.map(dog => {
            const compat = COMPATIBILITY_OPTIONS.find(c => c.key === dog.compatibility);
            return (
              <View key={dog.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.dogName}>🐶 {dog.name}</Text>
                  <View style={styles.cardTopRight}>
                    <Text style={styles.compatEmoji}>{compat?.emoji} {compat?.label}</Text>
                    <TouchableOpacity onPress={() => deleteDog(dog)} style={styles.deleteButton}>
                      <Text style={styles.deleteText}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {dog.breed && <Text style={styles.detail}>犬種: {dog.breed}</Text>}
                {dog.meeting_spot && <Text style={styles.detail}>よく会う場所: {dog.meeting_spot}</Text>}
                <TouchableOpacity
                  style={[styles.metButton, dog.metToday && styles.metButtonActive]}
                  onPress={() => toggleMetToday(dog)}
                >
                  <Text style={[styles.metButtonText, dog.metToday && styles.metButtonTextActive]}>
                    {dog.metToday ? '✅ 今日会った！（タップで取消）' : '今日会った？'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={!!metModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🐶 {metModal?.dog.name}に会った！</Text>
            <TouchableOpacity onPress={() => setMetModal(null)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.form}>
            <Text style={styles.label}>会った場所（任意）</Text>
            <TextInput
              style={styles.input}
              value={metModal?.location ?? ''}
              onChangeText={text => setMetModal(m => m ? { ...m, location: text } : null)}
              placeholder="例: 〇〇公園"
            />
            <TouchableOpacity style={styles.saveButton} onPress={saveMetToday}>
              <Text style={styles.saveButtonText}>記録する</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>友達犬を追加</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.form}>
            <Text style={styles.label}>名前 *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="例: ポチ" />
            <Text style={styles.label}>犬種</Text>
            <TextInput style={styles.input} value={breed} onChangeText={setBreed} placeholder="例: 柴犬" />
            <Text style={styles.label}>よく会う場所</Text>
            <TextInput style={styles.input} value={place} onChangeText={setPlace} placeholder="例: 〇〇公園" />
            <Text style={styles.label}>相性</Text>
            <View style={styles.compatRow}>
              {COMPATIBILITY_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.compatOption, compatibility === opt.key && styles.compatOptionActive]}
                  onPress={() => setCompatibility(opt.key)}
                >
                  <Text style={styles.compatOptionEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.compatOptionLabel, compatibility === opt.key && styles.compatOptionLabelActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={addDog} disabled={saving}>
              <Text style={styles.saveButtonText}>{saving ? '保存中...' : '保存する'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2D3436' },
  addButton: { backgroundColor: '#FF8C42', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addButtonText: { color: '#fff', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#B2BEC3', marginTop: 60, fontSize: 16 },
  card: {
    backgroundColor: '#fff', marginHorizontal: 24, marginBottom: 12, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deleteButton: { padding: 4 },
  deleteText: { fontSize: 18 },
  dogName: { fontSize: 18, fontWeight: 'bold', color: '#2D3436' },
  compatEmoji: { fontSize: 14, color: '#636E72' },
  detail: { fontSize: 14, color: '#636E72', marginBottom: 4 },
  metButton: { marginTop: 12, borderWidth: 2, borderColor: '#DFE6E9', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  metButtonActive: { borderColor: '#00B894', backgroundColor: '#E8F8F5' },
  metButtonText: { fontSize: 14, color: '#B2BEC3', fontWeight: 'bold' },
  metButtonTextActive: { color: '#00B894' },
  modal: { flex: 1, backgroundColor: '#FFF8F0' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2D3436' },
  closeButton: { fontSize: 20, color: '#636E72' },
  form: { paddingHorizontal: 24 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#2D3436', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#DFE6E9' },
  compatRow: { flexDirection: 'row', gap: 8 },
  compatOption: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  compatOptionActive: { borderColor: '#FF8C42', backgroundColor: '#FFF3EC' },
  compatOptionEmoji: { fontSize: 24 },
  compatOptionLabel: { fontSize: 12, color: '#636E72', marginTop: 4 },
  compatOptionLabelActive: { color: '#FF8C42', fontWeight: 'bold' },
  saveButton: { backgroundColor: '#FF8C42', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 32, marginBottom: 40 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
