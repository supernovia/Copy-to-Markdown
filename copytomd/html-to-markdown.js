function htmlToMarkdown(element) {
  // Process the element recursively
  return processNode(element).trim();
}

function processNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    // Escape markdown special characters in text, but preserve emoji colons
    return escapeMarkdown(node.textContent);
  }
  
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }
  
  let result = '';
  const tagName = node.tagName.toLowerCase();
  
  switch (tagName) {
    // Headers
    case 'h1':
      result = '# ' + getTextContent(node) + '\n\n';
      break;
    case 'h2':
      result = '## ' + getTextContent(node) + '\n\n';
      break;
    case 'h3':
      result = '### ' + getTextContent(node) + '\n\n';
      break;
    case 'h4':
      result = '#### ' + getTextContent(node) + '\n\n';
      break;
    case 'h5':
      result = '##### ' + getTextContent(node) + '\n\n';
      break;
    case 'h6':
      result = '###### ' + getTextContent(node) + '\n\n';
      break;
      
    // Paragraphs
    case 'p':
      result = processChildren(node) + '\n\n';
      break;
      
    // Line breaks
    case 'br':
      result = '  \n';
      break;
      
    // Bold
    case 'strong':
    case 'b':
      result = '**' + processChildren(node) + '**';
      break;
      
    // Italic
    case 'em':
    case 'i':
      result = '*' + processChildren(node) + '*';
      break;
      
    // Code
    case 'code':
      if (node.parentElement && node.parentElement.tagName.toLowerCase() === 'pre') {
        // Skip if inside pre tag (will be handled by pre)
        result = node.textContent;
      } else {
        result = '`' + node.textContent + '`';
      }
      break;
      
    // Preformatted code blocks
    case 'pre':
      const codeElement = node.querySelector('code');
      const language = codeElement?.className?.match(/language-(\w+)/)?.[1] || '';
      const codeText = codeElement ? codeElement.textContent : node.textContent;
      result = '```' + language + '\n' + codeText + '\n```\n\n';
      break;
      
    // Links - Updated to handle nested structures better
    case 'a':
      const href = node.getAttribute('href');
      if (href) {
        // Process children but handle nested structures properly
        const linkText = getInlineContent(node).trim() || 'link';
        result = '[' + linkText + '](' + href + ')';
      } else {
        result = processChildren(node);
      }
      break;
      
    // Images - Modified to preserve emoji references and filenames
    case 'img':
      result = getImageReference(node);
      break;
      
    // Lists
    case 'ul':
      result = processListItems(node, false) + '\n';
      break;
      
    case 'ol':
      result = processListItems(node, true) + '\n';
      break;
      
    case 'li':
      // Handled by processListItems
      result = processChildren(node);
      break;
      
    // Blockquotes
    case 'blockquote':
      const quoteLines = processChildren(node).split('\n');
      result = quoteLines.map(line => '> ' + line).join('\n') + '\n\n';
      break;
      
    // Horizontal rules
    case 'hr':
      result = '---\n\n';
      break;
      
    // Tables
    case 'table':
      result = processTable(node) + '\n\n';
      break;
      
    // Divs - Special handling when inside links
    case 'div':
      if (isInsideLink(node)) {
        // Treat as inline when inside a link
        result = processChildren(node);
      } else {
        result = processChildren(node);
        // Add line break after div unless it's the last child
        if (node.nextSibling) {
          result += '\n';
        }
      }
      break;
      
    // Spans and other inline containers
    case 'span':
    case 'section':
    case 'article':
    case 'main':
    case 'aside':
    case 'header':
    case 'footer':
    case 'nav':
      result = processChildren(node);
      break;
      
    // Strikethrough
    case 'del':
    case 's':
    case 'strike':
      result = '~~' + processChildren(node) + '~~';
      break;
      
    // Subscript and superscript (no direct markdown equivalent)
    case 'sub':
      result = '~' + processChildren(node) + '~';
      break;
    case 'sup':
      result = '^' + processChildren(node) + '^';
      break;
      
    default:
      result = processChildren(node);
  }
  
  return result;
}

function getInlineContent(node) {
  // Get text content from a node, treating all children as inline
  let result = '';
  
  for (let child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      result += escapeMarkdown(child.textContent);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const tagName = child.tagName.toLowerCase();
      
      switch (tagName) {
        case 'strong':
        case 'b':
          result += '**' + getInlineContent(child) + '**';
          break;
        case 'em':
        case 'i':
          result += '*' + getInlineContent(child) + '*';
          break;
        case 'code':
          result += '`' + child.textContent + '`';
          break;
        case 'del':
        case 's':
        case 'strike':
          result += '~~' + getInlineContent(child) + '~~';
          break;
        case 'img':
          result += getImageReference(child);
          break;
        case 'br':
          result += ' ';
          break;
        default:
          // For any other tags (like div, span), just get their content
          result += getInlineContent(child);
      }
    }
  }
  
  return result;
}

function isInsideLink(node) {
  // Check if this node is inside an <a> tag
  let parent = node.parentElement;
  while (parent) {
    if (parent.tagName && parent.tagName.toLowerCase() === 'a') {
      return true;
    }
    parent = parent.parentElement;
  }
  return false;
}

function getImageReference(imgNode) {
  const src = imgNode.getAttribute('src') || '';
  const alt = imgNode.getAttribute('alt') || '';
  const title = imgNode.getAttribute('title') || '';
  
  // Check if alt text looks like an emoji reference (e.g., :smile:, :sweat-smile:)
  if (alt && alt.match(/^:[a-zA-Z0-9_\-]+:$/)) {
    return alt;
  }
  
  // Check for emoji in various data attributes (common in Slack, Discord, etc.)
  const dataEmoji = imgNode.getAttribute('data-emoji') || 
                    imgNode.getAttribute('data-emoji-name') ||
                    imgNode.getAttribute('data-emoji-id');
  if (dataEmoji) {
    // Ensure it's wrapped in colons if not already
    return dataEmoji.match(/^:.*:$/) ? dataEmoji : `:${dataEmoji}:`;
  }
  
  // Try to extract filename from src
  if (src) {
    // Handle data URLs for emojis
    if (src.startsWith('data:image')) {
      // For data URLs, prefer alt text or title
      if (alt) return alt.match(/^:.*:$/) ? alt : `:${alt}:`;
      if (title) return title;
      return '[inline image]';
    }
    
    // Extract filename from URL
    const filename = extractFilename(src);
    if (filename) {
      // Check if filename looks like an emoji name
      if (filename.match(/^[a-zA-Z0-9_\-]+\.(png|gif|jpg|jpeg|svg)$/i)) {
        const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
        // If it looks like an emoji name, wrap in colons
        if (nameWithoutExt.match(/^[a-zA-Z0-9_\-]+$/)) {
          // Check for common emoji patterns
          if (nameWithoutExt.match(/(emoji|emoticon|smiley|face|heart|smile|laugh|cry|angry|sad|happy)/i)) {
            return `:${nameWithoutExt}:`;
          }
        }
        // Otherwise just return the filename
        return filename;
      }
      return filename;
    }
  }
  
  // Fallback to alt text or a generic indicator
  if (alt) return alt;
  if (title) return title;
  return '[image]';
}

function extractFilename(url) {
  try {
    // Remove query parameters and hash
    const cleanUrl = url.split('?')[0].split('#')[0];
    
    // Get the last part of the path
    const parts = cleanUrl.split('/');
    const lastPart = parts[parts.length - 1];
    
    // If it looks like a filename, return it
    if (lastPart && lastPart.includes('.')) {
      // Decode URI components to handle encoded characters
      return decodeURIComponent(lastPart);
    }
    
    // Check if it might be a CDN URL with emoji name in path
    // e.g., /emojis/sweat-smile.png or /emoji/1234/homer-disappear.gif
    for (let i = parts.length - 2; i >= 0; i--) {
      if (parts[i].match(/emoji/i) && parts[i + 1]) {
        return decodeURIComponent(parts[i + 1]);
      }
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

function processChildren(node) {
  let result = '';
  for (let child of node.childNodes) {
    result += processNode(child);
  }
  return result;
}

function getTextContent(node) {
  return processChildren(node).trim();
}

function processListItems(listNode, ordered) {
  let result = '';
  let index = 1;
  
  for (let child of listNode.children) {
    if (child.tagName.toLowerCase() === 'li') {
      const prefix = ordered ? `${index}. ` : '- ';
      const content = processChildren(child).trim();
      result += prefix + content + '\n';
      index++;
    }
  }
  
  return result;
}

function processTable(table) {
  let result = '';
  const rows = table.querySelectorAll('tr');
  
  if (rows.length === 0) return '';
  
  // Process header row
  const headerCells = rows[0].querySelectorAll('th, td');
  if (headerCells.length > 0) {
    const headerRow = Array.from(headerCells).map(cell => 
      processChildren(cell).trim()
    ).join(' | ');
    result += '| ' + headerRow + ' |\n';
    
    // Add separator row
    const separator = Array.from(headerCells).map(() => '---').join(' | ');
    result += '| ' + separator + ' |\n';
  }
  
  // Process data rows
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].querySelectorAll('td');
    if (cells.length > 0) {
      const row = Array.from(cells).map(cell => 
        processChildren(cell).trim()
      ).join(' | ');
      result += '| ' + row + ' |\n';
    }
  }
  
  return result;
}

function escapeMarkdown(text) {
  // Don't escape colons that might be part of emoji references
  const emojiPattern = /:[a-zA-Z0-9_\-]+:/g;
  const emojis = text.match(emojiPattern) || [];
  
  // Temporarily replace emoji references with placeholders
  let processedText = text;
  const placeholders = [];
  emojis.forEach((emoji, index) => {
    const placeholder = `__EMOJI_${index}__`;
    placeholders.push({ placeholder, emoji });
    processedText = processedText.replace(emoji, placeholder);
  });
  
  // Escape markdown special characters (removed . from the list)
  // Only escape dot when it's after a number at the start of a line
  processedText = processedText
    .replace(/^(\d+)\./gm, '$1\\.')  // Escape dots after numbers at line start
    .replace(/([\\`*_{}[\]()#+\-!])/g, '\\$1')  // Removed . from this list
    .replace(/^(\s*)>/gm, '$1\\>');
  
  // Restore emoji references
  placeholders.forEach(({ placeholder, emoji }) => {
    processedText = processedText.replace(placeholder, emoji);
  });
  
  return processedText;
}