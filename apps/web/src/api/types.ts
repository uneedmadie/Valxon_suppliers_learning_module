/**
 * Typy REST kontraktů API (zrcadlí response DTO backendu).
 * Studentské typy (`Learn*`) záměrně neobsahují interní stavy ani správné odpovědi.
 */

export type UserRole = 'admin' | 'student';

export interface SessionUser {
  id: string;
  role: UserRole;
  name: string;
}

export interface Session {
  token: string;
  user: SessionUser;
  mode: 'development';
}

/* ---------- Studentská část ---------- */

export interface Progress {
  completed: number;
  total: number;
  percent: number;
  completedChapterNumbers: number[];
}

export interface AnswerResult {
  selectedIndex: number;
  isCorrect: boolean;
  correctIndex: number;
  explanation: string;
  attempts: number;
  maxAttempts: number;
  answeredAt: string;
}

export interface LearnFact {
  kind: string;
  label: string;
  value: string;
}

export interface LearnProduct {
  id: string;
  name: string;
  sku: string | null;
  productUrl: string | null;
  imageUrl: string | null;
  description: string | null;
  material: string | null;
  category: string | null;
}

export interface LearnQuestion {
  id: string;
  prompt: string;
  options: string[];
  version: number;
}

export interface LearnChapter {
  id: string;
  number: number;
  title: string;
  lead: string;
  body: string;
  highlight: string | null;
  facts: LearnFact[];
  sources: { title: string; url: string }[];
  products: LearnProduct[];
  productListType: 'bestsellers' | 'representative' | null;
  question: LearnQuestion | null;
  answer: AnswerResult | null;
}

export interface LearnLocation {
  city: string | null;
  countryCode: string;
  countryName: string;
  lat: number;
  lng: number;
  distanceKm: number;
  valxon: { city: string; lat: number; lng: number };
}

export type SupplierType = 'unknown' | 'specialist' | 'narrow' | 'generalist';

export interface LearnSupplier {
  slug: string;
  name: string;
  tagline: string | null;
  supplierType: SupplierType;
  websiteUrl: string | null;
  heroImageUrl: string | null;
  location: LearnLocation | null;
  chapters: LearnChapter[];
  progress: Progress;
  preview: boolean;
}

export interface LearnSupplierSummary {
  slug: string;
  name: string;
  tagline: string | null;
  supplierType: SupplierType;
  countryName: string | null;
  heroImageUrl: string | null;
  progress: Progress;
}

export interface SubmitAnswerResponse {
  answer: AnswerResult;
  progress: Progress;
}

/* ---------- Správa ---------- */

export type SupplierStatus = 'draft' | 'importing' | 'review' | 'published';

export interface AdminSupplier {
  id: string;
  slug: string;
  name: string;
  status: SupplierStatus;
  supplierType: SupplierType;
  websiteUrl: string | null;
  tagline: string | null;
  hqCity: string | null;
  hqCountryCode: string | null;
  adminNotes: string | null;
  contentVersion: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Source {
  id: string;
  kind: 'web-root' | 'web' | 'pdf' | 'docx' | 'xlsx' | 'text';
  origin: 'official' | 'external' | 'internal';
  title: string;
  url: string | null;
  originalFileName: string | null;
  sizeBytes: number | null;
  status: 'pending' | 'processed' | 'failed' | 'blocked';
  error: string | null;
  warnings: string[];
  parentSourceId: string | null;
  textLength: number;
  retrievedAt: string | null;
}

export interface SourceSegment {
  id: string;
  ordinal: number;
  location: string;
  text: string;
}

export interface ImportLogEntry {
  at: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface ImportReport {
  sourcesProcessed: number;
  sourcesFailed: number;
  pagesFetched: number;
  factsCreated: number;
  productsDiscovered: number;
  failedUrls: { url: string; reason: string }[];
  missingTopics: { chapter: number; topic: string }[];
  conflicts: { kind: string; label: string; values: string[] }[];
  recommendations: string[];
  ai: { status: 'unavailable' | 'disabled' | 'completed'; message: string };
  jsRenderingSuspected: boolean;
}

export interface ImportJob {
  id: string;
  supplierId: string;
  status: 'queued' | 'running' | 'completed' | 'completed_with_errors' | 'failed';
  log: ImportLogEntry[];
  report: ImportReport | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export type FactStatus = 'proposed' | 'verified' | 'rejected';

export interface Fact {
  id: string;
  chapter: number;
  kind: string;
  label: string;
  value: string;
  quote: string | null;
  sourceId: string | null;
  location: string | null;
  origin: 'official' | 'external' | 'manual';
  status: FactStatus;
  confidence: 'high' | 'medium' | 'low';
  verifiedBy: string | null;
  verifiedAt: string | null;
}

export interface AdminQuestion {
  id: string;
  chapterId: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  factId: string | null;
  origin: 'generated' | 'manual';
  status: 'draft' | 'approved';
  version: number;
}

export interface AdminChapter {
  id: string;
  number: number;
  title: string;
  lead: string;
  body: string;
  highlight: string | null;
  status: 'draft' | 'approved';
  isGeneratedDraft: boolean;
  version: number;
  updatedAt: string;
  question: AdminQuestion | null;
}

export interface ProductCandidate {
  name: string;
  url: string | null;
  sku: string | null;
  imageUrl: string | null;
  score: number;
  location: string;
}

export interface AdminProduct {
  id: string;
  listType: 'bestseller' | 'discovered';
  position: number;
  inputName: string | null;
  inputSku: string | null;
  inputUrl: string | null;
  name: string;
  sku: string | null;
  productUrl: string | null;
  imageUrl: string | null;
  imageSourceUrl: string | null;
  description: string | null;
  material: string | null;
  category: string | null;
  matchStatus: 'pending' | 'matched' | 'ambiguous' | 'not_found' | 'confirmed';
  candidates: ProductCandidate[];
  showInLesson: boolean;
  location: string | null;
}

export interface PublishCheck {
  ready: boolean;
  problems: string[];
}

export interface BestsellerInput {
  name: string;
  sku?: string;
  url?: string;
}
