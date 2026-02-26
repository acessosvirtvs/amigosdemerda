import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useGame } from '../context/GameContext';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Result'>;
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
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function ResultScreen({ navigation }: Props) {
  const { state, dispatch } = useGame();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const nameAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  // Find the player who received the card (the one whose count just increased)
  const { winners } = (() => {
    // Get the votes and figure out who got the most
    const voteCounts: Record<string, number> = {};
    Object.values(state.votes).forEach((votedId) => {
      voteCounts[votedId] = (voteCounts[votedId] || 0) + 1;
    });

    let maxVotes = 0;
    Object.values(voteCounts).forEach((count) => {
      if (count > maxVotes) maxVotes = count;
    });

    const winnerIds = Object.entries(voteCounts)
      .filter(([, count]) => count === maxVotes)
      .map(([id]) => id);

    return { winners: state.players.filter((p) => winnerIds.includes(p.id)) };
  })();

  // Use the player with highest card count who was voted for
  const loser = winners[0] || state.players[0];

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }

    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(nameAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleNextRound = () => {
    dispatch({ type: 'NEXT_ROUND' });
    navigation.replace('Game');
  };

  const handleEndGame = () => {
    dispatch({ type: 'END_GAME' });
    navigation.replace('Final');
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View
          style={[styles.emojiContainer, { transform: [{ scale: scaleAnim }] }]}
        >
          <Text style={styles.emoji}>💩</Text>
        </Animated.View>

        <Animated.View style={[styles.loserSection, { opacity: nameAnim }]}>
          <Text style={styles.receivedLabel}>A CARTA FOI PARA</Text>

          {loser.photoUri ? (
            <Image source={{ uri: loser.photoUri }} style={styles.loserAvatar} />
          ) : (
            <Animated.View
              style={[
                styles.loserAvatar,
                styles.avatarPlaceholder,
                { backgroundColor: getAvatarColor(loser.name) },
                { transform: [{ rotate: spin }] },
              ]}
            >
              <Text style={styles.loserAvatarText}>{getInitials(loser.name)}</Text>
            </Animated.View>
          )}

          <Text style={styles.loserName}>{loser.name}</Text>
        </Animated.View>

        <Animated.View style={[styles.statsSection, { opacity: cardAnim }]}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{loser.cardCount}</Text>
            <Text style={styles.statLabel}>
              carta{loser.cardCount !== 1 ? 's' : ''} acumulada{loser.cardCount !== 1 ? 's' : ''}
            </Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.cardPreview, { opacity: cardAnim }]}>
          <Text style={styles.cardPreviewText} numberOfLines={3}>
            "{state.currentCard}"
          </Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.buttonsSection, { opacity: buttonAnim }]}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNextRound}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>PRÓXIMA RODADA</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.endButton}
          onPress={handleEndGame}
          activeOpacity={0.8}
        >
          <Text style={styles.endButtonText}>ENCERRAR JOGO</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 60,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  emojiContainer: {
    marginBottom: 24,
  },
  emoji: {
    fontSize: 64,
  },
  loserSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  receivedLabel: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 4,
    marginBottom: 16,
  },
  loserAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loserAvatarText: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '700',
  },
  loserName: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '800',
  },
  statsSection: {
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#FF6B6B',
    fontSize: 36,
    fontWeight: '800',
  },
  statLabel: {
    color: '#666',
    fontSize: 13,
    marginTop: 4,
  },
  cardPreview: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  cardPreviewText: {
    color: '#888',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonsSection: {
    paddingBottom: 40,
  },
  nextButton: {
    backgroundColor: '#FFF',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 12,
  },
  nextButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 3,
  },
  endButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  endButtonText: {
    color: '#555',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 2,
  },
});
