import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const titleFade = useRef(new Animated.Value(0)).current;

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
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Players')}
        >
          <Text style={styles.buttonText}>INICIAR</Text>
        </TouchableOpacity>
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
});
