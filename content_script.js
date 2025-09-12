// content_script.js
(() => {
    const BUTTON_CLASS = 'image-remix-cta-btn';
    const STYLE_ID = 'image-remix-cta-style-v1';
  
    // add styles once
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        .${BUTTON_CLASS} {
          position: absolute;
          z-index: 999999;
          padding: 6px 10px;
          background: rgba(0,0,0,0.75);
          color: white;
          font-size: 12px;
          border-radius: 8px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          transition: transform .08s ease;
        }
        .${BUTTON_CLASS}:active { transform: scale(.98); }
      `;
      document.head.appendChild(style);
    }
  
    let currentButton = null;
    let currentImg = null;
  
    function createButton() {
      const b = document.createElement('button');
      b.className = BUTTON_CLASS;
      b.textContent = 'Remix';
      b.style.display = 'none';
      document.body.appendChild(b);
      return b;
    }
  
    function positionButtonOverImage(btn, img) {
      const rect = img.getBoundingClientRect();
      // place at bottom right corner of image (with small offset)
      btn.style.left = `${window.scrollX + rect.right - 60}px`;
      btn.style.top = `${window.scrollY + rect.bottom - 40}px`;
      btn.style.display = 'block';
    }
  
    function hideButton(btn) {
      if (btn) btn.style.display = 'none';
    }
  
    // lazy create
    if (!currentButton) currentButton = createButton();
  
    // hover handlers
    function onImgEnter(e) {
      currentImg = e.currentTarget;
      positionButtonOverImage(currentButton, currentImg);
      currentButton.style.display = 'block';
      // update positioning on scroll/resize while showing
      window.addEventListener('scroll', onWindowMove);
      window.addEventListener('resize', onWindowMove);
    }
  
    function onImgLeave() {
      // small delay so user can move to button
      setTimeout(() => {
        if (!currentButton.matches(':hover')) {
          hideButton(currentButton);
          window.removeEventListener('scroll', onWindowMove);
          window.removeEventListener('resize', onWindowMove);
          currentImg = null;
        }
      }, 120);
    }
  
    function onWindowMove() {
      if (currentImg) positionButtonOverImage(currentButton, currentImg);
    }
  
    // attach listeners to existing and future images (simple mutation observer)
    function attachToImage(img) {
      // avoid duplicates
      if (img.dataset.remixAttached) return;
      img.dataset.remixAttached = '1';
      img.addEventListener('mouseenter', onImgEnter);
      img.addEventListener('mouseleave', onImgLeave);
    }
  
    function scanAndAttach() {
      document.querySelectorAll('img').forEach(attachToImage);
    }
  
    // listen for clicks on the floating button
    currentButton.addEventListener('click', async (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      if (!currentImg) return;
      // send message to service worker to store selected image and open popup
      const payload = { src: currentImg.src, alt: currentImg.alt || '' };
      chrome.runtime.sendMessage({ type: 'image-selected', payload }, (resp) => {
        // service worker may respond
        // openPopup is invoked by service worker; optional further action here
      });
      hideButton(currentButton);
    });
  
    // initial scan
    scanAndAttach();
  
    // observe DOM for new images (simple)
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes?.forEach(node => {
          if (node.nodeType === 1) {
            if (node.tagName === 'IMG') attachToImage(node);
            else node.querySelectorAll && node.querySelectorAll('img').forEach(attachToImage);
          }
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  })();
  