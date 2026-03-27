import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useGame } from '../context/GameContext';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: Props) {
  const { createRoom, joinRoom, state } = useGame();
  const [showSync, setShowSync] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const titleFade = useRef(new Animated.Value(0)).current;
  const syncFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(titleFade, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.timing(syncFade, {
      toValue: showSync ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showSync]);

  const handleCreateRoom = async () => {
    setLoading(true);
    try {
      const code = await createRoom();
      setLoading(false);
      const alertMsg = `Compartilhe este codigo com seus amigos:\n\n${code}`;
      if (Platform.OS === 'web') {
        window.alert(alertMsg);
      } else {
        Alert.alert('Sala Criada!', alertMsg);
      }
      navigation.navigate('Players');
    } catch {
      setLoading(false);
      const errMsg = 'Nao foi possivel criar a sala. Verifique sua conexao.';
      if (Platform.OS === 'web') {
        window.alert(errMsg);
      } else {
        Alert.alert('Erro', errMsg);
      }
    }
  };

  const handleJoinRoom = async () => {
    if (joinCode.length < 5) {
      const msg = 'Digite o codigo de 5 caracteres da sala.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Codigo invalido', msg);
      }
      return;
    }

    setLoading(true);
    try {
      const success = await joinRoom(joinCode.toUpperCase());
      setLoading(false);
      if (success) {
        navigation.navigate('Players');
      } else {
        const msg = 'Sala nao encontrada. Verifique o codigo.';
        if (Platform.OS === 'web') {
          window.alert(msg);
        } else {
          Alert.alert('Sala nao encontrada', msg);
        }
      }
    } catch {
      setLoading(false);
      const msg = 'Nao foi possivel entrar na sala. Verifique sua conexao.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Erro', msg);
      }
    }
  };

  const handleLocalPlay = () => {
    navigation.navigate('Players');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <Animated.View style={[styles.titleContainer, { opacity: titleFade }]}>
        <Text style={styles.title}>AMIGOS</Text>
        <Text style={styles.titleAccent}>DE MERDA</Text>
        <Text style={styles.subtitle}>o jogo que testa amizades</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.buttonContainer,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {!showSync ? (
          <>
            <TouchableOpacity
              style={styles.button}
              activeOpacity={0.8}
              onPress={handleLocalPlay}
            >
              <Text style={styles.buttonText}>JOGAR LOCAL</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.syncButton}
              activeOpacity={0.8}
              onPress={() => setShowSync(true)}
            >
              <Text style={styles.syncButtonText}>JOGAR ONLINE</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Animated.View style={[styles.syncContainer, { opacity: syncFade }]}>
            {loading ? (
              <ActivityIndicator size="large" color="#FFF" />
            ) : (
              <>
                <TouchableOpacity
                  style={styles.button}
                  activeOpacity={0.8}
                  onPress={handleCreateRoom}
                >
                  <Text style={styles.buttonText}>CRIAR SALA</Text>
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>ou</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TextInput
                  style={styles.codeInput}
                  placeholder="CODIGO DA SALA"
                  placeholderTextColor="#555"
                  value={joinCode}
                  onChangeText={(t) => setJoinCode(t.toUpperCase())}
                  maxLength={5}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />

                <TouchableOpacity
                  style={[
                    styles.joinButton,
                    joinCode.length < 5 && styles.joinButtonDisabled,
                  ]}
                  activeOpacity={0.8}
                  onPress={handleJoinRoom}
                  disabled={joinCode.length < 5}
                >
                  <Text style={styles.joinButtonText}>ENTRAR NA SALA</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backLink}
                  onPress={() => {
                    setShowSync(false);
                    setJoinCode('');
                  }}
                >
                  <Text style={styles.backLinkText}>VOLTAR</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  title: {
    color: '#FFF',
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: 8,
  },
  titleAccent: {
    color: '#FFF',
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: 8,
    marginTop: -4,
  },
  subtitle: {
    color: '#666',
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: 4,
    marginTop: 16,
    textTransform: 'lowercase',
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    backgroundColor: '#FFF',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 6,
  },
  syncButton: {
    borderWidth: 1,
    borderColor: '#333',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 12,
  },
  syncButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 6,
  },
  syncContainer: {
    width: '100%',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#222',
  },
  dividerText: {
    color: '#555',
    fontSize: 14,
    marginHorizontal: 16,
    fontWeight: '500',
  },
  codeInput: {
    backgroundColor: '#111',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 12,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  joinButton: {
    backgroundColor: '#333',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 12,
  },
  joinButtonDisabled: {
    opacity: 0.4,
  },
  joinButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 4,
  },
  backLink: {
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 8,
  },
  backLinkText: {
    color: '#555',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 3,
  },
});
