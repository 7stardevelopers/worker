import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '@context/theme';
import { Spacing, Radius } from '@constants/theme';

function SkeletonBase({ width, height, radius = Radius.sm, style }) {
  const { Colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 850, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 850, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: Colors.surfaceRaised, opacity },
        style,
      ]}
    />
  );
}

function Line({ width = '80%', height = 14, radius = Radius.sm, style }) {
  return <SkeletonBase width={width} height={height} radius={radius} style={style} />;
}

function Circle({ size = 40 }) {
  return <SkeletonBase width={size} height={size} radius={size / 2} />;
}

function ServiceCard() {
  const { Colors } = useTheme();
  return (
    <View style={[sk.serviceCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
      <SkeletonBase width="100%" height={120} radius={Radius.lg} />
      <View style={sk.serviceCardBody}>
        <Line width="70%" height={16} />
        <Line width="50%" height={12} style={{ marginTop: 6 }} />
        <View style={sk.serviceCardFooter}>
          <Line width={60} height={12} />
          <Line width={80} height={28} radius={Radius.full} />
        </View>
      </View>
    </View>
  );
}

function BookingCard() {
  const { Colors } = useTheme();
  return (
    <View style={[sk.bookingCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
      <View style={sk.bookingRow}>
        <Line width="50%" height={16} />
        <Line width={70} height={22} radius={Radius.full} />
      </View>
      <View style={[sk.bookingRow, { marginTop: Spacing.sm }]}>
        <SkeletonBase width={32} height={32} radius={16} />
        <Line width="40%" height={13} style={{ marginLeft: Spacing.sm }} />
      </View>
      <Line width="70%" height={12} style={{ marginTop: Spacing.sm }} />
      <View style={[sk.bookingRow, { marginTop: Spacing.md, gap: Spacing.sm }]}>
        <Line width={90} height={34} radius={Radius.lg} />
        <Line width={90} height={34} radius={Radius.lg} />
      </View>
    </View>
  );
}

function CategoryItem() {
  return (
    <View style={sk.catItem}>
      <SkeletonBase width={50} height={50} radius={Radius.lg} />
      <Line width={56} height={10} style={{ marginTop: 6 }} />
    </View>
  );
}

function FeaturedCard() {
  const { Colors } = useTheme();
  return (
    <View style={[sk.featuredCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
      <SkeletonBase width={90} height={90} radius={Radius.lg} />
      <View style={sk.featuredBody}>
        <Line width="60%" height={14} />
        <Line width="40%" height={11} style={{ marginTop: 6 }} />
        <Line width={64} height={26} radius={Radius.full} style={{ marginTop: 10 }} />
      </View>
    </View>
  );
}

const Skeleton        = SkeletonBase;
Skeleton.Line         = Line;
Skeleton.Circle       = Circle;
Skeleton.ServiceCard  = ServiceCard;
Skeleton.BookingCard  = BookingCard;
Skeleton.CategoryItem = CategoryItem;
Skeleton.FeaturedCard = FeaturedCard;

export default Skeleton;

const sk = StyleSheet.create({
  serviceCard:       { borderRadius: Radius.xl, borderWidth: StyleSheet.hairlineWidth, marginHorizontal: Spacing.base, marginBottom: Spacing.md, overflow: 'hidden' },
  serviceCardBody:   { padding: Spacing.md, gap: 4 },
  serviceCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },

  bookingCard:  { borderRadius: Radius.xl, borderWidth: StyleSheet.hairlineWidth, marginHorizontal: Spacing.base, marginBottom: Spacing.md, padding: Spacing.base },
  bookingRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  catItem:      { alignItems: 'center', width: 80, gap: 4 },

  featuredCard: { borderRadius: Radius.xl, borderWidth: StyleSheet.hairlineWidth, width: 180, padding: Spacing.md, gap: Spacing.sm },
  featuredBody: { gap: 4 },
});
