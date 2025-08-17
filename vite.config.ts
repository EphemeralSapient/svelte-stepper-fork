import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}']
  },
  build: {
    // Optimize chunk size
    chunkSizeWarningLimit: 100,
    rollupOptions: {
      output: {
        // Manual chunks for better code splitting
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // Split vendor chunks
            if (id.includes('svelte')) {
              return 'svelte';
            }
            return 'vendor';
          }
          // Split lib components
          if (id.includes('src/lib')) {
            return 'lib';
          }
        },
        // Use more efficient module format
        generatedCode: {
          constBindings: true,
          objectShorthand: true,
          arrowFunctions: true
        }
      }
    },
    // Enable minification optimizations
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
        passes: 2
      },
      mangle: {
        properties: {
          regex: /^_/
        }
      },
      format: {
        comments: false
      }
    },
    // Better source maps for production
    sourcemap: 'hidden',
    // Optimize CSS
    cssMinify: true,
    // Enable build optimizations
    reportCompressedSize: false,
    // Use efficient module preloading
    modulePreload: {
      polyfill: false
    }
  },
  optimizeDeps: {
    // Pre-bundle dependencies for faster dev startup
    include: ['svelte', 'svelte/store', 'svelte/motion', 'svelte/transition'],
    // Force optimization for better performance
    force: true
  },
  // Performance optimizations
  server: {
    warmup: {
      clientFiles: ['./src/lib/stepper.svelte', './src/lib/types.ts']
    }
  },
});