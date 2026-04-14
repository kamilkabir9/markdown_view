import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    chunkSizeWarningLimit: 3200,
    rollupOptions: {
      onwarn(warning, warn) {
        if (
          warning.code === 'MODULE_LEVEL_DIRECTIVE'
          && typeof warning.message === 'string'
          && warning.message.includes('"use client"')
        ) {
          return;
        }

        warn(warning);
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (
            id.includes('/@base-ui/')
            || id.includes('/lucide-react/')
            || id.includes('/sonner/')
            || id.includes('/class-variance-authority/')
            || id.includes('/clsx/')
            || id.includes('/tailwind-merge/')
          ) {
            return 'ui-vendor';
          }

          if (
            id.includes('/mermaid')
            || id.includes('/katex')
            || id.includes('/cytoscape')
            || id.includes('/d3-')
            || id.includes('/dagre')
            || id.includes('/khroma')
            || id.includes('/elkjs/')
            || id.includes('/internmap/')
            || id.includes('/delaunator/')
            || id.includes('/robust-predicates/')
          ) {
            return 'mermaid';
          }

          if (id.includes('/@uiw/react-codemirror')) {
            return 'editor-ui';
          }

          if (
            id.includes('/@codemirror/')
            || id.includes('/@lezer/')
          ) {
            return 'editor';
          }

          if (
            id.includes('/react-markdown')
            || id.includes('/remark-')
            || id.includes('/rehype-')
            || id.includes('/unified')
            || id.includes('/unist-')
            || id.includes('/mdast-')
            || id.includes('/github-slugger')
          ) {
            return 'markdown';
          }
          
          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, 'app'),
    },
  },
});
