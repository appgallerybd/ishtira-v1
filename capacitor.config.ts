import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'bd.appgallery.ishtira',
  appName: 'Ishtira',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: { allowMixedContent: false }
};

export default config;
