import type { Preview } from '@storybook/react-vite'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // O componente preenche 100% do contêiner do hospedeiro (§20.10) — o
    // layout centralizado dá a ele uma área com tamanho definido para ocupar.
    layout: 'centered',
  },
}

export default preview
