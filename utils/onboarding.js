import { router } from 'expo-router';
import { api } from '@utils/api';

export const STEP_ORDER = ['personal', 'services', 'documents', 'bank', 'availability'];
export const REQUIRED_DOCS = ['AADHAAR_FRONT', 'AADHAAR_BACK', 'PAN'];

/** Uploaded documents keyed by doc_type, e.g. { PAN: { status: 'PENDING', ... } }. */
export async function fetchMyDocuments(token) {
  const res = await api.get('/documents/mine', token);
  const docs = Array.isArray(res.data) ? res.data : [];
  return Object.fromEntries(docs.map(d => [d.doc_type, d]));
}

/**
 * First onboarding step the worker still has to finish, or null when the
 * application is complete. A rejected document counts as missing.
 * (Availability isn't stored by the backend yet, so it never blocks.)
 */
export async function getNextOnboardingStep(profile, user, token) {
  if (!user?.name?.trim()) return 'personal';
  if (!profile?.services?.length) return 'services';
  const docs = await fetchMyDocuments(token);
  const docsOk = REQUIRED_DOCS.every(t => docs[t] && docs[t].status !== 'REJECTED');
  if (!docsOk) return 'documents';
  if (!profile?.bank_account_number) return 'bank';
  return null;
}

/** Where a signed-in worker belongs, based on their provider record. */
export async function routeForProvider(profile, user, token) {
  if (profile.status === 'APPROVED') return '/(tabs)';
  if (profile.status === 'SUSPENDED') return '/suspended';
  const step = await getNextOnboardingStep(profile, user, token);
  return step ? `/onboarding/${step}` : '/pending';
}

/**
 * Back button for an onboarding step. A worker resuming onboarding lands
 * directly on a later step with no history, so fall back to the previous step.
 */
export function goBackFrom(step) {
  if (router.canGoBack()) { router.back(); return; }
  const prev = STEP_ORDER[STEP_ORDER.indexOf(step) - 1];
  router.replace(prev ? `/onboarding/${prev}` : '/');
}
