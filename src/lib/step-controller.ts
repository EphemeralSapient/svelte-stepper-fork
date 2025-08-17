import type { StepComponentEvents, Steps } from './types';

export default () => {
  function dispatch<K extends keyof StepComponentEvents>(
    type: K,
    detail?: StepComponentEvents[K]
  ) {
    // In Svelte 5, dispatch DOM events directly
    if (typeof window !== 'undefined') {
      const event = new CustomEvent(type, { 
        detail, 
        bubbles: true,
        composed: true,
        cancelable: true 
      });
      
      // Dispatch from the current active element or body
      setTimeout(() => {
        const target = document.activeElement || document.body;
        target.dispatchEvent(event);
      }, 0);
    }
  }

  function nextStep() {
    dispatch('goForward');
  }

  function previousStep() {
    dispatch('goBackward');
  }

  function move(by: number) {
    dispatch('goForward', { by });
  }

  function sidestep(steps: Steps) {
    dispatch('sidestep', { steps });
  }

  function cancelSidestep() {
    dispatch('cancelSidestep');
  }

  return {
    nextStep,
    previousStep,
    move,
    sidestep,
    cancelSidestep
  };
};