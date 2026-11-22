export type MacroRegion =
  | 'Norte'
  | 'Nordeste'
  | 'Centro-Oeste'
  | 'Sudeste'
  | 'Sul'
  | 'Remoto / Global';

export type ExperienceLevel =
  | 'Emergente'
  | 'Intermediário'
  | 'Profissional'
  | 'Produtor / Diretor';

export type CollabFormat = 'Remoto' | 'Presencial' | 'Híbrido';

export type SessionStatus = 'agendada' | 'confirmada' | 'concluida' | 'cancelada';

export type SessionFormat = 'Remota (Google Meet)' | 'Presencial' | 'Híbrida';

export interface MusicianProfile {
  id: string;
  ownerId: string;
  name: string;
  stageName: string;
  region: string;
  macroRegion: MacroRegion;
  genres: string[];
  instruments: string[];
  experienceLevel: ExperienceLevel;
  collabFormat: CollabFormat;
  availability: string;
  bio: string;
  dawSetup: string;
  lookingFor: string;
  avatarUrl: string;
  openToCrossNiche: boolean;
  isPublished: boolean;
  /** Optional contact email only populated locally or via Google Contacts — never stored in public Firestore musician docs */
  demoContactEmail?: string;
}

export interface ChatRoom {
  id: string;
  title: string;
  participantIds: string[];
  participantNames: string[];
  otherMusicianId?: string;
  otherMusicianName?: string;
  otherMusicianSubtitle?: string;
  otherMusicianAvatar?: string;
  otherContactEmail?: string;
  lastMessageText: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
  emailedToGmail?: boolean;
}

export type MeetParticipantSource = 'google_account' | 'anonymous' | 'phone';

export interface MeetParticipantContact {
  id: string;
  displayName: string;
  email?: string;
  photoUrl?: string;
  source: MeetParticipantSource;
  inGoogleContacts: boolean;
  earliestStartTime?: string;
  latestEndTime?: string;
  activeNow: boolean;
}

export interface CollabSession {
  id: string;
  hostId: string;
  hostName: string;
  participantIds: string[];
  participantNames: string[];
  title: string;
  format: SessionFormat;
  scheduledAt: string;
  durationMinutes: number;
  status: SessionStatus;
  meetUri: string;
  notes: string;
  updatedAt: string;
  reminderTaskId?: string;
  reminderTaskTitle?: string;
  meetImportedContacts?: MeetParticipantContact[];
}

export type RequestUrgency = 'Hoje / Urgente' | 'Esta semana' | 'Sem pressa';

export type RequestStatus = 'aberto' | 'em_andamento' | 'resolvido';

export interface QuickRequest {
  id: string;
  authorId: string;
  authorName: string;
  authorStageName: string;
  authorRegion: string;
  macroRegion: MacroRegion;
  title: string;
  description: string;
  instrumentNeeded: string;
  genreContext: string;
  bpmAndKey: string;
  collabFormat: CollabFormat;
  urgency: RequestUrgency;
  status: RequestStatus;
  responseCount: number;
  demoContactEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FilterState {
  search: string;
  macroRegion: string;
  genre: string;
  instrument: string;
  collabFormat: string;
  experienceLevel: string;
  onlyCrossNiche: boolean;
}

export interface GoogleContactItem {
  resourceName: string;
  name: string;
  email: string;
  photoUrl?: string;
}

export interface GoogleTaskItem {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
}

export interface CuratedMatchRecommendation {
  musicianId: string;
  stageName: string;
  musicalRationale: string;
  crossNicheBridge: string;
  suggestedSessionFormat: string;
}

export interface CuratedMatchResponse {
  summary: string;
  suggestedBpmAndKey: string;
  rehearsalChecklist: string[];
  matches: CuratedMatchRecommendation[];
}

export interface GmailDraftRequest {
  to: string;
  subject: string;
  body: string;
  contextLabel: string;
  messageId?: string;
  conversationId?: string;
}
