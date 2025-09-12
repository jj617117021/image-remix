// Test script for Gemini 2.5 Flash Image Preview API
// Run this in the browser console to test the API integration

async function testGeminiAPI() {
  const API_KEY = 'AIzaSyAHNXiYA92c_vawhy9b1yX9s3y-DyDYjfw'; // Replace with your actual API key
  const model = 'gemini-2.5-flash-image-preview';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

  // Test with a simple text prompt (no image input)
  const testPrompt = "A beautiful sunset over a mountain landscape, digital art style";
  
  const body = {
    contents: [
      {
        parts: [
          { text: `Generate an image based on this description: ${testPrompt}` }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.4,
      topK: 32,
      topP: 1,
      maxOutputTokens: 4096,
    }
  };

  try {
    console.log('Testing Gemini API with prompt:', testPrompt);
    console.log('Request body:', body);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('Full API Response:', result);

    // Check if we got an image back
    const candidate = result?.candidates?.[0];
    if (candidate && candidate.content && candidate.content.parts) {
      console.log('Found candidate with', candidate.content.parts.length, 'parts');
      
      for (let i = 0; i < candidate.content.parts.length; i++) {
        const part = candidate.content.parts[i];
        console.log(`Part ${i}:`, part);
        
        if (part.inline_data && part.inline_data.data) {
          console.log('✅ Image data found! Base64 length:', part.inline_data.data.length);
          return part.inline_data.data;
        } else if (part.text) {
          console.log('📝 Text response found:', part.text);
        }
      }
    }

    console.log('❌ No image data found in response');
    console.log('Available models might not support image generation, or the prompt format needs adjustment');
    return null;

  } catch (error) {
    console.error('❌ Test failed:', error);
    return null;
  }
}

// Test with different models
async function testMultipleModels() {
  const models = [
    'gemini-2.5-flash-image-preview',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ];
  
  for (const model of models) {
    console.log(`\n=== Testing model: ${model} ===`);
    try {
      const API_KEY = 'AIzaSyAHNXiYA92c_vawhy9b1yX9s3y-DyDYjfw';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Generate an image of a cat" }] }]
        })
      });
      
      console.log(`${model} - Status: ${response.status}`);
      if (response.ok) {
        const result = await response.json();
        console.log(`${model} - Response structure:`, Object.keys(result));
      }
    } catch (e) {
      console.log(`${model} - Error:`, e.message);
    }
  }
}

// Run the tests
console.log('Starting Gemini API tests...');
testGeminiAPI().then(imageData => {
  if (imageData) {
    console.log('✅ Test successful! You can now use the Chrome extension.');
  } else {
    console.log('❌ Test failed. Trying other models...');
    testMultipleModels();
  }
});
