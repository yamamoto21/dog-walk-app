import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

type DogProfile = {
  id: string;
  name: string;
  breed: string | null;
  birthday: string | null;
  photo_url: string | null;
};

export default function DogProfileScreen() {
  const [dog, setDog] = useState<DogProfile | null>(null);
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [birthday, setBirthday] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const fetchDog = useCallback(async () => {
    const { data } = await supabase.from('dogs').select('*').limit(1).single();
    if (data) {
      setDog(data);
      setName(data.name ?? '');
      setBreed(data.breed ?? '');
      setBirthday(data.birthday ?? '');
    } else {
      setIsEditing(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDog(); }, [fetchDog]);

  const deleteDog = async () => {
    if (!dog) return;
    const ok = window.confirm('プロフィールを削除しますか？');
    if (!ok) return;
    await supabase.from('dogs').delete().eq('id', dog.id);
    setDog(null);
    setName(''); setBreed(''); setBirthday('');
    setIsEditing(true);
  };

  const save = async () => {
    if (!name.trim()) { Alert.alert('名前を入力してください'); return; }
    setSaving(true);
    if (dog) {
      const { error } = await supabase.from('dogs').update({
        name: name.trim(),
        breed: breed.trim() || null,
        birthday: birthday.trim() || null,
      }).eq('id', dog.id);
      if (error) { Alert.alert('保存エラー', error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('dogs').insert({
        name: name.trim(),
        breed: breed.trim() || null,
        birthday: birthday.trim() || null,
      });
      if (error) { Alert.alert('保存エラー', error.message); setSaving(false); return; }
    }
    setSaving(false);
    setIsEditing(false);
    fetchDog();
    Alert.alert('保存しました！');
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
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.dogEmoji}>🐕</Text>
          {!isEditing && dog ? (
            <>
              <Text style={styles.dogName}>{dog.name}</Text>
              {dog.breed && <Text style={styles.dogDetail}>犬種: {dog.breed}</Text>}
              {dog.birthday && <Text style={styles.dogDetail}>誕生日: {dog.birthday}</Text>}
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
                  <Text style={styles.editButtonText}>編集する</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton} onPress={deleteDog}>
                  <Text style={styles.deleteButtonText}>🗑 削除</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={styles.title}>愛犬プロフィール</Text>
          )}
        </View>

        {isEditing && (
          <View style={styles.form}>
            <Text style={styles.label}>名前 *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="例: もも"
            />
            <Text style={styles.label}>犬種</Text>
            <TextInput
              style={styles.input}
              value={breed}
              onChangeText={setBreed}
              placeholder="例: トイプードル"
            />
            <Text style={styles.label}>誕生日</Text>
            <TextInput
              style={styles.input}
              value={birthday}
              onChangeText={setBirthday}
              placeholder="例: 2020-04-01"
            />
            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.6 }]}
              onPress={save}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>{saving ? '保存中...' : '保存する'}</Text>
            </TouchableOpacity>
            {dog && (
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditing(false)}>
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  scroll: { padding: 24 },
  header: { alignItems: 'center', paddingVertical: 24 },
  dogEmoji: { fontSize: 80 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2D3436', marginTop: 12 },
  dogName: { fontSize: 32, fontWeight: 'bold', color: '#2D3436', marginTop: 12 },
  dogDetail: { fontSize: 16, color: '#636E72', marginTop: 6 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  editButton: {
    borderWidth: 2, borderColor: '#FF8C42', borderRadius: 20,
    paddingHorizontal: 24, paddingVertical: 8,
  },
  editButtonText: { color: '#FF8C42', fontWeight: 'bold' },
  deleteButton: {
    borderWidth: 2, borderColor: '#E17055', borderRadius: 20,
    paddingHorizontal: 24, paddingVertical: 8,
  },
  deleteButtonText: { color: '#E17055', fontWeight: 'bold' },
  form: { marginTop: 8 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#2D3436', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 16,
    borderWidth: 1, borderColor: '#DFE6E9',
  },
  saveButton: {
    backgroundColor: '#FF8C42', paddingVertical: 16, borderRadius: 16,
    alignItems: 'center', marginTop: 32,
  },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cancelButton: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  cancelButtonText: { color: '#636E72', fontSize: 16 },
});
