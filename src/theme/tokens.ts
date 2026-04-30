export const colors = {
  // Primary Orange Brand
  primary:        '#FF6B1A',
  primaryLight:   '#FF8C42',
  primaryAmber:   '#FFB347',
  primaryBg:      '#FFF0D6',
  primaryDark:    '#CC4A00',
  primaryDeep:    '#1A0C02',

  // Status Colors
  danger:         '#EF4444',
  dangerLight:    '#FEE2E2',
  warning:        '#F59E0B',
  warningLight:   '#FEF3C7',
  success:        '#22C55E',

  // Text
  textPrimary:    '#1C1410',
  textSecondary:  '#6B5C4E',
  textMuted:      '#C4B5A5',

  // Backgrounds
  bgPage:         '#FDF6EE',
  bgCard:         '#FFFFFF',
  bgCard2:        '#FFFAF5',

  // Borders & Shadows
  border:         '#EEE0CC',
  border2:        '#F5E8D5',

  // Shell
  shell:          '#0F0A06',
  shellBorder:    'rgba(255,107,26,0.15)',

  // Status dots
  online:         '#22C55E',
  offline:        '#9CA3AF',
};

export const gradients = {
  primary:   ['#CC4A00', '#FF6B1A', '#FF8C42'],
  header:    ['#1A0C02', '#CC4A00', '#FF6B1A', '#FF8C42'],
  wallet:    ['#1A0C02', '#CC4A00', '#FF6B1A', '#FF8C42'],
  button:    ['#FF6B1A', '#F59E0B'],
  avatar:    ['#CC4A00', '#FF8C42'],
};

export const spacing = { xs:4, sm:8, md:16, lg:24, xl:32, xxl:48 };
export const radius  = { sm:10, md:14, lg:20, xl:28, full:999 };
export const shadow  = {
  card: {
    shadowColor: 'rgba(200,100,20,1)',
    shadowOffset: { width:0, height:2 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 3,
  },
  lg: {
    shadowColor: 'rgba(200,80,10,1)',
    shadowOffset: { width:0, height:8 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 8,
  }
};

export const typography = {
  fontDisplay: 'Syne',
  fontBody:    'Nunito',
  fontMono:    'DM Mono',
};

export const skillBadgeColors: Record<string, { bg: string; text: string; border: string }> = {
  Mason:       { bg:'#F5EFEA', text:'#7C5C40', border:'#E8D5BE' },
  Plumber:     { bg:'#EBF5FF', text:'#1A5FA0', border:'#C8DDF7' },
  Electrician: { bg:'#FFFBEB', text:'#B45309', border:'#FDE68A' },
  Carpenter:   { bg:'#FFF5EB', text:'#C05621', border:'#FDD0A2' },
  Cleaner:     { bg:'#EBFFF9', text:'#0D7A5F', border:'#A7F0D8' },
  Painter:     { bg:'#FFF0F7', text:'#9B2C6A', border:'#FDB5D9' },
  Gardener:    { bg:'#F0FBEB', text:'#2D6A1A', border:'#BBF7A3' },
  Driver:      { bg:'#F3F0FF', text:'#5B3DB5', border:'#C4B5FD' },
};

export const categoryIcons: Record<string, string> = {
  Mason: '🧱', Cleaner: '🧹', Electrician: '⚡',
  Carpenter: '🪚', Plumber: '🔧', Painter: '🎨',
  Gardener: '🌿', Driver: '🚗',
};

export const categoryBgColors: Record<string, string> = {
  Mason: '#F5EFEA', Cleaner: '#EBFFF9', Electrician: '#FFFBEB',
  Carpenter: '#FFF5EB', Plumber: '#EBF5FF', Painter: '#FFF0F7',
  Gardener: '#F0FBEB', Driver: '#F3F0FF',
};
