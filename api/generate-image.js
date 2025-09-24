// Vercel serverless function for image generation
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Input validation
function validateRequest(body) {
  const { prompt, imageDataBase64, conversationHistory } = body;
  
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw new Error('Valid prompt is required');
  }
  
  if (prompt.length > 1000) {
    throw new Error('Prompt too long (max 1000 characters)');
  }
  
  if (imageDataBase64 && typeof imageDataBase64 !== 'string') {
    throw new Error('Invalid image data format');
  }
  
  if (conversationHistory && !Array.isArray(conversationHistory)) {
    throw new Error('Invalid conversation history format');
  }
  
  return {
    prompt: prompt.trim().replace(/[<>]/g, ''),
    imageDataBase64,
    conversationHistory: conversationHistory || []
  };
}

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Validate request
    const { prompt, imageDataBase64, conversationHistory } = validateRequest(req.body);
    
    // Get the model - use the correct image generation model
    const model = genAI.getGenerativeModel({ 
      model: "models/gemini-2.5-flash-image-preview"
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
          { text: `Please create a digital artwork based on: ${prompt}. Generate an image that represents this concept.` }
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
    
    console.log('Response parts count:', parts.length);
    console.log('Response structure:', JSON.stringify(parts, null, 2));
    
    let b64 = null;
    let textResponse = null;
    
    for (const part of parts) {
      console.log('Processing part:', Object.keys(part));
      if (part.inline_data?.data || part.inlineData?.data) {
        b64 = part.inline_data?.data || part.inlineData?.data;
        console.log('Found image data, length:', b64 ? b64.length : 0);
        break;
      } else if (part.text) {
        textResponse = part.text;
        console.log('Found text response:', textResponse.substring(0, 100));
      }
    }
    
    if (!b64 && textResponse) {
      console.log('No image data found, returning text response');
      return res.json({ 
        text: textResponse, 
        error: 'API returned text instead of image' 
      });
    }
    
    if (!b64) {
      console.log('No image data found in any part');
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
};
