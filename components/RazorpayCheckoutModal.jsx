import React, { useCallback, useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/theme';
import { APP_NAME } from '@constants/brand';
import { Spacing, Radius, FontSize, FontWeight } from '@constants/theme';

const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID;

/**
 * Razorpay's hosted Checkout in a WebView (same approach as the Customer app —
 * the native SDK doesn't run in Expo Go / the New Architecture). Used to pay dues.
 *
 * Props:
 *   visible   {boolean}
 *   order     {{ razorpay_order_id, amount, currency }} — amount in PAISE, passed to Razorpay as-is
 *   summary   {{ title?, description? }} — display only
 *   prefill   {{ name, contact }}
 *   onSuccess {(result: { razorpay_order_id, razorpay_payment_id, razorpay_signature }) => void}
 *   onDismiss {() => void} — cancel, failure or back
 */
export default function RazorpayCheckoutModal({ visible, order, summary, prefill, onSuccess, onDismiss }) {
  const { Colors } = useTheme();
  const insets = useSafeAreaInsets();

  const html = useMemo(() => {
    if (!order) return '';
    const options = {
      key: RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      order_id: order.razorpay_order_id,
      name: APP_NAME,
      description: summary?.description ?? 'Payment',
      prefill: { name: prefill?.name ?? '', contact: prefill?.contact ?? '' },
      theme: { color: Colors.primary },
    };
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <style>html,body{margin:0;padding:0;background:#00000000;}</style>
        </head>
        <body>
          <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
          <script>
            var options = ${JSON.stringify(options)};
            options.handler = function (response) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                status: 'success',
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }));
            };
            options.modal = {
              ondismiss: function () {
                window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'dismissed' }));
              }
            };
            var rzp = new Razorpay(options);
            rzp.on('payment.failed', function (response) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'failed', error: response.error }));
            });
            rzp.open();
          </script>
        </body>
      </html>
    `;
  }, [order, prefill, summary?.description, Colors.primary]);

  const handleMessage = useCallback((event) => {
    let data;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch {
      onDismiss?.();
      return;
    }
    if (data.status === 'success') onSuccess?.(data);
    else onDismiss?.();
  }, [onSuccess, onDismiss]);

  // UPI apps open via upi:// / intent:// links a WebView can't load — hand them to the OS.
  const handleShouldStartLoad = useCallback((request) => {
    if (request.url.startsWith('http://') || request.url.startsWith('https://') || request.url.startsWith('about:')) {
      return true;
    }
    Linking.openURL(request.url).catch(() => {});
    return false;
  }, []);

  if (!visible || !order) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDismiss}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm, backgroundColor: Colors.background, borderBottomColor: Colors.border }]}>
        <View style={[styles.lock, { backgroundColor: Colors.success + '1A' }]}>
          <Ionicons name="lock-closed" size={15} color={Colors.success} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: Colors.foreground }]}>Secure payment</Text>
          <Text style={[styles.sub, { color: Colors.mutedForeground }]} numberOfLines={1}>
            {summary?.title ? `${summary.title} · ` : ''}Powered by Razorpay
          </Text>
        </View>
        <TouchableOpacity
          onPress={onDismiss}
          accessibilityLabel="Cancel payment"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[styles.closeBtn, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
        >
          <Ionicons name="close" size={20} color={Colors.foreground} />
        </TouchableOpacity>
      </View>
      <WebView
        source={{ html }}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  header:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.base, paddingBottom: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  headerText: { flex: 1 },
  lock:       { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title:      { fontSize: FontSize.body, fontWeight: FontWeight.bold },
  sub:        { fontSize: 12, marginTop: 1 },
  closeBtn:   { width: 36, height: 36, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  web:        { flex: 1 },
  loading:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
