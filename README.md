# Svelte Stepper - Performance Optimized Fork

This is a performance-optimized fork of [efstajas/svelte-stepper](https://github.com/efstajas/svelte-stepper) for personal project use.

And yes, I've used LLM for this :P 

## Performance Improvements

### Core Optimizations
- **Svelte 5 Runes**: Migrated to Svelte 5's runes (`$state`, `$derived`, `$effect`) for better reactivity performance
- **GPU-Accelerated Animations**: Added hardware acceleration with `translateZ(0)` and `will-change` properties
- **Optimized ResizeObserver**: Efficient height tracking without excessive re-renders
- **Native Event System**: Direct DOM event dispatching instead of framework overhead

### Build & Bundle
- **Vite 7 + Bun**: Faster builds and dependency management
- **Terser Minification**: Aggressive dead code elimination
- **Tree-shaking**: Optimized imports for smaller bundle size

## Original

Full credit to [@efstajas](https://github.com/efstajas) for the original [svelte-stepper](https://github.com/efstajas/svelte-stepper) implementation.

## License

MIT (inherited from original)
