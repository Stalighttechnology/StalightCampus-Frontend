import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stalight.campus',
  appName: 'Stalight Campus',
  webDir: 'dist',
  server: {
    hostname: 'campus.stalight.in',
    androidScheme: 'https',
    iosScheme: 'https'
  }
};

export default config;
