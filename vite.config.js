import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // Si vous utilisez le plugin Vite (recommandé v4)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Utilise le chemin du repo seulement en production, sinon la racine
  base: process.env.NODE_ENV === 'production' ? '/nom-de-votre-repo/' : '/',
})
```

### 2. Syntaxe Tailwind CSS 4
Puisque vous utilisez **Vite 7** et **Tailwind 4**, la syntaxte `@tailwind base;` est obsolète. 
Vérifiez votre fichier **`src/index.css`**. Il doit impérativement contenir cette ligne en haut à la place des anciennes :

```css
@import "tailwindcss";
