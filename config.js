// Configuration for Image Remix AI Extension
const CONFIG = {
  // Server URL - change this to your production server URL
  SERVER_URL: 'http://localhost:3000',
  
  // Development mode flag
  DEV_MODE: true,
  
  // API endpoints
  ENDPOINTS: {
    GENERATE_IMAGE: '/api/generate-image',
    HEALTH_CHECK: '/health'
  },
  
  // Request timeouts (in milliseconds)
  TIMEOUTS: {
    API_REQUEST: 30000, // 30 seconds
    IMAGE_PROCESSING: 60000 // 60 seconds
  },
  
  // Rate limiting (client-side)
  RATE_LIMIT: {
    MAX_REQUESTS: 10,
    WINDOW_MS: 60000 // 1 minute
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}
