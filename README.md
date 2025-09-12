# Image Remix AI - Secure Chrome Extension

A secure Chrome extension that allows users to remix images using AI. This version implements proper security measures including server-side API key management, rate limiting, and input validation.

## Security Features

- ✅ **Server-side API key management** - API keys are never exposed to the client
- ✅ **Rate limiting** - Prevents API abuse with both client and server-side limits
- ✅ **Input validation** - Sanitizes and validates all user inputs
- ✅ **Error handling** - Secure error messages that don't expose sensitive information
- ✅ **CORS protection** - Properly configured cross-origin resource sharing
- ✅ **Request timeouts** - Prevents hanging requests
- ✅ **Minimal permissions** - Only requests necessary Chrome extension permissions

## Setup Instructions

### 1. Server Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   PORT=3000
   ALLOWED_ORIGINS=chrome-extension://your-extension-id
   ```

3. **Start the server:**
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

### 2. Chrome Extension Setup

1. **Update server URL** in `config.js` if not using localhost:
   ```javascript
   SERVER_URL: 'https://your-production-domain.com'
   ```

2. **Load the extension in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the extension folder

3. **Update manifest permissions** for production:
   - Replace `http://localhost:3000/*` with your production server URL
   - Update `https://your-production-domain.com/*` with your actual domain

## Production Deployment

### Server Deployment

1. **Deploy to your preferred platform** (Heroku, Vercel, AWS, etc.)
2. **Set environment variables** in your deployment platform
3. **Update CORS settings** to include your production domain
4. **Enable HTTPS** for secure communication

### Extension Updates

1. **Update `config.js`** with your production server URL
2. **Update `manifest.json`** with your production domain
3. **Package and publish** to Chrome Web Store

## API Endpoints

### POST `/api/generate-image`

Generates or edits images using AI.

**Request Body:**
```json
{
  "prompt": "string (max 1000 chars)",
  "imageDataBase64": "string (optional)",
  "conversationHistory": "array (optional, max 5 items)"
}
```

**Response:**
```json
{
  "b64": "base64_image_data"
}
```

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Security Considerations

1. **API Key Management**: Never commit API keys to version control
2. **Rate Limiting**: Monitor usage and adjust limits as needed
3. **Input Validation**: All inputs are validated and sanitized
4. **Error Handling**: Sensitive information is not exposed in error messages
5. **CORS**: Only allow necessary origins
6. **HTTPS**: Always use HTTPS in production

## Development

### Running Locally

1. Start the server: `npm run dev`
2. Load the extension in Chrome
3. Test with images on any website

### Testing

- Test with various image types and sizes
- Test rate limiting by making multiple rapid requests
- Test error handling with invalid inputs
- Test timeout scenarios

## Troubleshooting

### Common Issues

1. **CORS errors**: Ensure your server URL is in the manifest's host_permissions
2. **API key errors**: Verify your Gemini API key is correct and has proper permissions
3. **Rate limiting**: Wait for the rate limit window to reset
4. **Timeout errors**: Check server connectivity and increase timeout if needed

### Debug Mode

Enable debug logging by setting `DEV_MODE: true` in `config.js`.

## License

MIT License - see LICENSE file for details.
