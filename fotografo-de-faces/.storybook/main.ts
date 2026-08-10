import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  // `public/` já contém os pesos da face-api.js (ver public/models/README.md),
  // então o Storybook os serve em /models — o mesmo caminho que o componente
  // usa por padrão, sem nenhuma requisição externa (§18.12).
  staticDirs: ['../public'],
}

export default config
