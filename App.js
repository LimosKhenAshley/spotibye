import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar, Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import Slider from '@react-native-community/slider';

const COLORS = {
  bg: '#15111f',
  surface: '#221b33',
  text: '#f5f1ff',
  muted: '#9d93b8',
  accent: '#ff6b9a',
};

const fmt = (s = 0) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
};

const cleanName = (name) => name.replace(/\.[^/.]+$/, '');

export default function App() {
  const [songs, setSongs] = useState([]);
  const [index, setIndex] = useState(-1);
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const handledEnd = useRef(false);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  const playAt = (i) => {
    if (i < 0 || i >= songs.length) return;
    handledEnd.current = false;
    setIndex(i);
    player.replace({ uri: songs[i].uri });
    player.play();
  };

  const next = () => playAt(index + 1 < songs.length ? index + 1 : 0);
  const prev = () => {
    if (status.currentTime > 3) player.seekTo(0);
    else playAt(index - 1 >= 0 ? index - 1 : songs.length - 1);
  };
  const toggle = () => (status.playing ? player.pause() : player.play());

  // Auto-advance when a song finishes
  useEffect(() => {
    if (status.didJustFinish && !handledEnd.current) {
      handledEnd.current = true;
      next();
    }
  }, [status.didJustFinish]);

  const addSongs = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const added = result.assets.map((a) => ({
        id: a.uri,
        title: cleanName(a.name),
        uri: a.uri,
      }));
      setSongs((prev) => [...prev, ...added]);
    } catch (e) {
      Alert.alert('Could not add songs', 'Try picking the files again.');
    }
  };

  const current = songs[index];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.logo}>Spotibye</Text>
        <TouchableOpacity style={styles.addBtn} onPress={addSongs}>
          <Text style={styles.addBtnText}>Add songs</Text>
        </TouchableOpacity>
      </View>

      {songs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Your library is empty</Text>
          <Text style={styles.emptyText}>
            Tap “Add songs” and pick music files from your phone.
          </Text>
        </View>
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingBottom: 190 }}
          renderItem={({ item, index: i }) => (
            <TouchableOpacity style={styles.row} onPress={() => playAt(i)}>
              <View style={[styles.dot, i === index && { backgroundColor: COLORS.accent }]} />
              <Text
                numberOfLines={1}
                style={[styles.rowTitle, i === index && { color: COLORS.accent }]}
              >
                {item.title}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {current && (
        <View style={styles.nowPlaying}>
          <Text numberOfLines={1} style={styles.npTitle}>{current.title}</Text>
          <Slider
            style={{ width: '100%', height: 36 }}
            minimumValue={0}
            maximumValue={status.duration || 1}
            value={status.currentTime || 0}
            onSlidingComplete={(v) => player.seekTo(v)}
            minimumTrackTintColor={COLORS.accent}
            maximumTrackTintColor={COLORS.muted}
            thumbTintColor={COLORS.accent}
          />
          <View style={styles.times}>
            <Text style={styles.time}>{fmt(status.currentTime)}</Text>
            <Text style={styles.time}>{fmt(status.duration)}</Text>
          </View>
          <View style={styles.controls}>
            <TouchableOpacity onPress={prev}><Text style={styles.ctrl}>⏮</Text></TouchableOpacity>
            <TouchableOpacity style={styles.playBtn} onPress={toggle}>
              <Text style={styles.playIcon}>{status.playing ? '⏸' : '▶'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={next}><Text style={styles.ctrl}>⏭</Text></TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 56 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  logo: { color: COLORS.text, fontSize: 28, fontWeight: '800' },
  addBtn: { backgroundColor: COLORS.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: COLORS.bg, fontWeight: '700' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { color: COLORS.text, fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptyText: { color: COLORS.muted, textAlign: 'center', fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.surface, marginRight: 14 },
  rowTitle: { color: COLORS.text, fontSize: 16, flex: 1 },
  nowPlaying: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.surface, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  npTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { color: COLORS.muted, fontSize: 12 },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 32, marginTop: 6 },
  ctrl: { color: COLORS.text, fontSize: 28 },
  playBtn: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  playIcon: { color: COLORS.bg, fontSize: 24 },
});