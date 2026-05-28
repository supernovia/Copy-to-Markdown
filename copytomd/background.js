// Create context menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "copyAsMarkdown",
    title: "Copy as Markdown",
    contexts: ["selection"]
  });
  console.log('Context menu created');
});

// Function that will be injected and run
function copySelectionDirectly() {
  console.log('Direct copy function running');
  
  const selection = window.getSelection();
  if (selection.rangeCount === 0) {
    console.log('No selection');
    return;
  }
  
  const container = document.createElement('div');
  for (let i = 0; i < selection.rangeCount; i++) {
    const range = selection.getRangeAt(i);
    const clonedContent = range.cloneContents();
    container.appendChild(clonedContent);
  }
  
  // The htmlToMarkdown function should be available from the injected script
  const markdown = htmlToMarkdown(container);
  console.log('Markdown:', markdown);
  
  // Copy to clipboard
  navigator.clipboard.writeText(markdown)
    .then(() => {
      console.log('Copied!');
      // Show notification
      const notification = document.createElement('div');
      notification.textContent = 'Copied as Markdown!';
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        z-index: 999999;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 2000);
    })
    .catch(err => {
      console.error('Copy failed:', err);
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = markdown;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      console.log('Used fallback copy');
    });
}

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('Context menu clicked:', info.menuItemId);
  if (info.menuItemId === "copyAsMarkdown") {
    // Inject and run the script directly
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['html-to-markdown.js']
    }, () => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: copySelectionDirectly
      });
    });
  }
});