// `defineConfig` vem de `vitest/config` (e não de `vite`) porque este arquivo
// também carrega a configuração de testes — só essa versão tipa a chave `test`.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})