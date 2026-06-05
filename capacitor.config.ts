import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stalight.campus',
  appName: 'Stalight Campus',
  webDir: 'dist',
  server: {
    hostname: 'campus.stalight.in',
    androidScheme: 'https',
    iosScheme: 'https'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: [
        'badge',
        'sound',
        'alert'
      ]
    },
    LocalNotifications: {
      iconColor: '#2563eb'
    },
    CapacitorUpdater: {
      appId: 'com.stalight.campus',
      autoUpdate: true
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    }
  }
};

export default config;
