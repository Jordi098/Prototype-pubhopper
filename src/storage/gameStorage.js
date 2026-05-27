import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'pub-hopper-blaak-session-v1';

export async function loadGameSession() {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveGameSession(session) {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function clearGameSession() {
  await AsyncStorage.removeItem(SESSION_KEY);
}
