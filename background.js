// background.js (service_worker)

// Import configuration
const CONFIG = {
  SERVER_URL: 'http://localhost:3000',
  ENDPOINTS: {
    GENERATE_IMAGE: '/api/generate-image',
    HEALTH_CHECK: '/health'
  },
  TIMEOUTS: {
    API_REQUEST: 30000
  }
};

// Rate limiting storage
let requestCount = 0;
let lastResetTime = Date.now();

// Check if we can make a request (client-side rate limiting)
function canMakeRequest() {
  const now = Date.now();
  const timeSinceReset = now - lastResetTime;
  
  // Reset counter every minute
  if (timeSinceReset > 60000) {
    requestCount = 0;
    lastResetTime = now;
  }
  
  return requestCount < 10; // Max 10 requests per minute
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'image-selected') {
      const payload = message.payload;
      // Save selected image so popup can read it
      chrome.storage.local.set({ 'selectedImage': payload }, () => {
        // attempt to open the extension popup
        if (chrome.action && chrome.action.openPopup) {
          chrome.action.openPopup().catch(err => {
            // some contexts may not allow openPopup; ignore
            console.warn('openPopup failed', err);
          });
        }
        sendResponse({ ok: true });
      });
      // indicate asynchronous response
      return true;
    }
  });
  
  // Handler to make the secure image generation request
  // popup will send: { type: 'generate-image', prompt, imageDataBase64, conversationHistory }
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'generate-image') {
      // Check rate limiting
      if (!canMakeRequest()) {
        sendResponse({ 
          ok: false, 
          error: 'Rate limit exceeded. Please wait a moment before trying again.' 
        });
        return true;
      }
      
      // Increment request count
      requestCount++;
      
      generateWithGemini(message).then(result => {
        sendResponse({ ok: true, result });
      }).catch(err => {
        console.error('generate error', err);
        sendResponse({ ok: false, error: String(err) });
      });
      return true;
    }
  });
  
  async function generateWithGemini({ prompt, imageDataBase64, conversationHistory = [] }) {
    // Use secure server-side proxy instead of direct API calls
    const url = `${CONFIG.SERVER_URL}${CONFIG.ENDPOINTS.GENERATE_IMAGE}`;

    const body = {
      prompt,
      imageDataBase64,
      conversationHistory
    };

    const headers = {
      'Content-Type': 'application/json'
    };

    try {
      console.log('Sending request to secure server:', { hasImage: !!imageDataBase64, prompt: prompt.substring(0, 50) + '...' });
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUTS.API_REQUEST);
      
      const resp = await fetch(url, { 
        method: 'POST', 
        headers, 
        body: JSON.stringify(body),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({ error: 'Unknown server error' }));
        console.error('Server Error Response:', errorData);
        throw new Error(`Server error ${resp.status}: ${errorData.error || 'Unknown error'}`);
      }
      
      const result = await resp.json();
      console.log('Server response received');
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      return result;
    } catch (error) {
      console.error('Server request failed:', error);
      
      // Handle specific error types
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      } else if (error.message.includes('Failed to fetch')) {
        throw new Error('Unable to connect to server. Please check your connection.');
      }
      
      throw error;
    }
  }
  