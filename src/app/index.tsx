import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C } from '@/constants/colors';
import { useAuth } from '@/context/auth';

const MIN_DURATION = 1800;
const TRACK_WIDTH = 120;
const BAR_WIDTH = 44;

/**
 * Écran de démarrage, affiché pendant la restauration de session. Fond uni
 * bleu nuit, identique au splash natif (app.json) : la transition est invisible.
 */
export default function Splash() {
  const { ready, user, store } = useAuth();
  const insets = useSafeAreaInsets();
  const [elapsed, setElapsed] = useState(false);
  const [fade] = useState(() => new Animated.Value(0));
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    SplashScreen.hideAsync();
    Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    const loop = Animated.loop(Animated.timing(progress, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }));
    loop.start();
    const t = setTimeout(() => setElapsed(true), MIN_DURATION);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, [fade, progress]);

  useEffect(() => {
    if (!ready || !elapsed) return;
    if (!user) router.replace('/connexion');
    else if (!store) router.replace('/bienvenue');
    else router.replace('/accueil');
  }, [ready, elapsed, user, store]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <Animated.View style={[styles.center, { opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
        <Image source={require('@/assets/images/logo-fond-noir.png')} style={styles.logo} contentFit="contain" accessibilityLabel="M Boutique" />
        <Text style={styles.tagline}>Votre boutique, notre priorité</Text>
      </Animated.View>

      <Animated.View style={[styles.loader, { bottom: insets.bottom + 56, opacity: fade }]} accessibilityLabel="Chargement">
        <View style={styles.track}>
          <Animated.View
            style={[styles.bar, { transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-BAR_WIDTH, TRACK_WIDTH] }) }] }]}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.dark },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 280, height: 219 },
  tagline: { color: 'rgba(255,255,255,0.85)', fontSize: 15, marginTop: 14, letterSpacing: 0.2 },
  loader: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  track: { width: TRACK_WIDTH, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  bar: { width: BAR_WIDTH, height: 4, borderRadius: 2, backgroundColor: C.primary },
});
