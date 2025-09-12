const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['chrome-extension://*'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Input validation middleware
const validateRequest = (req, res, next) => {
  const { prompt, imageDataBase64, conversationHistory } = req.body;
  
  // Validate prompt
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Valid prompt is required' });
  }
  
  if (prompt.length > 1000) {
    return res.status(400).json({ error: 'Prompt too long (max 1000 characters)' });
  }
  
  // Validate image data if provided
  if (imageDataBase64 && typeof imageDataBase64 !== 'string') {
    return res.status(400).json({ error: 'Invalid image data format' });
  }
  
  // Validate conversation history
  if (conversationHistory && !Array.isArray(conversationHistory)) {
    return res.status(400).json({ error: 'Invalid conversation history format' });
  }
  
  // Sanitize prompt (basic XSS prevention)
  req.body.prompt = prompt.trim().replace(/[<>]/g, '');
  
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Main API endpoint
app.post('/api/generate-image', validateRequest, async (req, res) => {
  try {
    const { prompt, imageDataBase64, conversationHistory = [] } = req.body;
    
    // Get the model
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp" // Updated to latest model
    });
    
    // Build conversation context
    let contents = [];
    
    // Add conversation history for context (limit to last 5 messages)
    const recentHistory = conversationHistory.slice(-5);
    for (const msg of recentHistory) {
      if (msg.role === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }]
        });
      } else if (msg.role === 'assistant') {
        contents.push({
          role: 'model',
          parts: [{ text: msg.content }]
        });
      }
    }
    
    // Add current request
    if (imageDataBase64) {
      // Image editing mode
      contents.push({
        role: 'user',
        parts: [
          { text: `Edit this image according to: ${prompt}. Please generate the edited image.` },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: imageDataBase64
            }
          }
        ]
      });
    } else {
      // Text-to-image generation mode
      contents.push({
        role: 'user',
        parts: [
          { text: `Create an image: ${prompt}. Generate the image now.` }
        ]
      });
    }

    const generationConfig = {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    };

    console.log('Generating image with prompt:', prompt.substring(0, 100) + '...');
    
    const result = await model.generateContent({
      contents: contents,
      generationConfig: generationConfig
    });
    
    const response = await result.response;
    const parts = response.candidates?.[0]?.content?.parts || [];
    
    let b64 = null;
    let textResponse = null;
    
    for (const part of parts) {
      if (part.inline_data?.data || part.inlineData?.data) {
        b64 = part.inline_data?.data || part.inlineData?.data;
        break;
      } else if (part.text) {
        textResponse = part.text;
      }
    }
    
    if (!b64 && textResponse) {
      return res.json({ 
        text: textResponse, 
        error: 'API returned text instead of image' 
      });
    }
    
    if (!b64) {
      return res.status(500).json({ 
        error: 'No image data found in API response' 
      });
    }
    
    res.json({ b64 });
    
  } catch (error) {
    console.error('Generation error:', error);
    
    // Don't expose internal error details
    const errorMessage = error.message?.includes('API') 
      ? 'Image generation service temporarily unavailable'
      : 'An error occurred while generating the image';
    
    res.status(500).json({ error: errorMessage });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
