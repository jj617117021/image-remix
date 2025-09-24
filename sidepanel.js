// sidepanel.js
document.addEventListener('DOMContentLoaded', async () => {
    const chatContainer = document.getElementById('chatContainer');
    const noImageMessage = document.getElementById('noImageMessage');
    const selectedImageContainer = document.getElementById('selectedImageContainer');
    const selectedImage = document.getElementById('selectedImage');
    const clearImageBtn = document.getElementById('clearImageBtn');
    const promptEl = document.getElementById('prompt');
    const generateBtn = document.getElementById('generateBtn');
    const status = document.getElementById('status');

    // Conversation state
    let conversationHistory = [];
    let currentImage = null;

    // Initialize chat
    function initializeChat() {
      // Clear conversation history
      conversationHistory = [];
      
      // Clear chat container except welcome message
      const messages = chatContainer.querySelectorAll('.message:not(.system-message)');
      messages.forEach(msg => msg.remove());
      
      // Show welcome message
      noImageMessage.style.display = 'block';
      selectedImageContainer.style.display = 'none';
      
      // Reset input
      promptEl.value = '';
      promptEl.placeholder = '✨ Describe how to remix this image...';
      generateBtn.textContent = '🚀 Send';
      generateBtn.disabled = true;
      
      // Clear status
      status.textContent = '';
    }

    // Add message to chat
    function addMessage(content, type, imageData = null) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${type}-message`;
      
      const contentDiv = document.createElement('div');
      contentDiv.className = 'message-content';
      
      if (content) {
        const textDiv = document.createElement('div');
        textDiv.textContent = content;
        // Only add message-text class for AI messages with images
        if (type === 'ai' && imageData) {
          textDiv.className = 'message-text';
        }
        contentDiv.appendChild(textDiv);
      }
      
      if (imageData) {
        const img = document.createElement('img');
        img.src = `data:image/jpeg;base64,${imageData}`;
        img.alt = 'Generated image';
        contentDiv.appendChild(img);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = `data:image/jpeg;base64,${imageData}`;
        downloadLink.download = `remix-${Date.now()}.jpg`;
        downloadLink.className = 'download-btn';
        downloadLink.textContent = '💾 Download';
        contentDiv.appendChild(downloadLink);
      }
      
      messageDiv.appendChild(contentDiv);
      chatContainer.appendChild(messageDiv);
      
      // Scroll to bottom with a small delay to ensure DOM is updated
      setTimeout(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }, 10);
    }

    // Add typing indicator
    function addTypingIndicator() {
      const messageDiv = document.createElement('div');
      messageDiv.className = 'message ai-message typing-indicator';
      messageDiv.id = 'typing-indicator';
      
      const contentDiv = document.createElement('div');
      contentDiv.className = 'message-content';
      
      const typingText = document.createElement('div');
      typingText.textContent = '🎨 Creating magic';
      typingText.className = 'typing-text';
      
      const dots = document.createElement('span');
      dots.className = 'typing-dots';
      dots.textContent = '...';
      
      typingText.appendChild(dots);
      contentDiv.appendChild(typingText);
      messageDiv.appendChild(contentDiv);
      chatContainer.appendChild(messageDiv);
      
      // Scroll to bottom
      setTimeout(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }, 10);
    }

    // Remove typing indicator
    function removeTypingIndicator() {
      const typingIndicator = document.getElementById('typing-indicator');
      if (typingIndicator) {
        typingIndicator.remove();
      }
    }

    // Show selected image
    function showSelectedImage(imageData) {
      currentImage = imageData;
      selectedImage.src = imageData.src;
      selectedImage.alt = imageData.alt || 'Selected image';
      selectedImageContainer.style.display = 'block';
      noImageMessage.style.display = 'none';
      
      // Clear conversation history when new image is selected
      conversationHistory = [];
      const messages = chatContainer.querySelectorAll('.message:not(.system-message)');
      messages.forEach(msg => msg.remove());
      
      // Update UI
      promptEl.placeholder = '✨ Tell me how to remix...';
      generateBtn.disabled = false;
      
      // Clear any existing status
      status.textContent = '';
    }

    // Clear selected image
    function clearSelectedImage() {
      currentImage = null;
      selectedImageContainer.style.display = 'none';
      noImageMessage.style.display = 'block';
      promptEl.placeholder = '✨ Describe how to remix this image...';
      generateBtn.disabled = true;
      
      // Clear conversation
      initializeChat();
    }

    // Initialize chat on load
    initializeChat();

    // Load selected image from storage (if any)
    const kv = await chrome.storage.local.get('selectedImage');
    const sel = kv.selectedImage;
    if (sel && sel.src) {
      showSelectedImage(sel);
      
      // Clear storage
      chrome.storage.local.remove('selectedImage');
    }

    // Listen for new image selections from context menu
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'image-selected') {
        const payload = message.payload;
        showSelectedImage(payload);
        sendResponse({ ok: true });
        return true; // Indicates we will send a response asynchronously
      }
    });

    // Handle clear image button
    clearImageBtn.addEventListener('click', clearSelectedImage);

    // Clean up when side panel is closed
    window.addEventListener('beforeunload', () => {
      chrome.storage.local.remove('selectedImage');
    });
  
    // Handle send button click
    generateBtn.addEventListener('click', async () => {
      const prompt = promptEl.value.trim();
      if (!prompt) {
        status.textContent = 'Please write a message.';
        return;
      }

      // Add user message to chat
      addMessage(prompt, 'user');
      
      // Clear input and disable button
      promptEl.value = '';
      generateBtn.disabled = true;
      status.textContent = '';
      
      // Add typing indicator to chat
      addTypingIndicator();

      try {
        // Prepare image data if available
        let imageDataBase64 = null;
        if (currentImage && currentImage.src) {
          imageDataBase64 = await imageUrlToBase64(currentImage.src);
        }

        // Send message to background to generate
        const resp = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ 
            type: 'generate-image', 
            prompt, 
            imageDataBase64,
            conversationHistory: conversationHistory.slice(-5) // Send last 5 messages for context
          }, (r) => resolve(r));
        });

        if (!resp || !resp.ok) {
          removeTypingIndicator();
          addMessage(`Error: ${resp?.error || 'unknown'}`, 'ai');
          generateBtn.disabled = false;
          return;
        }

        // Add to conversation history
        conversationHistory.push({ role: 'user', content: prompt });
        
        const result = resp.result;
        if (result?.b64) {
          // Remove typing indicator and add AI response with image
          removeTypingIndicator();
          addMessage('✨ Here\'s your amazing remixed image! 🎨', 'ai', result.b64);
          
          // Update current image to the generated one for further editing
          currentImage = {
            src: `data:image/jpeg;base64,${result.b64}`,
            alt: 'Generated image'
          };
          
          // Update the selected image display
          showSelectedImage(currentImage);
          
          // Add to conversation history
          conversationHistory.push({ role: 'assistant', content: 'Generated image', image: result.b64 });
        } else if (result?.text) {
          // Remove typing indicator and handle text response
          removeTypingIndicator();
          addMessage(result.text, 'ai');
          conversationHistory.push({ role: 'assistant', content: result.text });
        } else {
          // Remove typing indicator and fallback for unknown response
          removeTypingIndicator();
          addMessage('Sorry, I couldn\'t process that request. Please try again.', 'ai');
        }
      } catch (e) {
        console.error(e);
        removeTypingIndicator();
        addMessage(`Error: ${String(e)}`, 'ai');
      } finally {
        generateBtn.disabled = false;
        promptEl.focus();
      }
    });

    // Handle Enter key in textarea
    promptEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        generateBtn.click();
      }
    });

    // Handle focus and blur for placeholder
    promptEl.addEventListener('focus', () => {
      promptEl.placeholder = '';
    });

    promptEl.addEventListener('blur', () => {
      if (promptEl.value === '') {
        promptEl.placeholder = '✨ Tell me how to remix...';
      }
    });
  
    // utility: convert image URL to base64 (handles cross-origin images by fetching as blob)
    async function imageUrlToBase64(url) {
      // If it's already a data URL
      if (url.startsWith('data:')) {
        return url.split(',')[1];
      }
      const resp = await fetch(url, { mode: 'cors' });
      const blob = await resp.blob();
      return await blobToBase64(blob);
    }
  
    function blobToBase64(blob) {
      return new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onerror = rej;
        reader.onload = () => {
          const dataUrl = reader.result;
          res(dataUrl.split(',')[1]);
        };
        reader.readAsDataURL(blob);
      });
    }
  });
