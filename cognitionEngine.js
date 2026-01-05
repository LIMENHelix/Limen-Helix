/**
 * LIMEN Helix Cognition Engine
 *
 * Collects interaction-only signals to infer a cognitive signature.
 * No cookies, no localStorage, no fingerprinting - session RAM only.
 *
 * Emits: { signature, archetype, phase }
 * Archetypes: Analyst, Engineer, Philosopher, Artist
 * Phase: 0→1 over 3-7s after first interaction
 */

(function(global) {
  'use strict';

  /**
   * Start the cognition engine
   * @param {Object} options
   * @param {number} options.phaseSeconds - Duration of phase ramp (default: 5, range: 3-7)
   * @returns {{ subscribe: Function, stop: Function }}
   */
  function startCognitionEngine(options) {
    const opts = options || {};
    const phaseSeconds = Math.max(3, Math.min(7, opts.phaseSeconds || 5));

    // === State ===
    let firstInteractionTime = null;
    let lastUpdateTime = null;
    let phase = 0;
    let archetype = 'Analyst';
    let stopped = false;

    // Subscribers
    const subscribers = [];

    // === Signal Collectors ===

    // Scroll signals
    const scrollSamples = [];
    let lastScrollY = window.scrollY;
    let lastScrollTime = Date.now();

    // Mouse signals
    const mouseSamples = [];
    let lastMouseX = 0;
    let lastMouseY = 0;
    let lastMouseTime = 0;

    // Click hesitation
    const hesitationSamples = [];
    let lastActionTime = 0;

    // Dwell by page thirds
    const dwellTimes = { top: 0, middle: 0, bottom: 0 };
    let lastDwellCheck = Date.now();

    // Interaction entropy (action type diversity)
    const actionCounts = { scroll: 0, click: 0, mousemove: 0, keypress: 0 };

    // === Signal Collection Functions ===

    function recordFirstInteraction() {
      if (!firstInteractionTime) {
        firstInteractionTime = Date.now();
        lastUpdateTime = firstInteractionTime;
      }
    }

    function onScroll() {
      if (stopped) return;
      recordFirstInteraction();
      actionCounts.scroll++;

      const now = Date.now();
      const deltaY = Math.abs(window.scrollY - lastScrollY);
      const deltaTime = now - lastScrollTime;

      if (deltaTime > 0) {
        const velocity = deltaY / deltaTime; // px/ms
        scrollSamples.push(velocity);
        if (scrollSamples.length > 50) scrollSamples.shift();
      }

      lastScrollY = window.scrollY;
      lastScrollTime = now;
      lastActionTime = now;
    }

    function onMouseMove(e) {
      if (stopped) return;
      recordFirstInteraction();
      actionCounts.mousemove++;

      const now = Date.now();
      const deltaX = Math.abs(e.clientX - lastMouseX);
      const deltaY = Math.abs(e.clientY - lastMouseY);
      const deltaTime = now - lastMouseTime;

      if (deltaTime > 0 && lastMouseTime > 0) {
        // Jitter = velocity variance (how erratic is movement)
        const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / deltaTime;
        mouseSamples.push({ velocity, deltaTime });
        if (mouseSamples.length > 100) mouseSamples.shift();
      }

      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      lastMouseTime = now;
    }

    function onClick() {
      if (stopped) return;
      recordFirstInteraction();
      actionCounts.click++;

      const now = Date.now();
      if (lastActionTime > 0) {
        const hesitation = now - lastActionTime;
        hesitationSamples.push(hesitation);
        if (hesitationSamples.length > 20) hesitationSamples.shift();
      }
      lastActionTime = now;
    }

    function onKeyPress() {
      if (stopped) return;
      recordFirstInteraction();
      actionCounts.keypress++;
      lastActionTime = Date.now();
    }

    // === Feature Extraction ===

    function computeScrollFeatures() {
      if (scrollSamples.length < 2) return { speed: 0, variability: 0 };

      const mean = scrollSamples.reduce((a, b) => a + b, 0) / scrollSamples.length;
      const variance = scrollSamples.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / scrollSamples.length;

      return {
        speed: Math.min(1, mean * 100), // Normalize to 0-1
        variability: Math.min(1, Math.sqrt(variance) * 50)
      };
    }

    function computeMouseFeatures() {
      if (mouseSamples.length < 5) return { jitter: 0 };

      const velocities = mouseSamples.map(s => s.velocity);
      const mean = velocities.reduce((a, b) => a + b, 0) / velocities.length;
      const variance = velocities.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / velocities.length;

      return {
        jitter: Math.min(1, Math.sqrt(variance) * 20) // Normalized jitter
      };
    }

    function computeHesitationFeature() {
      if (hesitationSamples.length < 2) return 0;

      const mean = hesitationSamples.reduce((a, b) => a + b, 0) / hesitationSamples.length;
      // Higher hesitation = more deliberate (Analyst/Philosopher)
      // Lower hesitation = more reactive (Engineer/Artist)
      return Math.min(1, mean / 5000); // Normalize: 5s = max hesitation
    }

    function computeTimeToFirstAction() {
      if (!firstInteractionTime) return 1; // Max if no interaction yet
      // Normalize: 0 = immediate, 1 = 10s+
      return Math.min(1, (firstInteractionTime - startTime) / 10000);
    }

    function updateDwellTimes() {
      const now = Date.now();
      const elapsed = now - lastDwellCheck;
      lastDwellCheck = now;

      const scrollPos = window.scrollY;
      const viewportHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      const scrollRatio = scrollPos / Math.max(1, docHeight - viewportHeight);

      if (scrollRatio < 0.33) {
        dwellTimes.top += elapsed;
      } else if (scrollRatio < 0.66) {
        dwellTimes.middle += elapsed;
      } else {
        dwellTimes.bottom += elapsed;
      }
    }

    function computeDwellFeature() {
      const total = dwellTimes.top + dwellTimes.middle + dwellTimes.bottom;
      if (total < 100) return { balance: 0.5 };

      // Balance: how evenly distributed is attention?
      // High balance = explores all (Engineer/Analyst)
      // Low balance = focuses (Philosopher/Artist)
      const ratios = [dwellTimes.top / total, dwellTimes.middle / total, dwellTimes.bottom / total];
      const entropy = -ratios.filter(r => r > 0).reduce((sum, r) => sum + r * Math.log(r), 0);
      const maxEntropy = Math.log(3);

      return { balance: entropy / maxEntropy };
    }

    function computeInteractionEntropy() {
      const total = Object.values(actionCounts).reduce((a, b) => a + b, 0);
      if (total < 5) return 0.5;

      const ratios = Object.values(actionCounts).map(c => c / total).filter(r => r > 0);
      const entropy = -ratios.reduce((sum, r) => sum + r * Math.log(r), 0);
      const maxEntropy = Math.log(4); // 4 action types

      return entropy / maxEntropy;
    }

    // === Archetype Classification ===

    function computeSignatureVector() {
      const scroll = computeScrollFeatures();
      const mouse = computeMouseFeatures();
      const hesitation = computeHesitationFeature();
      const dwell = computeDwellFeature();
      const entropy = computeInteractionEntropy();
      const ttfa = computeTimeToFirstAction();

      return {
        scrollSpeed: scroll.speed,
        scrollVariability: scroll.variability,
        mouseJitter: mouse.jitter,
        hesitation: hesitation,
        dwellBalance: dwell.balance,
        interactionEntropy: entropy,
        timeToFirstAction: ttfa
      };
    }

    function classifyArchetype(sig) {
      // Weighted scoring for each archetype
      // Based on cognitive/behavioral patterns described in CLAUDE.md

      const scores = {
        // Analyst: methodical, balanced dwell, moderate pace, low jitter
        Analyst: (
          (1 - sig.scrollSpeed) * 0.2 +
          sig.dwellBalance * 0.3 +
          sig.hesitation * 0.2 +
          (1 - sig.mouseJitter) * 0.2 +
          sig.interactionEntropy * 0.1
        ),

        // Engineer: fast scroll, high entropy, explores broadly, less hesitation
        Engineer: (
          sig.scrollSpeed * 0.25 +
          sig.scrollVariability * 0.15 +
          sig.interactionEntropy * 0.25 +
          sig.dwellBalance * 0.2 +
          (1 - sig.hesitation) * 0.15
        ),

        // Philosopher: slow, deliberate, high hesitation, focused dwell
        Philosopher: (
          (1 - sig.scrollSpeed) * 0.25 +
          sig.hesitation * 0.3 +
          (1 - sig.dwellBalance) * 0.2 +
          sig.timeToFirstAction * 0.15 +
          (1 - sig.mouseJitter) * 0.1
        ),

        // Artist: variable scroll, high jitter, expressive movement, focused
        Artist: (
          sig.scrollVariability * 0.25 +
          sig.mouseJitter * 0.25 +
          (1 - sig.dwellBalance) * 0.2 +
          (1 - sig.interactionEntropy) * 0.15 +
          (1 - sig.hesitation) * 0.15
        )
      };

      // Find highest scoring archetype
      let maxScore = -1;
      let result = 'Analyst';
      for (const [arch, score] of Object.entries(scores)) {
        if (score > maxScore) {
          maxScore = score;
          result = arch;
        }
      }

      return result;
    }

    // === Phase Calculation ===

    function computePhase() {
      if (!firstInteractionTime) return 0;

      const elapsed = Date.now() - firstInteractionTime;
      const phaseDuration = phaseSeconds * 1000;

      // Ease-out curve for smoother transition
      const linear = Math.min(1, elapsed / phaseDuration);
      return 1 - Math.pow(1 - linear, 2); // Quadratic ease-out
    }

    // === Update Loop ===

    function emit() {
      const signature = computeSignatureVector();
      const newArchetype = classifyArchetype(signature);
      const newPhase = computePhase();

      // Only update archetype after some data is collected
      if (Object.values(actionCounts).reduce((a, b) => a + b, 0) > 3) {
        archetype = newArchetype;
      }
      phase = newPhase;

      const state = {
        signature: signature,
        archetype: archetype,
        phase: phase
      };

      subscribers.forEach(fn => {
        try {
          fn(state);
        } catch (e) {
          console.error('[CognitionEngine] Subscriber error:', e);
        }
      });
    }

    // === Lifecycle ===

    const startTime = Date.now();
    let intervalId = null;

    function start() {
      // Attach event listeners
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('mousemove', onMouseMove, { passive: true });
      window.addEventListener('click', onClick, { passive: true });
      window.addEventListener('keypress', onKeyPress, { passive: true });

      // Touch support
      window.addEventListener('touchstart', onClick, { passive: true });
      window.addEventListener('touchmove', function(e) {
        if (e.touches.length > 0) {
          onMouseMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
        }
      }, { passive: true });

      // Update loop: emit state every 200ms
      intervalId = setInterval(function() {
        if (stopped) return;
        updateDwellTimes();
        emit();
      }, 200);

      // Initial emit
      emit();
    }

    function stop() {
      stopped = true;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('click', onClick);
      window.removeEventListener('keypress', onKeyPress);
    }

    function subscribe(fn) {
      if (typeof fn === 'function') {
        subscribers.push(fn);
      }
    }

    // Start the engine
    start();

    // Return API
    return {
      subscribe: subscribe,
      stop: stop
    };
  }

  // Export to global scope
  global.startCognitionEngine = startCognitionEngine;

})(typeof window !== 'undefined' ? window : this);
