// Job grouping and display helpers shared by the Jobs tab and job detail.

export const LIVE_STATUSES = ['EN_ROUTE', 'IN_PROGRESS'];
export const OPEN_STATUSES = ['ACCEPTED', 'EN_ROUTE', 'IN_PROGRESS'];
export const CLOSED_STATUSES = ['COMPLETED', 'CANCELLED', 'REJECTED'];

/** Worker tapped Done; only the customer's confirmation is left. */
export const isAwaitingCustomer = j => j.status === 'IN_PROGRESS' && !!j.providerDoneAt;
/** On the way to / working at a customer's home (a job awaiting confirmation doesn't count). */
export const isLiveJob = j => LIVE_STATUSES.includes(j.status) && !isAwaitingCustomer(j);

const byScheduled =(a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt);
const byRecent = (a, b) => new Date(b.scheduledAt ?? b.createdAt) - new Date(a.scheduledAt ?? a.createdAt);

const isSameDay = (iso, day = new Date()) => !!iso && new Date(iso).toDateString() === day.toDateString();

/**
 * Splits the merged feed (my jobs + broadcast requests) into what the worker
 * needs, most urgent first. `active` is the one job to act on right now.
 */
export function groupJobs(jobs) {
  const open = jobs.filter(j => OPEN_STATUSES.includes(j.status)).sort(byScheduled);
  // A job already underway beats an upcoming acceptance, whatever its time.
  // Jobs waiting only for the customer's confirmation go last.
  const active = open.find(isLiveJob) ?? open.find(j => !isAwaitingCustomer(j)) ?? open[0] ?? null;
  return {
    active,
    requests: jobs.filter(j => j.status === 'PENDING').sort(byScheduled),
    upcoming: open.filter(j => j !== active),
    recent:   jobs.filter(j => CLOSED_STATUSES.includes(j.status)).sort(byRecent).slice(0, 10),
  };
}

export function todaySummary(jobs) {
  const done = jobs.filter(j => j.status === 'COMPLETED' && isSameDay(j.scheduledAt));
  return { count: done.length, earned: done.reduce((s, j) => s + (j.providerEarning ?? 0), 0) };
}

/**
 * Jobs now reach workers only after online payment, so this only fires for
 * older unpaid bookings that were accepted before that rule (or a ₹0 job never does).
 */
export function needsCashCollection(job) {
  return job.paymentStatus !== 'PAID' && Number(job.totalAmount) > 0
    && ['EN_ROUTE', 'IN_PROGRESS', 'COMPLETED'].includes(job.status);
}

export function whenLabel(iso) {
  if (!iso) return 'Immediate';
  const d = new Date(iso);
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  if (isSameDay(iso)) return `Today, ${time}`;
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameDay(iso, tomorrow)) return `Tomorrow, ${time}`;
  return `${d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}, ${time}`;
}
