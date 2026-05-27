import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import GameButton from './src/components/GameButton';
import SelectablePill from './src/components/SelectablePill';
import { BLAAK_PUBS, INTERESTS, START_TIMES } from './src/data/pubHopperData';
import { findMatchingGroups } from './src/services/matchmakingService';
import { clearGameSession, loadGameSession, saveGameSession } from './src/storage/gameStorage';
import { canAdvance, createSession, formatTimer, starterIndexForElapsed } from './src/utils/pubHopper';

export default function App() {
  const [setup, setSetup] = useState({
    groupSize: 4,
    startTime: '20:00',
    interests: ['craft beer', 'music'],
    demoMode: true,
  });
  const [screenState, setScreenState] = useState('loading');
  const [session, setSession] = useState(null);
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (screenState !== 'route') return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [screenState]);

  const pub = session?.route[session.currentPubIndex];
  const elapsedSeconds = session ? Math.floor((now - session.pubStartedAt) / 1000) : 0;
  const remainingSeconds = session ? Math.max(0, session.secondsPerPub - elapsedSeconds) : 0;
  const promptIndex = useMemo(() => starterIndexForElapsed(elapsedSeconds), [elapsedSeconds]);

  async function restoreSession() {
    try {
      const saved = await loadGameSession();
      if (saved?.setup) setSetup(saved.setup);
      if (saved?.completed) {
        setSession(saved);
        setScreenState('finished');
        return;
      }
      if (saved) {
        setSession(saved);
        setScreenState('route');
        return;
      }
      setScreenState('setup');
    } catch (e) {
      setError('Could not load your saved pub hop.');
      setScreenState('setup');
    }
  }

  function toggleInterest(interest) {
    setSetup((current) => {
      const exists = current.interests.includes(interest);
      return {
        ...current,
        interests: exists
          ? current.interests.filter((item) => item !== interest)
          : [...current.interests, interest],
      };
    });
  }

  async function startMatchmaking() {
    setError('');
    setSuccess('');

    if (setup.groupSize < 4 || setup.groupSize > 8) {
      setError('Group size must be between 4 and 8 people.');
      return;
    }
    if (!setup.startTime) {
      setError('Choose a start time.');
      return;
    }
    if (setup.interests.length === 0) {
      setError('Choose at least one interest.');
      return;
    }

    try {
      setScreenState('matching');
      const result = await findMatchingGroups(setup);
      setMatches(result);
      setScreenState(result.length ? 'matches' : 'empty');
    } catch (e) {
      setError('Matchmaking failed. Try again.');
      setScreenState('setup');
    }
  }

  async function startRoute(match) {
    const nextSession = createSession(setup, match);
    try {
      await saveGameSession(nextSession);
      setSession(nextSession);
      setSuccess(`Matched with ${match.name}. First stop unlocked.`);
      setScreenState('route');
    } catch (e) {
      setError('Could not save this session.');
    }
  }

  async function updateSession(patch) {
    const nextSession = { ...session, ...patch };
    try {
      await saveGameSession(nextSession);
      setSession(nextSession);
      return nextSession;
    } catch (e) {
      setError('Could not save progress on this device.');
      return session;
    }
  }

  async function addPhoto() {
    try {
      setError('');
      setSuccess('');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.75,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        setError('No image was selected.');
        return;
      }

      const photos = {
        ...session.photos,
        [pub.id]: {
          uri: asset.uri,
          addedAt: Date.now(),
          pubName: pub.name,
        },
      };
      const saved = await updateSession({ photos });
      if (saved !== session) setSuccess(`Photo saved for ${pub.name}.`);
    } catch (e) {
      setError('Could not add the photo on this device.');
    }
  }

  async function advancePub() {
    const timerDone = Date.now() - session.pubStartedAt >= session.secondsPerPub * 1000;
    if (!session.setup.demoMode && !timerDone) {
      setError('Finish the pub timer before moving on.');
      return;
    }
    if (!canAdvance(session)) {
      setError('Add a photo at this pub before moving on.');
      return;
    }

    const nextIndex = session.currentPubIndex + 1;
    if (nextIndex >= session.route.length) {
      const completed = { ...session, completed: true, completedAt: Date.now() };
      try {
        await saveGameSession(completed);
        setSession(completed);
        setSuccess('Pub hop complete. Your photo overview is ready.');
        setScreenState('finished');
      } catch (e) {
        setError('Could not save the completed route.');
      }
      return;
    }

    await updateSession({
      currentPubIndex: nextIndex,
      pubStartedAt: Date.now(),
    });
    setNow(Date.now());
    setSuccess(`Next stop: ${session.route[nextIndex].name}.`);
  }

  async function playAgain() {
    try {
      await clearGameSession();
      setSession(null);
      setMatches([]);
      setError('');
      setSuccess('');
      setScreenState('setup');
    } catch (e) {
      setError('Could not reset the saved route.');
    }
  }

  async function shiftTimer(seconds) {
    if (!session?.setup.demoMode) return;
    await updateSession({ pubStartedAt: session.pubStartedAt - seconds * 1000 });
    setNow(Date.now());
  }

  function renderBanner() {
    if (!error && !success) return null;
    return (
      <View style={[styles.banner, error ? styles.errorBanner : styles.successBanner]}>
        <Text selectable style={[styles.bannerText, error ? styles.errorText : styles.successText]}>
          {error || success}
        </Text>
      </View>
    );
  }

  if (screenState === 'loading') {
    return (
      <View style={styles.center}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" />
        <Text selectable style={styles.muted}>Loading your pub hop...</Text>
      </View>
    );
  }

  if (screenState === 'matching') {
    return (
      <View style={styles.center}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" />
        <Text selectable style={styles.title}>Finding compatible groups</Text>
        <Text selectable style={styles.muted}>Checking group size, start time, and shared interests.</Text>
      </View>
    );
  }

  if (screenState === 'empty') {
    return (
      <Page>
        <Text selectable style={styles.kicker}>Pub Hopper Blaak</Text>
        <Text selectable style={styles.heroTitle}>No groups found</Text>
        <Text selectable style={styles.body}>
          The mock pool did not return a match. Add more interests or try another time slot.
        </Text>
        {renderBanner()}
        <GameButton onPress={() => setScreenState('setup')}>Change setup</GameButton>
      </Page>
    );
  }

  if (screenState === 'matches') {
    return (
      <Page>
        <Text selectable style={styles.kicker}>Pub Hopper Blaak</Text>
        <Text selectable style={styles.heroTitle}>Choose your match</Text>
        <Text selectable style={styles.body}>These mock groups are available around Blaak.</Text>
        {matches.map((match) => (
          <Card key={match.id}>
            <View style={styles.rowBetween}>
              <View style={styles.flex}>
                <Text selectable style={styles.cardTitle}>{match.name}</Text>
                <Text selectable style={styles.muted}>{match.size} people at {match.startTime}</Text>
              </View>
              <Text selectable style={styles.score}>{match.matchScore}%</Text>
            </View>
            <Text selectable style={styles.body}>{match.note}</Text>
            <Text selectable style={styles.smallText}>Shared: {match.sharedInterests.join(', ')}</Text>
            <GameButton onPress={() => startRoute(match)}>Start with this group</GameButton>
          </Card>
        ))}
        <GameButton variant="secondary" onPress={() => setScreenState('setup')}>Back to setup</GameButton>
      </Page>
    );
  }

  if (screenState === 'route' && session && pub) {
    const photo = session.photos[pub.id];
    const timerFinished = remainingSeconds === 0;
    const canAddPhoto = timerFinished || session.setup.demoMode;
    const canCompleteStop = Boolean(photo) && canAddPhoto;
    const prompt = pub.conversationStarters[promptIndex] || pub.conversationStarters[3];

    return (
      <Page>
        <View style={styles.routeHeader}>
          <View style={styles.flex}>
            <Text selectable style={styles.kicker}>Stop {session.currentPubIndex + 1} of {session.route.length}</Text>
            <Text selectable style={styles.heroTitle}>{pub.name}</Text>
            <Text selectable style={styles.body}>{pub.area} - {pub.walk}</Text>
          </View>
          <View style={styles.timerBox}>
            <Text selectable style={styles.timer}>{formatTimer(remainingSeconds)}</Text>
            <Text selectable style={styles.timerLabel}>{timerFinished ? 'time is up' : 'left'}</Text>
          </View>
        </View>

        {renderBanner()}

        <View style={styles.promptCard}>
          <Text selectable style={styles.promptKicker}>Conversation starter</Text>
          <Text selectable style={styles.prompt}>{prompt}</Text>
          <Text selectable style={styles.promptMeta}>A new starter appears every 5 minutes.</Text>
        </View>

        <Card>
          <Text selectable style={styles.cardTitle}>Pub brief</Text>
          <Text selectable style={styles.body}>{pub.vibe}</Text>
          <Text selectable style={styles.smallText}>Address: {pub.address}</Text>
          <Text selectable style={styles.smallText}>Suggested: {pub.suggestedDrink}</Text>
          <Text selectable style={styles.smallText}>{pub.funFact}</Text>
        </Card>

        <Card>
          <Text selectable style={styles.cardTitle}>Required photo</Text>
          <Text selectable style={styles.body}>Add a local photo preview before this stop can be completed.</Text>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text selectable style={styles.muted}>
                {canAddPhoto ? 'No photo for this pub yet.' : 'Photo unlocks when the timer ends.'}
              </Text>
            </View>
          )}
          <GameButton variant="secondary" disabled={!canAddPhoto} onPress={addPhoto}>
            {photo ? 'Replace photo' : 'Add photo'}
          </GameButton>
        </Card>

        {session.setup.demoMode && (
          <Card>
            <Text selectable style={styles.cardTitle}>Demo controls</Text>
            <View style={styles.buttonRow}>
              <View style={styles.flex}>
                <GameButton variant="secondary" onPress={() => shiftTimer(300)}>Fast +5 min</GameButton>
              </View>
              <View style={styles.flex}>
                <GameButton variant="secondary" onPress={() => shiftTimer(session.secondsPerPub)}>Finish timer</GameButton>
              </View>
            </View>
          </Card>
        )}

        <Card>
          <Text selectable style={styles.cardTitle}>Blaak route</Text>
          {session.route.map((item, index) => (
            <View key={item.id} style={styles.routeItem}>
              <Text selectable style={[styles.routeIndex, index === session.currentPubIndex && styles.activeRouteIndex]}>
                {index + 1}
              </Text>
              <View style={styles.flex}>
                <Text selectable style={styles.routeName}>{item.name}</Text>
                <Text selectable style={styles.smallText}>{item.area} - {item.walk}</Text>
              </View>
              <Text selectable style={styles.smallText}>{session.photos[item.id] ? 'Photo' : 'Open'}</Text>
            </View>
          ))}
        </Card>

        <GameButton disabled={!canCompleteStop} onPress={advancePub}>
          {session.currentPubIndex === session.route.length - 1 ? 'Finish pub hop' : 'Complete stop'}
        </GameButton>
        <GameButton variant="danger" onPress={playAgain}>Reset demo</GameButton>
      </Page>
    );
  }

  if (screenState === 'finished' && session) {
    return (
      <Page>
        <Text selectable style={styles.kicker}>Pub Hopper Blaak</Text>
        <Text selectable style={styles.heroTitle}>Five pubs completed</Text>
        <Text selectable style={styles.body}>
          Matched with {session.matchedGroup.name}. Here is the local photo overview from the route.
        </Text>
        {renderBanner()}
        <View style={styles.photoGrid}>
          {session.route.map((item) => {
            const itemPhoto = session.photos[item.id];
            return (
              <View key={item.id} style={styles.photoCard}>
                {itemPhoto ? <Image source={{ uri: itemPhoto.uri }} style={styles.gridPhoto} /> : <View style={styles.gridPlaceholder} />}
                <Text selectable style={styles.photoCaption}>{item.name}</Text>
              </View>
            );
          })}
        </View>
        <GameButton onPress={playAgain}>Play again</GameButton>
      </Page>
    );
  }

  return (
    <Page>
      <Text selectable style={styles.kicker}>Pub Hopper Blaak</Text>
      <Text selectable style={styles.heroTitle}>Match, hop, capture</Text>
      <Text selectable style={styles.body}>
        Meet another student group and follow five Blaak pubs with timed prompts and photo challenges.
      </Text>
      {renderBanner()}

      <Card>
        <Text selectable style={styles.cardTitle}>Group size</Text>
        <View style={styles.stepper}>
          <GameButton
            variant="secondary"
            disabled={setup.groupSize <= 4}
            onPress={() => setSetup((current) => ({ ...current, groupSize: current.groupSize - 1 }))}
          >
            -
          </GameButton>
          <Text selectable style={styles.stepperValue}>{setup.groupSize}</Text>
          <GameButton
            variant="secondary"
            disabled={setup.groupSize >= 8}
            onPress={() => setSetup((current) => ({ ...current, groupSize: current.groupSize + 1 }))}
          >
            +
          </GameButton>
        </View>
      </Card>

      <Card>
        <Text selectable style={styles.cardTitle}>Start time</Text>
        <View style={styles.wrap}>
          {START_TIMES.map((time) => (
            <SelectablePill
              key={time}
              label={time}
              selected={setup.startTime === time}
              onPress={() => setSetup((current) => ({ ...current, startTime: time }))}
            />
          ))}
        </View>
      </Card>

      <Card>
        <Text selectable style={styles.cardTitle}>Interests</Text>
        <View style={styles.wrap}>
          {INTERESTS.map((interest) => (
            <SelectablePill
              key={interest}
              label={interest}
              selected={setup.interests.includes(interest)}
              onPress={() => toggleInterest(interest)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <View style={styles.rowBetween}>
          <View style={styles.flex}>
            <Text selectable style={styles.cardTitle}>Demo timing</Text>
            <Text selectable style={styles.body}>Use 60-second stops and fast-forward controls.</Text>
          </View>
          <Switch
            value={setup.demoMode}
            onValueChange={(value) => setSetup((current) => ({ ...current, demoMode: value }))}
          />
        </View>
      </Card>

      <Card>
        <Text selectable style={styles.cardTitle}>Route preview</Text>
        {BLAAK_PUBS.map((item) => (
          <View key={item.id} style={styles.routeItem}>
            <Text selectable style={styles.routeIndex}>{item.routeOrder}</Text>
            <View style={styles.flex}>
              <Text selectable style={styles.routeName}>{item.name}</Text>
              <Text selectable style={styles.smallText}>{item.area} - {item.walk}</Text>
            </View>
          </View>
        ))}
      </Card>

      <GameButton disabled={setup.interests.length === 0} onPress={startMatchmaking}>Find a group</GameButton>
    </Page>
  );
}

function Page({ children }) {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <StatusBar style="dark" />
      {children}
    </ScrollView>
  );
}

function Card({ children }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: '#f6f2ea',
  },
  content: {
    padding: 16,
    paddingTop: 54,
    paddingBottom: 36,
    gap: 14,
    backgroundColor: '#f6f2ea',
  },
  kicker: {
    color: '#0f766e',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  heroTitle: {
    color: '#111827',
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '900',
  },
  title: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  body: {
    color: '#4b5563',
    fontSize: 15,
    lineHeight: 21,
  },
  muted: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 20,
  },
  smallText: {
    color: '#6b7280',
    fontSize: 12,
    lineHeight: 17,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  flex: { flex: 1 },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  stepperValue: {
    minWidth: 64,
    textAlign: 'center',
    color: '#111827',
    fontSize: 28,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  score: {
    color: '#0f766e',
    fontSize: 22,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  routeHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  timerBox: {
    minWidth: 96,
    borderRadius: 8,
    backgroundColor: '#111827',
    padding: 12,
    alignItems: 'center',
  },
  timer: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  timerLabel: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '800',
  },
  promptCard: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: '#0f766e',
  },
  promptKicker: {
    color: '#5eead4',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  prompt: {
    color: '#ffffff',
    fontSize: 23,
    lineHeight: 30,
    fontWeight: '900',
  },
  promptMeta: {
    color: '#d1d5db',
    fontSize: 12,
    lineHeight: 17,
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  photoPlaceholder: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  routeItem: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routeIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
    color: '#111827',
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 28,
    fontVariant: ['tabular-nums'],
  },
  activeRouteIndex: {
    backgroundColor: '#0f766e',
    color: '#ffffff',
  },
  routeName: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  banner: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  successBanner: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
  },
  bannerText: { fontWeight: '800' },
  errorText: { color: '#991b1b' },
  successText: { color: '#166534' },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoCard: {
    width: '48%',
    minWidth: 140,
    flexGrow: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  gridPhoto: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#e5e7eb',
  },
  gridPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#e5e7eb',
  },
  photoCaption: {
    color: '#111827',
    fontWeight: '800',
    padding: 10,
  },
});
