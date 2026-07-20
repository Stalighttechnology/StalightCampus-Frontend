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
    CapacitorCookies: {
      enabled: true
    },
    CapacitorHttp: {
      enabled: true
    },
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
      autoUpdate: 'always',
      defaultChannel: 'production',
      version: '0.0.0',
      autoSplashscreen: true
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'LIGHT',
      backgroundColor: '#00000000'
    },
    SplashScreen: {
      launchAutoHide: false
    }
  }
};

export default config;
