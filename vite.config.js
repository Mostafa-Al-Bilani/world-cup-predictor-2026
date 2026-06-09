import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const repoName = env.VITE_GITHUB_REPOSITORY_NAME || 'world-cup-predictor-2026';

  return {
    plugins: [react()],
    base: command === 'build' ? `/${repoName}/` : '/',
  };
});
