import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Image,
  Alert,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useGame, Player } from '../context/GameContext';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Voting'>;
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

export default function VotingScreen({ navigation }: Props) {
  const { state, dispatch, getMostVoted, allVoted } = useGame();
  const [currentVoterIndex, setCurrentVoterIndex] = useState(0);
  const [tieBreaker, setTieBreaker] = useState(false);
  const [tiedPlayers, setTiedPlayers] = useState<Player[]>([]);
  const [tieVotes, setTieVotes] = useState<Record<string, number>>({});
  const [tieVoterIndex, setTieVoterIndex] = useState(0);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const currentVoter = state.players[currentVoterIndex];
  const votedCount = Object.keys(state.votes).length;
  const totalVoters = state.players.length;

  const animateTransition = (callback: () => void) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      callback();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleVote = (votedForId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    dispatch({ type: 'CAST_VOTE', voterId: currentVoter.id, votedForId });

    if (currentVoterIndex < totalVoters - 1) {
      animateTransition(() => {
        setCurrentVoterIndex((prev) => prev + 1);
      });
    } else {
      // All voted — check results after state update
      setTimeout(() => checkResults(), 100);
    }
  };

  const checkResults = () => {
    const { winners, voteCount } = getMostVoted();

    if (winners.length > 1) {
      // Tie! Start tiebreaker
      setTiedPlayers(winners);
      setTieBreaker(true);
      setTieVotes({});
      setTieVoterIndex(0);
    } else if (winners.length === 1) {
      // Clear winner
      dispatch({ type: 'ASSIGN_CARD', playerId: winners[0].id });
      navigation.replace('Result');
    }
  };

  const handleTieVote = (playerId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    const newTieVotes = { ...tieVotes };
    newTieVotes[playerId] = (newTieVotes[playerId] || 0) + 1;
    setTieVotes(newTieVotes);

    if (tieVoterIndex < totalVoters - 1) {
      animateTransition(() => {
        setTieVoterIndex((prev) => prev + 1);
      });
    } else {
      // Determine winner from tie
      let maxVotes = 0;
      let winnerId = '';
      Object.entries(newTieVotes).forEach(([id, count]) => {
        if (count > maxVotes) {
          maxVotes = count;
          winnerId = id;
        }
      });

      // Check if still tied
      const maxVotedIds = Object.entries(newTieVotes)
        .filter(([, count]) => count === maxVotes)
        .map(([id]) => id);

      if (maxVotedIds.length > 1) {
        // Still tied — pick random
        const randomWinner = maxVotedIds[Math.floor(Math.random() * maxVotedIds.length)];
        dispatch({ type: 'ASSIGN_CARD', playerId: randomWinner });
      } else {
        dispatch({ type: 'ASSIGN_CARD', playerId: winnerId });
      }
      navigation.replace('Result');
    }
  };

  if (tieBreaker) {
    const tieVoter = state.players[tieVoterIndex];
    return (
      <View style={styles.container}>
        <View style={styles.tieHeader}>
          <Text style={styles.tieIcon}>⚡</Text>
          <Text style={styles.tieTitle}>DESEMPATE!</Text>
          <Text style={styles.tieSubtitle}>
            Votem novamente entre os empatados
          </Text>
        </View>

        <Animated.View style={[styles.voterSection, { opacity: fadeAnim }]}>
          <Text style={styles.voterLabel}>VOTANDO AGORA</Text>
          <Text style={styles.voterName}>{tieVoter.name}</Text>
          <Text style={styles.voteProgress}>
            {tieVoterIndex + 1} de {totalVoters}
          </Text>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.chooseLabel}>Quem merece a carta?</Text>
          {tiedPlayers.map((player) => (
            <TouchableOpacity
              key={player.id}
              style={styles.voteOption}
              onPress={() => handleTieVote(player.id)}
              activeOpacity={0.7}
            >
              {player.photoUri ? (
                <Image source={{ uri: player.photoUri }} style={styles.optionAvatar} />
              ) : (
                <View
                  style={[
                    styles.optionAvatar,
                    styles.avatarPlaceholder,
                    { backgroundColor: getAvatarColor(player.name) },
                  ]}
                >
                  <Text style={styles.optionAvatarText}>{getInitials(player.name)}</Text>
                </View>
              )}
              <Text style={styles.optionName}>{player.name}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Card reminder */}
      <View style={styles.cardReminder}>
        <Text style={styles.cardReminderText} numberOfLines={2}>
          "{state.currentCard}"
        </Text>
      </View>

      {/* Progress */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${(votedCount / totalVoters) * 100}%` },
          ]}
        />
      </View>

      <Animated.View style={[styles.voterSection, { opacity: fadeAnim }]}>
        <Text style={styles.voterLabel}>VOTANDO AGORA</Text>
        {currentVoter.photoUri ? (
          <Image source={{ uri: currentVoter.photoUri }} style={styles.voterAvatar} />
        ) : (
          <View
            style={[
              styles.voterAvatar,
              styles.avatarPlaceholder,
              { backgroundColor: getAvatarColor(currentVoter.name) },
            ]}
          >
            <Text style={styles.voterAvatarText}>{getInitials(currentVoter.name)}</Text>
          </View>
        )}
        <Text style={styles.voterName}>{currentVoter.name}</Text>
        <Text style={styles.voteProgress}>
          {votedCount + 1} de {totalVoters}
        </Text>
      </Animated.View>

      <Animated.View style={{ opacity: fadeAnim }}>
        <Text style={styles.chooseLabel}>Quem merece essa carta?</Text>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.optionsContainer}
        >
          {state.players.map((player) => (
            <TouchableOpacity
              key={player.id}
              style={styles.voteOption}
              onPress={() => handleVote(player.id)}
              activeOpacity={0.7}
            >
              {player.photoUri ? (
                <Image source={{ uri: player.photoUri }} style={styles.optionAvatar} />
              ) : (
                <View
                  style={[
                    styles.optionAvatar,
                    styles.avatarPlaceholder,
                    { backgroundColor: getAvatarColor(player.name) },
                  ]}
                >
                  <Text style={styles.optionAvatarText}>{getInitials(player.name)}</Text>
                </View>
              )}
              <Text style={styles.optionName}>{player.name}</Text>
              <Text style={styles.optionCardCount}>
                {player.cardCount} 🃏
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
  },
  cardReminder: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  cardReminderText: {
    color: '#888',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
  progressBar: {
    height: 3,
    backgroundColor: '#222',
    borderRadius: 2,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: 2,
  },
  voterSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  voterLabel: {
    color: '#555',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 3,
    marginBottom: 12,
  },
  voterAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 8,
  },
  voterAvatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  voterName: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
  },
  voteProgress: {
    color: '#555',
    fontSize: 13,
    marginTop: 4,
  },
  chooseLabel: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  optionsContainer: {
    paddingBottom: 40,
  },
  voteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  optionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 14,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionAvatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  optionName: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  optionCardCount: {
    color: '#666',
    fontSize: 13,
  },
  tieHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  tieIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  tieTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 4,
  },
  tieSubtitle: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
});
