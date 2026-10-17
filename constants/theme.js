const statusMap = {
  PENDING:     '#F59E0B',
  ACCEPTED:    '#3B82F6',
  EN_ROUTE:    '#8B5CF6',
  IN_PROGRESS: '#06B6D4',
  COMPLETED:   '#10B981',
  CANCELLED:   '#EF4444',
  REJECTED:    '#EF4444',
};

export const DarkColors = {
  primary:           '#6366F1',
  primaryDark:       '#4F46E5',
  primaryLight:      '#312e81',
  secondary:         '#8B5CF6',
  accent:            '#F59E0B',
  background:        '#000000',
  surface:           '#1C1C1E',
  surfaceRaised:     '#2C2C2E',
  foreground:        '#FFFFFF',
  mutedForeground:   'rgba(235,235,245,0.6)',
  subtleForeground:  'rgba(235,235,245,0.3)',
  border:            'rgba(84,84,88,0.65)',
  borderLight:       'rgba(84,84,88,0.4)',
  inputBg:           '#1C1C1E',
  success:           '#10B981',
  successBg:         '#0D2B22',
  warning:           '#F59E0B',
  warningBg:         '#2B1F08',
  error:             '#EF4444',
  errorBg:           '#2B0E0E',
  info:              '#3B82F6',
  infoBg:            '#0E1A2B',
  status:            statusMap,
  glassBg:           'rgba(28,28,30,0.72)',
  glassBorder:       'rgba(255,255,255,0.12)',
  gradientPrimary:   ['#6366F1', '#8B5CF6'],
  gradientAccent:    ['#F59E0B', '#FBBF24'],
  tabBarBg:          'rgba(18,18,20,0.96)',
  headerBg:          'rgba(0,0,0,0.85)',
};

export const LightColors = {
  primary:           '#4F46E5',
  primaryDark:       '#4338CA',
  primaryLight:      '#EEF2FF',
  secondary:         '#7C3AED',
  accent:            '#D97706',
  background:        '#F2F2F7',
  surface:           '#FFFFFF',
  surfaceRaised:     '#F2F2F7',
  foreground:        '#000000',
  mutedForeground:   'rgba(60,60,67,0.6)',
  subtleForeground:  'rgba(60,60,67,0.3)',
  border:            'rgba(60,60,67,0.18)',
  borderLight:       'rgba(60,60,67,0.1)',
  inputBg:           '#FFFFFF',
  success:           '#059669',
  successBg:         '#ECFDF5',
  warning:           '#D97706',
  warningBg:         '#FFFBEB',
  error:             '#DC2626',
  errorBg:           '#FEF2F2',
  info:              '#2563EB',
  infoBg:            '#EFF6FF',
  status:            statusMap,
  glassBg:           'rgba(255,255,255,0.72)',
  glassBorder:       'rgba(0,0,0,0.08)',
  gradientPrimary:   ['#4F46E5', '#7C3AED'],
  gradientAccent:    ['#D97706', '#F59E0B'],
  tabBarBg:          'rgba(248,248,252,0.96)',
  headerBg:          'rgba(242,242,247,0.85)',
};

export function getColors(isDark) {
  return isDark ? DarkColors : LightColors;
}

export const Colors = DarkColors;

export const Spacing = {
  xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xl2: 32, xl3: 40, xl4: 48,
};

export const Radius = {
  sm: 8, md: 12, lg: 16, xl: 20, xl2: 28, full: 9999,
};

export const FontSize = {
  display: 32, h1: 24, h2: 20, h3: 17, body: 15, sm: 13, xs: 11,
};

export const FontWeight = {
  regular:  '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
};

export const Shadow = {
  sm:   { shadowColor: '#000', shadowOffset: { width: 0, height: 2  }, shadowOpacity: 0.12, shadowRadius: 4,  elevation: 3  },
  md:   { shadowColor: '#000', shadowOffset: { width: 0, height: 4  }, shadowOpacity: 0.20, shadowRadius: 12, elevation: 6  },
  lg:   { shadowColor: '#000', shadowOffset: { width: 0, height: 8  }, shadowOpacity: 0.30, shadowRadius: 24, elevation: 12 },
  glow: { shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
};
