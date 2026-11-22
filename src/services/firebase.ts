import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDocFromServer,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { ChatRoom, CollabSession, MusicianProfile, QuickRequest } from '../types';
import {
  sanitizeMusicianPayload,
  sanitizeQuickRequestPayload,
  sanitizeSessionPayload,
} from '../utils/validation';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/meetings.space.created',
  'https://www.googleapis.com/auth/contacts.readonly',
];

const provider = new GoogleAuthProvider();
for (const scope of WORKSPACE_SCOPES) {
  provider.addScope(scope);
}
provider.setCustomParameters({ prompt: 'consent' });

// Strictly in-memory token cache — never persisted in localStorage or sessionStorage
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Firebase offline: verifique a configuração de firebase-applet-config.json.');
    }
    return false;
  }
}

void testConnection();

export function initAuth(
  onAuthUpdate: (user: User | null, token: string | null) => void
): Unsubscribe {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (!user) {
      cachedAccessToken = null;
      onAuthUpdate(null, null);
      return;
    }
    if (!isSigningIn) {
      onAuthUpdate(user, cachedAccessToken);
    }
  });
}

export async function googleSignIn(): Promise<{ user: User; accessToken: string }> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso do Google Workspace.');
    }
    cachedAccessToken = credential.accessToken;

    // Persist private PII profile isolated under /users/{uid}/private/profile
    const privatePath = `users/${result.user.uid}/private`;
    try {
      await setDoc(
        doc(db, privatePath, 'profile'),
        {
          uid: result.user.uid,
          email: result.user.email || '',
          displayName: result.user.displayName || 'Artista',
          updatedAt: serverTimestamp(),
        },
        { merge: false }
      );
    } catch (err) {
      console.warn('Private profile sync skipped:', err);
    }

    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
}

export async function getAccessToken(): Promise<string | null> {
  return cachedAccessToken;
}

export async function logout(): Promise<void> {
  cachedAccessToken = null;
  await auth.signOut();
}

export function subscribePublishedMusicians(
  onData: (musicians: MusicianProfile[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'musicians';
  const q = query(collection(db, path), where('isPublished', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: MusicianProfile[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        items.push({
          id: docSnap.id,
          ownerId: String(d.ownerId || ''),
          name: String(d.name || ''),
          stageName: String(d.stageName || ''),
          region: String(d.region || ''),
          macroRegion: d.macroRegion,
          genres: Array.isArray(d.genres) ? d.genres : [],
          instruments: Array.isArray(d.instruments) ? d.instruments : [],
          experienceLevel: d.experienceLevel,
          collabFormat: d.collabFormat,
          availability: String(d.availability || ''),
          bio: String(d.bio || ''),
          dawSetup: String(d.dawSetup || ''),
          lookingFor: String(d.lookingFor || ''),
          avatarUrl: String(d.avatarUrl || ''),
          openToCrossNiche: Boolean(d.openToCrossNiche),
          isPublished: Boolean(d.isPublished),
        });
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function upsertMusicianProfile(
  profileId: string,
  payload: Omit<MusicianProfile, 'id' | 'demoContactEmail'>,
  isUpdate: boolean
): Promise<void> {
  const path = `musicians/${profileId}`;
  const clean = sanitizeMusicianPayload(payload);
  try {
    if (isUpdate) {
      await updateDoc(doc(db, 'musicians', profileId), {
        name: clean.name,
        stageName: clean.stageName,
        region: clean.region,
        macroRegion: clean.macroRegion,
        genres: clean.genres,
        instruments: clean.instruments,
        experienceLevel: clean.experienceLevel,
        collabFormat: clean.collabFormat,
        availability: clean.availability,
        bio: clean.bio,
        dawSetup: clean.dawSetup,
        lookingFor: clean.lookingFor,
        avatarUrl: clean.avatarUrl,
        openToCrossNiche: clean.openToCrossNiche,
        isPublished: clean.isPublished,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'musicians', profileId), {
        ...clean,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isUpdate ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export function subscribeUserSessions(
  uid: string,
  onData: (sessions: CollabSession[]) => void
): Unsubscribe {
  const path = 'sessions';
  const q = query(collection(db, path), where('participantIds', 'array-contains', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: CollabSession[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          hostId: String(d.hostId || ''),
          hostName: String(d.hostName || ''),
          participantIds: Array.isArray(d.participantIds) ? d.participantIds : [],
          participantNames: Array.isArray(d.participantNames) ? d.participantNames : [],
          title: String(d.title || ''),
          format: d.format,
          scheduledAt: String(d.scheduledAt || ''),
          durationMinutes: Number(d.durationMinutes || 60),
          status: d.status,
          meetUri: String(d.meetUri || ''),
          notes: String(d.notes || ''),
          updatedAt: new Date().toISOString(),
        });
      });
      onData(list);
    },
    (error) => {
      console.warn('Sessions listener error:', error);
    }
  );
}

export async function saveSessionToFirestore(session: CollabSession, isUpdate: boolean): Promise<void> {
  const path = `sessions/${session.id}`;
  const clean = sanitizeSessionPayload(session);
  try {
    if (isUpdate) {
      await updateDoc(doc(db, 'sessions', session.id), {
        title: clean.title,
        format: clean.format,
        scheduledAt: clean.scheduledAt,
        durationMinutes: clean.durationMinutes,
        status: clean.status,
        meetUri: clean.meetUri,
        notes: clean.notes,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'sessions', session.id), {
        ...clean,
        status: 'agendada',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isUpdate ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function saveConversationToFirestore(room: ChatRoom): Promise<void> {
  if (!auth.currentUser) return;
  const path = `conversations/${room.id}`;
  try {
    await setDoc(
      doc(db, 'conversations', room.id),
      {
        creatorId: auth.currentUser.uid,
        participantIds: room.participantIds.slice(0, 5),
        title: room.title.slice(0, 120),
        lastMessageText: room.lastMessageText.slice(0, 500),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: false }
    );
  } catch (err) {
    console.warn('Conversation Firestore sync skipped:', err);
  }
}

export function subscribeQuickRequests(
  onData: (requests: QuickRequest[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'quickRequests';
  const q = query(
    collection(db, path),
    where('status', 'in', ['aberto', 'em_andamento', 'resolvido'])
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list: QuickRequest[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const createdAtIso =
          typeof d.createdAt?.toDate === 'function'
            ? d.createdAt.toDate().toISOString()
            : new Date().toISOString();
        const updatedAtIso =
          typeof d.updatedAt?.toDate === 'function'
            ? d.updatedAt.toDate().toISOString()
            : new Date().toISOString();
        list.push({
          id: docSnap.id,
          authorId: String(d.authorId || ''),
          authorName: String(d.authorName || ''),
          authorStageName: String(d.authorStageName || ''),
          authorRegion: String(d.authorRegion || ''),
          macroRegion: d.macroRegion,
          title: String(d.title || ''),
          description: String(d.description || ''),
          instrumentNeeded: String(d.instrumentNeeded || ''),
          genreContext: String(d.genreContext || ''),
          bpmAndKey: String(d.bpmAndKey || ''),
          collabFormat: d.collabFormat,
          urgency: d.urgency,
          status: d.status,
          responseCount: Number(d.responseCount || 0),
          createdAt: createdAtIso,
          updatedAt: updatedAtIso,
        });
      });
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function saveQuickRequestToFirestore(request: QuickRequest): Promise<void> {
  const path = `quickRequests/${request.id}`;
  const clean = sanitizeQuickRequestPayload(request);
  try {
    await setDoc(doc(db, 'quickRequests', request.id), {
      ...clean,
      status: 'aberto',
      responseCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateQuickRequestInFirestore(
  request: QuickRequest,
  mode: 'respond' | 'resolve'
): Promise<void> {
  const path = `quickRequests/${request.id}`;
  const clean = sanitizeQuickRequestPayload(request);
  try {
    if (mode === 'resolve') {
      await updateDoc(doc(db, 'quickRequests', request.id), {
        status: 'resolvido',
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'quickRequests', request.id), {
        responseCount: clean.responseCount,
        status: clean.status === 'resolvido' ? 'em_andamento' : clean.status,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
