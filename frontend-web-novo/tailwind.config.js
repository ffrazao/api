/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          deep: '#1E3A8A',   // Azul Profundo (Principal / Institucional)
          medium: '#3B82F6', // Azul Médio (Ações / Botões)
          vibrant: '#10B981',// Verde Vibrante (Colaboração / Sucesso)
        },
        surface: {
          light: '#FFFFFF',  // Branco
          offwhite: '#F7F9FC', // Off-White para fundos e cartões
          muted: '#6B7280',  // Cinza Neutro para textos secundários
        }
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}