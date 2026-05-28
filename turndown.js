/**
 * Minimal HTML-to-Markdown converter.
 * Handles headings, paragraphs, bold, italic, inline code, code blocks,
 * links, images, ordered/unordered lists, blockquotes, horizontal rules,
 * and tables.
 */

function htmlToMarkdown(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return nodeToMarkdown(doc.body, { listDepth: 0, ordered: false, index: 0 })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function nodeToMarkdown(node, ctx) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent;
    // Preserve whitespace structure but avoid spurious newlines inside inline contexts
    return text.replace(/\n/g, " ");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const tag = node.tagName.toLowerCase();
  const children = () => childrenToMarkdown(node, ctx);

  switch (tag) {
    case "h1": return "\n\n# " + inline(node) + "\n\n";
    case "h2": return "\n\n## " + inline(node) + "\n\n";
    case "h3": return "\n\n### " + inline(node) + "\n\n";
    case "h4": return "\n\n#### " + inline(node) + "\n\n";
    case "h5": return "\n\n##### " + inline(node) + "\n\n";
    case "h6": return "\n\n###### " + inline(node) + "\n\n";

    case "p":
      return "\n\n" + inline(node) + "\n\n";

    case "br":
      return "  \n";

    case "strong":
    case "b":
      return "**" + inline(node) + "**";

    case "em":
    case "i":
      return "_" + inline(node) + "_";

    case "s":
    case "del":
    case "strike":
      return "~~" + inline(node) + "~~";

    case "code": {
      const parent = node.parentElement && node.parentElement.tagName.toLowerCase();
      if (parent === "pre") return node.textContent;
      return "`" + node.textContent + "`";
    }

    case "pre": {
      const codeNode = node.querySelector("code");
      const lang = getLang(codeNode || node);
      const code = (codeNode || node).textContent;
      return "\n\n```" + lang + "\n" + code.replace(/\n$/, "") + "\n```\n\n";
    }

    case "a": {
      const href = node.getAttribute("href") || "";
      const text = inline(node) || href;
      const title = node.getAttribute("title");
      const titlePart = title ? ' "' + title + '"' : "";
      return "[" + text + "](" + href + titlePart + ")";
    }

    case "img": {
      const src = node.getAttribute("src") || "";
      const alt = node.getAttribute("alt") || "";
      const title = node.getAttribute("title");
      const titlePart = title ? ' "' + title + '"' : "";
      return "![" + alt + "](" + src + titlePart + ")";
    }

    case "ul":
    case "ol": {
      const ordered = tag === "ol";
      const depth = ctx.listDepth || 0;
      const indent = "  ".repeat(depth);
      let index = 0;
      const items = [];
      for (const child of node.children) {
        if (child.tagName.toLowerCase() === "li") {
          index++;
          const bullet = ordered ? index + ". " : "- ";
          const itemCtx = { listDepth: depth + 1, ordered, index };
          const content = liToMarkdown(child, itemCtx).trim();
          items.push(indent + bullet + content);
        }
      }
      return "\n\n" + items.join("\n") + "\n\n";
    }

    case "li":
      return liToMarkdown(node, ctx);

    case "blockquote": {
      const inner = childrenToMarkdown(node, ctx).trim();
      return "\n\n" + inner.split("\n").map(l => "> " + l).join("\n") + "\n\n";
    }

    case "hr":
      return "\n\n---\n\n";

    case "table":
      return tableToMarkdown(node);

    case "thead":
    case "tbody":
    case "tfoot":
    case "tr":
    case "td":
    case "th":
      return "";

    case "script":
    case "style":
    case "noscript":
    case "template":
      return "";

    case "head":
      return "";

    default:
      return children();
  }
}

function inline(node) {
  let result = "";
  for (const child of node.childNodes) {
    result += nodeToMarkdown(child, {});
  }
  return result.replace(/\s+/g, " ").trim();
}

function childrenToMarkdown(node, ctx) {
  let result = "";
  for (const child of node.childNodes) {
    result += nodeToMarkdown(child, ctx);
  }
  return result;
}

function liToMarkdown(li, ctx) {
  let inlineText = "";
  let nestedText = "";
  for (const child of li.childNodes) {
    const tag = child.nodeType === Node.ELEMENT_NODE ? child.tagName.toLowerCase() : null;
    if (tag === "ul" || tag === "ol") {
      const ordered = tag === "ol";
      const depth = (ctx.listDepth || 0);
      const indent = "  ".repeat(depth);
      let idx = 0;
      const items = [];
      for (const c of child.children) {
        if (c.tagName.toLowerCase() === "li") {
          idx++;
          const bullet = ordered ? idx + ". " : "- ";
          const inner = liToMarkdown(c, { listDepth: depth + 1, ordered, index: idx }).trim();
          items.push(indent + bullet + inner);
        }
      }
      nestedText += "\n" + items.join("\n");
    } else {
      inlineText += nodeToMarkdown(child, ctx);
    }
  }
  return inlineText.replace(/ +/g, " ").trim() + nestedText;
}

function getLang(node) {
  if (!node) return "";
  const cls = node.getAttribute("class") || "";
  const match = cls.match(/(?:language|lang)-([a-z0-9]+)/i);
  return match ? match[1] : "";
}

function tableToMarkdown(table) {
  const rows = [];
  for (const row of table.querySelectorAll("tr")) {
    const cells = [];
    for (const cell of row.querySelectorAll("th, td")) {
      cells.push(inline(cell).replace(/\\/g, "\\\\").replace(/\|/g, "\\|"));
    }
    rows.push(cells);
  }
  if (rows.length === 0) return "";

  // Determine column count
  const cols = Math.max(...rows.map(r => r.length));

  // Pad rows
  const padded = rows.map(r => {
    while (r.length < cols) r.push("");
    return r;
  });

  const header = padded[0];
  const separator = header.map(() => "---");
  const body = padded.slice(1);

  const fmt = row => "| " + row.join(" | ") + " |";
  const lines = [fmt(header), fmt(separator), ...body.map(fmt)];
  return "\n\n" + lines.join("\n") + "\n\n";
}
