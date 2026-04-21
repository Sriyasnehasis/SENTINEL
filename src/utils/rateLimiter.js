// Gemini Rate Limiter Utility
// Ensures we stay under Gemini 2.0 Flash free tier limit: 15 RPM (1 call per 4 seconds)
// Using 12 second debounce for safety margin

let lastCall = 0;
const DEBOUNCE_MS = 12000;
const queue = [];
let processing = false;

/**
 * Execute a Gemini API call with rate limiting
 * @param {Function} callFn - Async function that calls Gemini API
 * @returns {Promise} - Resolves with Gemini response
 */
export async function rateLimitedGeminiCall(callFn) {
  return new Promise((resolve, reject) => {
    queue.push({ callFn, resolve, reject });
    if (!processing) processQueue();
  });
}

async function processQueue() {
  processing = true;
  
  while (queue.length > 0) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;
    const waitTime = Math.max(0, DEBOUNCE_MS - timeSinceLastCall);
    
    if (waitTime > 0) {
      await new Promise(r => setTimeout(r, waitTime));
    }
    
    const { callFn, resolve, reject } = queue.shift();
    
    try {
      const result = await callFn();
      resolve(result);
    } catch (error) {
      reject(error);
    }
    
    lastCall = Date.now();
  }
  
  processing = false;
}

/**
 * Get current queue length (for debugging/monitoring)
 */
export function getQueueLength() {
  return queue.length;
}

/**
 * Clear the queue (useful for error recovery)
 */
export function clearQueue() {
  queue.length = 0;
  processing = false;
}
