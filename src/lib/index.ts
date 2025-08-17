// Main exports
export { default as Stepper } from './stepper.svelte';
export { type SidestepPayload, makeStep } from './types';
export { default as createStepController } from './step-controller';

// Re-export types for convenience
export type { Steps, Step, StepperEvents, MovePayload } from './types';