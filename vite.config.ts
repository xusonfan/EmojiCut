import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.API_KEY_IMAGE': JSON.stringify(env.GEMINI_API_KEY_IMAGE),
        'process.env.API_KEY_TEXT': JSON.stringify(env.GEMINI_API_KEY_TEXT),
        'process.env.API_BASE_URL': JSON.stringify(env.GEMINI_API_BASE_URL),
        'process.env.API_BASE_URL_IMAGE': JSON.stringify(env.GEMINI_API_BASE_URL_IMAGE),
        'process.env.API_BASE_URL_TEXT': JSON.stringify(env.GEMINI_API_BASE_URL_TEXT),
        'process.env.MODEL_IMAGE': JSON.stringify(env.GEMINI_MODEL_IMAGE),
        'process.env.MODEL_TEXT': JSON.stringify(env.GEMINI_MODEL_TEXT)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
