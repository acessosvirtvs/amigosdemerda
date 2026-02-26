import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useGame, Player } from '../context/GameContext';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Final'>;
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

const LOSER_MESSAGES = [
  'O maior amigo de merda!',
  'Oficialmente o pior do grupo!',
  'Parabéns pelo título!',
  'A lenda do grupo!',
  'Imbatível!',
];

export default function FinalScreen({ navigation }: Props) {
  const { state, dispatch } = useGame();

  const headerAnim = useRef(new Animated.Value(0)).current;
  const loserAnim = useRef(new Animated.Value(0)).current;
  const loserScale = useRef(new Animated.Value(0.5)).current;
  const rankingAnim = useRef(new Animated.Value(0)).current;
  const buttonsAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Sort players by card count (most cards = worst)
  const ranking = [...state.players].sort((a, b) => b.cardCount - a.cardCount);
  const loser = ranking[0];
  const loserMessage = LOSER_MESSAGES[Math.floor(Math.random() * LOSER_MESSAGES.length)];

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }

    Animated.sequence([
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.spring(loserScale, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.timing(loserAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      // Shake animation for the loser
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]),
      Animated.timing(rankingAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(buttonsAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleNewGame = () => {
    dispatch({ type: 'START_GAME' });
    navigation.reset({ index: 0, routes: [{ name: 'Game' }] });
  };

  const handleGoHome = () => {
    dispatch({ type: 'RESET_GAME' });
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  const getMedalEmoji = (index: number): string => {
    if (index === 0) return '💩';
    if (index === ranking.length - 1) return '👼';
    return '';
  };

  const getPositionStyle = (index: number) => {
    if (index === 0) return styles.positionLoser;
    if (index === ranking.length - 1) return styles.positionBest;
    return styles.positionNormal;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View style={[styles.headerSection, { opacity: headerAnim }]}>
          <Text style={styles.gameOver}>FIM DE JOGO</Text>
          <Text style={styles.roundsPlayed}>
            {state.usedCards.size} rodada{state.usedCards.size !== 1 ? 's' : ''} jogada{state.usedCards.size !== 1 ? 's' : ''}
          </Text>
        </Animated.View>

        {/* Loser highlight */}
        <Animated.View
          style={[
            styles.loserSection,
            {
              opacity: loserAnim,
              transform: [
                { scale: loserScale },
                { translateX: shakeAnim },
              ],
            },
          ]}
        >
          <Text style={styles.loserEmoji}>💩</Text>

          {loser.photoUri ? (
            <Image source={{ uri: loser.photoUri }} style={styles.loserAvatar} />
          ) : (
            <View
              style={[
                styles.loserAvatar,
                styles.avatarPlaceholder,
                { backgroundColor: getAvatarColor(loser.name) },
              ]}
            >
              <Text style={styles.loserAvatarText}>{getInitials(loser.name)}</Text>
            </View>
          )}

          <Text style={styles.loserName}>{loser.name}</Text>
          <Text style={styles.loserMessage}>{loserMessage}</Text>
          <View style={styles.loserStats}>
            <Text style={styles.loserCardCount}>{loser.cardCount}</Text>
            <Text style={styles.loserCardLabel}>cartas</Text>
          </View>
        </Animated.View>

        {/* Full ranking */}
        <Animated.View style={[styles.rankingSection, { opacity: rankingAnim }]}>
          <Text style={styles.rankingTitle}>RANKING COMPLETO</Text>

          {ranking.map((player, index) => (
            <View
              key={player.id}
              style={[styles.rankingRow, index === 0 && styles.rankingRowLoser]}
            >
              <Text style={[styles.rankingPosition, getPositionStyle(index)]}>
                {index + 1}°
              </Text>

              <Text style={styles.rankingMedal}>{getMedalEmoji(index)}</Text>

              {player.photoUri ? (
                <Image source={{ uri: player.photoUri }} style={styles.rankingAvatar} />
              ) : (
                <View
                  style={[
                    styles.rankingAvatar,
                    styles.avatarPlaceholder,
                    { backgroundColor: getAvatarColor(player.name) },
                  ]}
                >
                  <Text style={styles.rankingAvatarText}>{getInitials(player.name)}</Text>
                </View>
              )}

              <Text style={styles.rankingName} numberOfLines={1}>
                {player.name}
              </Text>

              <Text
                style={[
                  styles.rankingCards,
                  index === 0 && styles.rankingCardsLoser,
                ]}
              >
                {player.cardCount} 🃏
              </Text>
            </View>
          ))}
        </Animated.View>
      </ScrollView>

      {/* Buttons */}
      <Animated.View style={[styles.buttonsSection, { opacity: buttonsAnim }]}>
        <TouchableOpacity
          style={styles.newGameBtn}
          onPress={handleNewGame}
          activeOpacity={0.8}
        >
          <Text style={styles.newGameBtnText}>NOVO JOGO</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={handleGoHome}
          activeOpacity={0.8}
        >
          <Text style={styles.homeBtnText}>VOLTAR AO INÍCIO</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  gameOver: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 6,
  },
  roundsPlayed: {
    color: '#555',
    fontSize: 13,
    marginTop: 8,
    letterSpacing: 1,
  },
  loserSection: {
    alignItems: 'center',
    backgroundColor: '#0D0000',
    borderRadius: 24,
    padding: 32,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#331111',
  },
  loserEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  loserAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#FF4444',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loserAvatarText: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '700',
  },
  loserName: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '800',
  },
  loserMessage: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    fontStyle: 'italic',
  },
  loserStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 16,
    gap: 8,
  },
  loserCardCount: {
    color: '#FF4444',
    fontSize: 48,
    fontWeight: '800',
  },
  loserCardLabel: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '500',
  },
  rankingSection: {
    marginBottom: 20,
  },
  rankingTitle: {
    color: '#555',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 16,
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
  },
  rankingRowLoser: {
    backgroundColor: '#1A0000',
    borderWidth: 1,
    borderColor: '#331111',
  },
  rankingPosition: {
    fontSize: 16,
    fontWeight: '700',
    width: 32,
    textAlign: 'center',
  },
  positionLoser: {
    color: '#FF4444',
  },
  positionBest: {
    color: '#4ECDC4',
  },
  positionNormal: {
    color: '#666',
  },
  rankingMedal: {
    fontSize: 18,
    width: 28,
    textAlign: 'center',
  },
  rankingAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  rankingAvatarText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  rankingName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  rankingCards: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  rankingCardsLoser: {
    color: '#FF6B6B',
  },
  buttonsSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 10,
    backgroundColor: '#000',
  },
  newGameBtn: {
    backgroundColor: '#FFF',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 12,
  },
  newGameBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 3,
  },
  homeBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  homeBtnText: {
    color: '#555',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 2,
  },
});
