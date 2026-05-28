/* global htmlToMarkdown */

const copyBtn = document.getElementById("copy-btn");
const statusEl = document.getElementById("status");

function setStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = type || "";
}

copyBtn.addEventListener("click", async () => {
  copyBtn.disabled = true;
  setStatus("Working…");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        title: document.title,
        url: location.href,
        html: document.body.innerHTML,
      }),
    });

    const { title, url, html } = results[0].result;

    const markdown = htmlToMarkdown(html);
    const escapedTitle = title.replace(/[\\`*_{}[\]<>()#+\-!.|]/g, "\\$&");
    const fullMarkdown = "# " + escapedTitle + "\n\n" + url + "\n\n" + markdown;

    await navigator.clipboard.writeText(fullMarkdown);
    setStatus("Copied!", "success");
  } catch (err) {
    console.error("[Copy to Markdown]", err);
    setStatus("Error: " + err.message, "error");
  } finally {
    copyBtn.disabled = false;
  }
});
