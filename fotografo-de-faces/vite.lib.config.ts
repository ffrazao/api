/**
 * Build de distribuição em Vite Lib Mode — F11.
 *
 * Fica separado de `vite.config.ts` (que serve a aplicação de demonstração e
 * a configuração do Vitest) para que `npm run dev`, os testes e o Storybook
 * continuem funcionando exatamente como antes.
 */
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'

export default defineConfig({
  // `public/` pertence à aplicação de demonstração (favicon, ícones) e aos
  // pesos da face-api.js — nada disso deve ser copiado para dentro do bundle
  // publicado. Os pesos são distribuídos à parte, via `files` no package.json.
  publicDir: false,
  plugins: [
    react(),
    dts({
      tsconfigPath: './tsconfig.lib.json',
      // Achata os .d.ts num único `dist/index.d.ts`, para o consumidor não
      // depender da estrutura interna de pastas do pacote. Atenção: no
      // vite-plugin-dts v5 (que passou a ser um wrapper de `unplugin-dts`) a
      // opção chama-se `bundleTypes` — o antigo `rollupTypes` é ignorado em
      // silêncio, deixando os .d.ts espalhados sem nenhum aviso.
      bundleTypes: true,
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      name: 'FotografoDeFaces',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'fotografo-de-faces.js' : 'fotografo-de-faces.cjs'),
    },
    rollupOptions: {
      /**
       * §20/§01 — dependências de runtime do hospedeiro NUNCA entram no
       * bundle: React, ReactDOM e styled-components são peerDependencies.
       * `face-api.js` (e o @tensorflow/tfjs-core que ela carrega) fica
       * deliberadamente de fora desta lista: é motor interno do componente e
       * vai empacotado, para o consumidor não precisar instalá-los à parte.
       */
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom/client',
        'styled-components',
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'styled-components': 'styled',
        },
      },
    },
    sourcemap: true,
    // O bundle inclui a face-api.js + tfjs-core por decisão de encapsulamento
    // (§01/§20), então o aviso padrão de 500kB não agrega nada aqui.
    chunkSizeWarningLimit: 4000,
    emptyOutDir: true,
  },
})
