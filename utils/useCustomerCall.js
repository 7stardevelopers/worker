import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { api } from '@utils/api';
import { friendlyError } from '@utils/errors';

// Masked calling: Exotel rings the worker's own phone first (caller ID = the
// platform's number), then connects the customer. Neither side sees the
// other's real number.

const POLL_MS = 5000;
const POLL_MAX_MS = 90000;
const OUTCOME_COPY = {
  'NO-ANSWER': ["Customer didn't answer", 'Try again in a minute or send them a message.'],
  BUSY:        ['Customer is busy', "They're on another call. Try again shortly or send a message."],
  FAILED:      ["Call couldn't connect", 'Please try again, or message the customer instead.'],
};

/**
 * `const { calling, callCustomer } = useCustomerCall(bookingId, token)`
 * - ignores repeat taps while a call request is in flight
 * - shows the backend's message on failure (rate limit, job not active, ...)
 * - follows the call for ~90 s and explains a missed / busy / failed outcome
 */
export function useCustomerCall(bookingId, token) {
  const [calling, setCalling] = useState(false);
  const busyRef = useRef(false);
  const pollRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
    if (pollRef.current) clearTimeout(pollRef.current);
  }, []);

  const followCall = useCallback((callId) => {
    const startedAt = Date.now();
    const poll = async () => {
      if (!mountedRef.current) return;
      try {
        const res = await api.get(`/calls/${callId}`, token);
        const copy = OUTCOME_COPY[res?.data?.status];
        if (copy) { Alert.alert(copy[0], copy[1]); return; }
        if (res?.data?.status === 'COMPLETED') return;
      } catch { /* best-effort — never bother the worker about status checks */ }
      if (Date.now() - startedAt < POLL_MAX_MS) pollRef.current = setTimeout(poll, POLL_MS);
    };
    pollRef.current = setTimeout(poll, POLL_MS);
  }, [token]);

  const callCustomer = useCallback(async () => {
    if (busyRef.current || !bookingId) return;
    busyRef.current = true;
    setCalling(true);
    Haptics.selectionAsync().catch(() => {});
    try {
      const res = await api.post('/calls/initiate', { booking_id: bookingId, target: 'customer' }, token);
      Alert.alert(
        'Your phone will ring now',
        "Answer the incoming call and we'll connect you to the customer. Numbers stay private on both sides.",
      );
      if (res?.data?.call_id) followCall(res.data.call_id);
    } catch (e) {
      const msg = friendlyError(e, "Couldn't connect the call. Please try again.");
      if (msg) Alert.alert('Call not placed', msg);
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setCalling(false);
    }
  }, [bookingId, token, followCall]);

  return { calling, callCustomer };
}
