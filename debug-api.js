// Debug script to test Gemini API response format
// Run this in browser console to see exactly what the API returns

async function debugGeminiAPI() {
  const API_KEY = 'AIzaSyAHNXiYA92c_vawhy9b1yX9s3y-DyDYjfw';
  const model = 'gemini-2.5-flash-image-preview';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

  console.log('🔍 Testing Gemini API response format...');
  
  // Test 1: Simple text prompt
  console.log('\n=== Test 1: Text-to-Image ===');
  try {
    const response1 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Create an image of a red car" }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
      })
    });
    
    const result1 = await response1.json();
    console.log('Response 1:', result1);
    
    if (result1.candidates?.[0]?.content?.parts) {
      result1.candidates[0].content.parts.forEach((part, i) => {
        console.log(`Part ${i}:`, part);
        if (part.inline_data || part.inlineData) {
          const imageData = part.inline_data?.data || part.inlineData?.data;
          console.log('  -> Has image data! Length:', imageData?.length);
        }
        if (part.text) console.log('  -> Has text:', part.text.substring(0, 100) + '...');
      });
    }
  } catch (e) {
    console.error('Test 1 failed:', e);
  }

  // Test 2: More explicit prompt
  console.log('\n=== Test 2: Explicit Image Generation ===');
  try {
    const response2 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Generate an image of a sunset over mountains. Please create and return the actual image data." }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
      })
    });
    
    const result2 = await response2.json();
    console.log('Response 2:', result2);
    
    if (result2.candidates?.[0]?.content?.parts) {
      result2.candidates[0].content.parts.forEach((part, i) => {
        console.log(`Part ${i}:`, part);
        if (part.inline_data || part.inlineData) {
          const imageData = part.inline_data?.data || part.inlineData?.data;
          console.log('  -> Has image data! Length:', imageData?.length);
        }
        if (part.text) console.log('  -> Has text:', part.text.substring(0, 100) + '...');
      });
    }
  } catch (e) {
    console.error('Test 2 failed:', e);
  }

  // Test 3: Check if model supports image generation
  console.log('\n=== Test 3: Model Capabilities ===');
  try {
    const response3 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "What can you do? Can you generate images?" }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1000 }
      })
    });
    
    const result3 = await response3.json();
    console.log('Response 3:', result3);
  } catch (e) {
    console.error('Test 3 failed:', e);
  }
}

// Run the debug tests
debugGeminiAPI();
