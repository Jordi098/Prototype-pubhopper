import { BLAAK_PUBS } from '../data/pubHopperData';

export const PUB_DURATION_SECONDS = 20 * 60;
export const DEMO_DURATION_SECONDS = 60;

export function createSession(setup, matchedGroup) {
  const now = Date.now();
  return {
    id: `pub-hop-${now}`,
    setup,
    matchedGroup,
    route: BLAAK_PUBS,
    currentPubIndex: 0,
    startedAt: now,
    pubStartedAt: now,
    secondsPerPub: setup.demoMode ? DEMO_DURATION_SECONDS : PUB_DURATION_SECONDS,
    photos: {},
    completed: false,
  };
}

export function formatTimer(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function starterIndexForElapsed(elapsedSeconds) {
  return Math.min(3, Math.floor(elapsedSeconds / 300));
}

export function canAdvance(session) {
  const pub = session.route[session.currentPubIndex];
  return Boolean(session.photos[pub.id]);
}
