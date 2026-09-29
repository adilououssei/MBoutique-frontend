import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { C, R } from '@/constants/colors';
import { parseVoiceProduct } from '@/lib/voice-parser';

const BARS = [8, 14, 22, 12, 30, 18, 40, 26, 48, 26, 40, 18, 30, 12, 22, 14, 8];

// Reconnaissance vocale du navigateur (Chrome/Edge). Sur mobile natif, la
// dictée se fait via le micro du clavier dans le champ texte.
function getWebRecognition(): any {
  if (Platform.OS !== 'web') return null;
  const w = globalThis as any;
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export default function CreationVocale() {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [pulse] = useState(() => new Animated.Value(0));
  const recognition = useRef<any>(null);
  const input = useRef<TextInput>(null);

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => {
      loop.stop();
      recognition.current?.stop?.();
    };
  }, [pulse]);

  function toggleMic() {
    if (listening) {
      recognition.current?.stop?.();
      setListening(false);
      return;
    }
    const rec = getWebRecognition();
    if (!rec) {
      // Natif : on ouvre le clavier, l'utilisateur appuie sur son micro pour dicter.
      input.current?.focus();
      return;
    }
    rec.lang = 'fr-FR';
    rec.interimResults = true;
    rec.onresult = (e: any) => setText(Array.from(e.results).map((r: any) => r[0].transcript).join(' '));
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognition.current = rec;
    rec.start();
    setListening(true);
  }

  function send() {
    const draft = parseVoiceProduct(text);
    router.push({ pathname: '/produits/formulaire', params: { source: 'vocal', nom: draft.nom, prix_detail: draft.prix_detail ?? '', prix_gros: draft.prix_gros ?? '' } });
  }

  const ring = (delay: number) => ({
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35 - delay, 0] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5 + delay] }) }],
  });

  return (
    <Screen title="Création vocale" footer={<Button title="Envoyer" onPress={send} disabled={text.trim().length < 2} />}>
      <View style={styles.center}>
        <View style={styles.micWrap}>
          <Animated.View style={[styles.ring, ring(0)]} />
          <Animated.View style={[styles.ring, ring(0.15)]} />
          <Pressable onPress={toggleMic} style={[styles.mic, listening && { backgroundColor: C.primaryDeep }]} accessibilityRole="button" accessibilityLabel={listening ? 'Arrêter la dictée' : 'Démarrer la dictée'}>
            <Ionicons name={listening ? 'stop' : 'mic'} size={48} color={C.white} />
          </Pressable>
        </View>

        <View style={styles.wave}>
          {BARS.map((h, i) => (
            <View key={i} style={[styles.bar, { height: h, opacity: (listening ? 0.45 : 0.25) + (h / 48) * (listening ? 0.55 : 0.5) }]} />
          ))}
        </View>

        <Text style={styles.title}>{listening ? 'Je vous écoute…' : 'Parlez maintenant…'}</Text>
        <Text style={styles.help}>Décrivez le produit que vous souhaitez créer</Text>
        <Text style={styles.example}>(ex: &quot;Coca-Cola 50cl en détail à 600 et en gros à 550&quot;)</Text>
      </View>

      <TextInput
        ref={input}
        value={text}
        onChangeText={setText}
        placeholder={Platform.OS === 'web' ? 'Votre description apparaîtra ici…' : 'Touchez ici pour dicter ou écrire…'}
        placeholderTextColor={C.textLight}
        multiline
        style={[styles.transcript, { outlineStyle: 'none' } as any]}
      />
      {Platform.OS !== 'web' && (
        <View style={styles.tip}>
          <Ionicons name="mic-outline" size={16} color={C.primary} />
          <Text style={styles.tipText}>Pour dicter, touchez le champ puis l&apos;icône micro de votre clavier.</Text>
        </View>
      )}
      <Text style={styles.note}>Le produit n&apos;est pas enregistré directement : vous pourrez vérifier et corriger les informations avant de valider.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingTop: 24, gap: 10 },
  micWrap: { width: 170, height: 170, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: C.primary },
  mic: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 8,
    borderColor: '#FFD9C6',
  },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 56, marginVertical: 8 },
  bar: { width: 4, borderRadius: 2, backgroundColor: C.primary },
  title: { fontSize: 17, fontWeight: '700', color: C.text },
  help: { fontSize: 13, color: C.text, textAlign: 'center' },
  example: { fontSize: 12, color: C.textMuted, textAlign: 'center' },
  transcript: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    padding: 14,
    fontSize: 15,
    color: C.text,
    textAlignVertical: 'top',
    backgroundColor: C.background,
  },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primarySoft, borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 10 },
  tipText: { flex: 1, fontSize: 12, color: C.text },
  note: { fontSize: 12, color: C.textMuted, textAlign: 'center' },
});
