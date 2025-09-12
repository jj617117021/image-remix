// Test script to verify image display works
// Run this in browser console to test the fixed image extraction

async function testImageDisplay() {
  const API_KEY = 'AIzaSyAHNXiYA92c_vawhy9b1yX9s3y-DyDYjfw';
  const model = 'gemini-2.5-flash-image-preview';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

  console.log('🖼️ Testing image display...');
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Create a simple image of a blue circle" }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
      })
    });
    
    const result = await response.json();
    console.log('API Response received');
    
    // Test the fixed parsing logic
    let b64 = null;
    const candidate = result?.candidates?.[0];
    if (candidate && candidate.content && candidate.content.parts) {
      for (let i = 0; i < candidate.content.parts.length; i++) {
        const part = candidate.content.parts[i];
        if ((part.inline_data && part.inline_data.data) || (part.inlineData && part.inlineData.data)) {
          b64 = part.inline_data?.data || part.inlineData?.data;
          console.log('✅ Found image data, length:', b64.length);
          break;
        }
      }
    }
    
    if (b64) {
      // Create and display the image
      const dataUrl = `data:image/jpeg;base64,${b64}`;
      const img = document.createElement('img');
      img.src = dataUrl;
      img.style.maxWidth = '300px';
      img.style.border = '2px solid #ccc';
      img.style.margin = '10px';
      
      const container = document.createElement('div');
      container.innerHTML = '<h3>Generated Image:</h3>';
      container.appendChild(img);
      document.body.appendChild(container);
      
      console.log('✅ Image displayed successfully!');
      return true;
    } else {
      console.log('❌ No image data found');
      return false;
    }
  } catch (e) {
    console.error('❌ Test failed:', e);
    return false;
  }
}

// Run the test
testImageDisplay();

