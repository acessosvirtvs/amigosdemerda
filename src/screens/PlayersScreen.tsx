import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Alert,
  Animated,
  Keyboard,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useGame, Player } from '../context/GameContext';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Players'>;
};

const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function PlayersScreen({ navigation }: Props) {
  const { state, dispatch } = useGame();
  const [playerName, setPlayerName] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleAddPlayer = () => {
    const trimmed = playerName.trim();
    if (!trimmed) {
      Alert.alert('Ops!', 'Digite o nome do jogador.');
      return;
    }
    if (state.players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert('Ops!', 'Já existe um jogador com esse nome.');
      return;
    }

    dispatch({ type: 'ADD_PLAYER', name: trimmed, photoUri: selectedPhoto });
    setPlayerName('');
    setSelectedPhoto(null);
    Keyboard.dismiss();
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setSelectedPhoto(result.assets[0].uri);
    }
  };

  const handleRemovePlayer = (id: string) => {
    dispatch({ type: 'REMOVE_PLAYER', id });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newPlayers = [...state.players];
    [newPlayers[index - 1], newPlayers[index]] = [newPlayers[index], newPlayers[index - 1]];
    dispatch({ type: 'REORDER_PLAYERS', players: newPlayers });
  };

  const handleMoveDown = (index: number) => {
    if (index === state.players.length - 1) return;
    const newPlayers = [...state.players];
    [newPlayers[index], newPlayers[index + 1]] = [newPlayers[index + 1], newPlayers[index]];
    dispatch({ type: 'REORDER_PLAYERS', players: newPlayers });
  };

  const handleStartGame = () => {
    if (state.players.length < 3) {
      Alert.alert('Calma aí!', 'Precisa de pelo menos 3 jogadores.');
      return;
    }
    dispatch({ type: 'START_GAME' });
    navigation.navigate('Game');
  };

  const renderPlayer = ({ item, index }: { item: Player; index: number }) => (
    <View style={styles.playerRow}>
      <Text style={styles.playerIndex}>{index + 1}</Text>

      {item.photoUri ? (
        <Image source={{ uri: item.photoUri }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: getAvatarColor(item.name) }]}>
          <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
        </View>
      )}

      <Text style={styles.playerName} numberOfLines={1}>
        {item.name}
      </Text>

      <View style={styles.playerActions}>
        <TouchableOpacity
          onPress={() => handleMoveUp(index)}
          style={[styles.reorderBtn, index === 0 && styles.reorderBtnDisabled]}
          disabled={index === 0}
        >
          <Text style={[styles.reorderText, index === 0 && styles.reorderTextDisabled]}>▲</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleMoveDown(index)}
          style={[styles.reorderBtn, index === state.players.length - 1 && styles.reorderBtnDisabled]}
          disabled={index === state.players.length - 1}
        >
          <Text style={[styles.reorderText, index === state.players.length - 1 && styles.reorderTextDisabled]}>▼</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleRemovePlayer(item.id)}
          style={styles.removeBtn}
        >
          <Text style={styles.removeText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const canStart = state.players.length >= 3;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>JOGADORES</Text>
      <Text style={styles.subheader}>
        {state.players.length} adicionado{state.players.length !== 1 ? 's' : ''} • mínimo 3
      </Text>

      <View style={styles.inputRow}>
        <TouchableOpacity onPress={handlePickImage} style={styles.photoBtn}>
          {selectedPhoto ? (
            <Image source={{ uri: selectedPhoto }} style={styles.photoBtnImage} />
          ) : (
            <Text style={styles.photoBtnText}>📷</Text>
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Nome do jogador"
          placeholderTextColor="#555"
          value={playerName}
          onChangeText={setPlayerName}
          onSubmitEditing={handleAddPlayer}
          returnKeyType="done"
          maxLength={20}
        />

        <TouchableOpacity
          style={[styles.addBtn, !playerName.trim() && styles.addBtnDisabled]}
          onPress={handleAddPlayer}
          disabled={!playerName.trim()}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={state.players}
        renderItem={renderPlayer}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Adicione os jogadores</Text>
            <Text style={styles.emptySubtext}>A ordem de adição define quem joga primeiro</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.startBtn, !canStart && styles.startBtnDisabled]}
        onPress={handleStartGame}
        disabled={!canStart}
        activeOpacity={0.8}
      >
        <Text style={[styles.startBtnText, !canStart && styles.startBtnTextDisabled]}>
          COMEÇAR O JOGO
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 4,
    textAlign: 'center',
  },
  subheader: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    letterSpacing: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  photoBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  photoBtnImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  photoBtnText: {
    fontSize: 20,
  },
  input: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnDisabled: {
    backgroundColor: '#333',
  },
  addBtnText: {
    color: '#000',
    fontSize: 24,
    fontWeight: '700',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  playerIndex: {
    color: '#444',
    fontSize: 14,
    fontWeight: '600',
    width: 24,
    textAlign: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  playerName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  playerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reorderBtn: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderBtnDisabled: {
    opacity: 0.2,
  },
  reorderText: {
    color: '#888',
    fontSize: 12,
  },
  reorderTextDisabled: {
    color: '#333',
  },
  removeBtn: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  removeText: {
    color: '#FF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#444',
    fontSize: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    color: '#333',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  startBtn: {
    backgroundColor: '#FFF',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 10,
  },
  startBtnDisabled: {
    backgroundColor: '#222',
  },
  startBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 4,
  },
  startBtnTextDisabled: {
    color: '#444',
  },
});
