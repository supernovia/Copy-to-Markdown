// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  if (request.action === "copyAsMarkdown") {
    copySelectionAsMarkdown();
  }
});

function copySelectionAsMarkdown() {
  console.log('copySelectionAsMarkdown called');
  const selection = window.getSelection();
  
  if (selection.rangeCount === 0) {
    console.log('No selection found');
    return;
  }
  
  // Create a temporary container to hold the selected HTML
  const container = document.createElement('div');
  
  // Clone all selected content
  for (let i = 0; i < selection.rangeCount; i++) {
    const range = selection.getRangeAt(i);
    const clonedContent = range.cloneContents();
    container.appendChild(clonedContent);
  }
  
  console.log('HTML content:', container.innerHTML);
  
  // Convert HTML to Markdown
  const markdown = htmlToMarkdown(container);
  console.log('Markdown result:', markdown);
  
  // Copy to clipboard
  copyToClipboard(markdown);
  
  // Optional: Show notification
  showNotification('Copied as Markdown!');
}

function copyToClipboard(text) {
  console.log('Attempting to copy:', text);
  
  // Try the modern clipboard API first
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => {
        console.log('Copied using clipboard API');
      })
      .catch(err => {
        console.error('Clipboard API failed:', err);
        fallbackCopy(text);
      });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  console.log('Using fallback copy method');
  // Create a textarea element to hold the text
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  
  document.body.appendChild(textarea);
  textarea.select();
  const success = document.execCommand('copy');
  console.log('Fallback copy success:', success);
  document.body.removeChild(textarea);
}

function showNotification(message) {
  console.log('Showing notification:', message);
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    z-index: 10000;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    animation: slideIn 0.3s ease-out;
  `;
  
  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 2000);
}