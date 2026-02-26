import React, { useRef, useState } from 'react';
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
  navigation: NativeStackNavigationProp<RootStackParamList, 'Game'>;
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

export default function GameScreen({ navigation }: Props) {
  const { state, dispatch } = useGame();
  const [cardRevealed, setCardRevealed] = useState(false);

  const flipAnim = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.3)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const buttonPulse = useRef(new Animated.Value(1)).current;

  const currentPlayer = state.players[state.currentPlayerIndex];

  const handleDrawCard = () => {
    dispatch({ type: 'DRAW_CARD' });

    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    // Card reveal animation
    cardOpacity.setValue(0);
    cardScale.setValue(0.3);
    flipAnim.setValue(0);

    Animated.sequence([
      Animated.parallel([
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(flipAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCardRevealed(true);
    });

    setCardRevealed(true);
  };

  const handleGoToVoting = () => {
    navigation.navigate('Voting');
  };

  const handleEndGame = () => {
    dispatch({ type: 'END_GAME' });
    navigation.navigate('Final');
  };

  // Pulse animation for the draw button
  React.useEffect(() => {
    if (!state.currentCard) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(buttonPulse, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(buttonPulse, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [state.currentCard]);

  const roundNumber = state.usedCards.size + (state.currentCard ? 0 : 1);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleEndGame} style={styles.endBtn}>
          <Text style={styles.endBtnText}>ENCERRAR</Text>
        </TouchableOpacity>
        <Text style={styles.roundText}>
          RODADA {state.usedCards.size || 1}
        </Text>
      </View>

      {/* Current Player */}
      <View style={styles.playerSection}>
        <Text style={styles.turnLabel}>VEZ DE</Text>
        {currentPlayer.photoUri ? (
          <Image source={{ uri: currentPlayer.photoUri }} style={styles.playerAvatar} />
        ) : (
          <View
            style={[
              styles.playerAvatar,
              styles.avatarPlaceholder,
              { backgroundColor: getAvatarColor(currentPlayer.name) },
            ]}
          >
            <Text style={styles.avatarText}>{getInitials(currentPlayer.name)}</Text>
          </View>
        )}
        <Text style={styles.playerName}>{currentPlayer.name}</Text>
        <Text style={styles.playerCards}>
          {currentPlayer.cardCount} carta{currentPlayer.cardCount !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Card Area */}
      {!state.currentCard ? (
        <Animated.View style={{ transform: [{ scale: buttonPulse }] }}>
          <TouchableOpacity
            style={styles.drawButton}
            onPress={handleDrawCard}
            activeOpacity={0.8}
          >
            <Text style={styles.drawButtonIcon}>🃏</Text>
            <Text style={styles.drawButtonText}>TIRAR CARTA</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            },
          ]}
        >
          <Text style={styles.cardText}>{state.currentCard}</Text>

          <TouchableOpacity
            style={styles.voteButton}
            onPress={handleGoToVoting}
            activeOpacity={0.8}
          >
            <Text style={styles.voteButtonText}>IR PARA VOTAÇÃO</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Player scores footer */}
      <View style={styles.scoresContainer}>
        {state.players.map((player) => (
          <View
            key={player.id}
            style={[
              styles.scoreItem,
              player.id === currentPlayer.id && styles.scoreItemActive,
            ]}
          >
            <Text style={styles.scoreName} numberOfLines={1}>
              {player.name.split(' ')[0]}
            </Text>
            <Text style={styles.scoreCount}>{player.cardCount}</Text>
          </View>
        ))}
      </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  endBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  endBtnText: {
    color: '#666',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
  },
  roundText: {
    color: '#444',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 2,
  },
  playerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  turnLabel: {
    color: '#555',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 4,
    marginBottom: 16,
  },
  playerAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
  },
  playerName: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '700',
  },
  playerCards: {
    color: '#555',
    fontSize: 13,
    marginTop: 4,
  },
  drawButton: {
    backgroundColor: '#FFF',
    paddingVertical: 32,
    paddingHorizontal: 48,
    borderRadius: 24,
    alignItems: 'center',
    alignSelf: 'center',
  },
  drawButtonIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  drawButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 4,
  },
  card: {
    backgroundColor: '#111',
    borderRadius: 20,
    padding: 32,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#222',
    flex: 1,
    maxHeight: 320,
    justifyContent: 'space-between',
  },
  cardText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 32,
    textAlign: 'center',
  },
  voteButton: {
    backgroundColor: '#FFF',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 24,
  },
  voteButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 3,
  },
  scoresContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 20,
    paddingBottom: 40,
    marginTop: 'auto',
  },
  scoreItem: {
    backgroundColor: '#111',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreItemActive: {
    borderWidth: 1,
    borderColor: '#333',
  },
  scoreName: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 60,
  },
  scoreCount: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
