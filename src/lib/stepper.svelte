<script lang="ts" generics="CT">
  import { fly, type TransitionConfig } from 'svelte/transition';
  import type { Steps, MovePayload, SidestepPayload, StepperEvents } from './types';
  import { tweened } from 'svelte/motion';
  import { cubicInOut } from 'svelte/easing';
  import type { Writable } from 'svelte/store';
  import { BROWSER } from 'esm-env';

  interface Props<CT> {
    steps: Steps;
    context?: (() => Writable<CT>) | undefined;
    padding?: string;
    defaultTransitionDuration?: number;
    disableTransitions?: boolean;
    onconclusion?: () => void;
    onstepChange?: (event: { detail: { newIndex: number; of: number; direction: 'forward' | 'backward' }}) => void;
  }

  let {
    steps,
    context = undefined,
    padding = undefined,
    defaultTransitionDuration = 500,
    disableTransitions = false,
    onconclusion,
    onstepChange
  }: Props<CT> = $props();

  const resolvedContext = context?.();

  // State with runes
  let currentStepIndex = $state(0);
  let direction = $state<'forward' | 'backward'>('forward');
  let internalSteps = $state(steps);
  let transitioning = $state(false);
  
  // Sidestep state
  let sidestepConfig = $state<SidestepPayload | undefined>(undefined);
  let originalSteps = $state<Steps | undefined>(undefined);
  let originalStepIndex = $state<number | undefined>(undefined);

  // Computed values
  const resolvedSteps = $derived(internalSteps.map((someStep) => someStep((i) => i)));
  const currentStep = $derived(resolvedSteps[currentStepIndex]);

  // Height management with tweened store for smooth transitions
  const containerHeight = tweened(0, {
    duration: defaultTransitionDuration,
    easing: cubicInOut
  });

  let stepElement: HTMLDivElement;
  let resizeObserver: ResizeObserver | undefined;
  let firstHeightUpdate = true;

  // Setup ResizeObserver
  if (BROWSER) {
    resizeObserver = new ResizeObserver(() => {
      if (stepElement) {
        const stepHeight = stepElement.offsetHeight;
        containerHeight.set(stepHeight, {
          duration: firstHeightUpdate || !transitioning ? 0 : defaultTransitionDuration,
          easing: cubicInOut
        });
        firstHeightUpdate = false;
      }
    });
  }

  // Watch for step changes and update observer
  $effect(() => {
    currentStep; // Track dependency
    
    // Disconnect previous observer
    resizeObserver?.disconnect();
    
    // Wait for DOM update
    requestAnimationFrame(() => {
      if (stepElement && resizeObserver) {
        resizeObserver.observe(stepElement);
        // Update height immediately
        const stepHeight = stepElement.offsetHeight;
        containerHeight.set(stepHeight, {
          duration: firstHeightUpdate || !transitioning ? 0 : defaultTransitionDuration,
          easing: cubicInOut
        });
      }
    });
  });

  // Event handling - listen on the component's root element
  let containerElement: HTMLDivElement;
  
  $effect(() => {
    if (!containerElement) return;
    
    const handleCustomEvent = (e: Event) => {
      const event = e as CustomEvent;
      
      switch(event.type) {
        case 'goForward':
          handleGoForward(event as CustomEvent<MovePayload>);
          break;
        case 'goBackward':
          handleGoBackward(event as CustomEvent<MovePayload>);
          break;
        case 'sidestep':
          handleSidestep(event as CustomEvent<SidestepPayload>);
          break;
        case 'cancelSidestep':
          handleCancelSidestep();
          break;
      }
    };
    
    containerElement.addEventListener('goForward', handleCustomEvent);
    containerElement.addEventListener('goBackward', handleCustomEvent);
    containerElement.addEventListener('sidestep', handleCustomEvent);
    containerElement.addEventListener('cancelSidestep', handleCustomEvent);
    
    return () => {
      containerElement?.removeEventListener('goForward', handleCustomEvent);
      containerElement?.removeEventListener('goBackward', handleCustomEvent);
      containerElement?.removeEventListener('sidestep', handleCustomEvent);
      containerElement?.removeEventListener('cancelSidestep', handleCustomEvent);
    };
  });

  let transitionEndListener: (() => void) | undefined = undefined;

  async function move(by: number) {
    direction = by > 0 ? 'forward' : 'backward';
    currentStepIndex += by;

    // Wait for the old step to be fully out of view and unmounted
    return new Promise<void>((resolve) => {
      transitionEndListener = resolve;
    });
  }

  function setTransitioning(newVal: boolean) {
    transitioning = newVal;
    if (newVal === false) {
      transitionEndListener?.();
    }
  }

  function getTransitionParams(inOrOut: 'in' | 'out', dir: 'forward' | 'backward') {
    if (disableTransitions) return { x: 0, duration: 0 };

    let x;
    if (inOrOut === 'in') {
      x = dir === 'forward' ? 128 : -128;
    } else {
      x = dir === 'forward' ? -128 : 128;
    }

    return { x, duration: defaultTransitionDuration, easing: cubicInOut };
  }

  function handleGoForward(event: CustomEvent<MovePayload>) {
    const by = event.detail?.by ?? 1;

    if (!resolvedSteps[currentStepIndex + by]) {
      handleConclusion();
      return;
    }

    move(by);
    emitStepChange();
  }

  function handleGoBackward(event: CustomEvent<MovePayload>) {
    const by = event.detail?.by ?? -1;

    if (!resolvedSteps[currentStepIndex + by]) {
      throw new Error('Unable to go back further than the first step');
    }

    move(by);
    emitStepChange();
  }

  async function handleSidestep(event: CustomEvent<SidestepPayload>) {
    if (sidestepConfig) throw new Error("There's already an active sidestep");

    originalStepIndex = currentStepIndex;
    sidestepConfig = event.detail;
    originalSteps = [...steps];

    internalSteps = [steps[currentStepIndex], ...event.detail.steps];
    currentStepIndex = 0;

    emitStepChange();
    await move(1);

    disableTransitions = true;
    internalSteps = [...event.detail.steps];
    currentStepIndex = 0;
    
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    disableTransitions = false;
  }

  function handleCancelSidestep() {
    if (!sidestepConfig) throw new Error("There's currently no active sidestep to cancel");
    handleConclusion();
  }

  async function handleConclusion() {
    if (sidestepConfig && originalStepIndex !== undefined && originalSteps) {
      emitStepChange(originalStepIndex, originalSteps.length - 1, 'backward');

      internalSteps = [originalSteps[originalStepIndex], internalSteps[currentStepIndex]];
      currentStepIndex = 1;

      await new Promise(resolve => requestAnimationFrame(resolve));
      await move(-1);

      disableTransitions = true;
      internalSteps = originalSteps;
      currentStepIndex = originalStepIndex;

      await new Promise(resolve => requestAnimationFrame(resolve));

      sidestepConfig = undefined;
      originalSteps = undefined;
      originalStepIndex = undefined;
      disableTransitions = false;
    } else {
      onconclusion?.();
    }
  }

  function emitStepChange(
    newIndex = currentStepIndex,
    of = resolvedSteps.length - 1,
    dir = direction
  ) {
    onstepChange?.({ detail: { newIndex, of, direction: dir }});
  }

  // Update steps reactively
  $effect(() => {
    internalSteps = steps;
  });

  // Cleanup
  $effect(() => {
    return () => {
      resizeObserver?.disconnect();
    };
  });

  // Window resize listener
  $effect(() => {
    const handleResize = () => {
      if (stepElement) {
        const stepHeight = stepElement.offsetHeight;
        containerHeight.set(stepHeight, { duration: 0 });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });
</script>

<div
  bind:this={containerElement}
  class="stepper-container"
  style:height="{$containerHeight}px"
  style:overflow={transitioning ? 'hidden' : 'visible'}
>
  {#key currentStepIndex}
    {@const Component = currentStep.component}
    <div
      in:fly={getTransitionParams('in', direction)}
      out:fly={getTransitionParams('out', direction)}
      onoutrostart={() => setTransitioning(true)}
      onintroend={() => setTransitioning(false)}
      class="step-container"
    >
      <div class="step" bind:this={stepElement} style:padding>
        <Component
          {currentStepIndex}
          {...currentStep.props}
          context={resolvedContext}
        />
      </div>
    </div>
  {/key}
</div>

<style>
  .stepper-container {
    position: relative;
    will-change: height;
  }

  .step-container {
    position: absolute;
    width: 100%;
    will-change: transform, opacity;
  }

  @media only screen and (max-width: 54rem) {
    .step {
      padding: 1rem;
    }
  }
</style>