import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.scriptora.lamiaapp',
  appName: 'Scriptora OS',
  webDir: 'dist',
  backgroundColor: '#FDBA00',
  ios: {
    path: 'ios',
    scheme: 'App',
    backgroundColor: '#FDBA00',
    contentInset: 'never',
    preferredContentMode: 'mobile',
  },
  server: {
    hostname: 'localhost',
    iosScheme: 'capacitor',
    androidScheme: 'https',
  },
};

export default config;
