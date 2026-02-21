
import init, { generate_regex } from './pkg/regexp_wasm.js';

async function runApp() {
  await init();

  const generateBtn = document.getElementById('generateBtn');
  const inputText = document.getElementById('inputText');
  const targetText = document.getElementById('targetText');
  const resultBox = document.getElementById('resultBox');
  const regexOutput = document.getElementById('regexOutput');
  const preview = document.getElementById('preview');

  // Set default values
  inputText.value = `2024-02-15 10:00:01 [INFO] User admin@example.com logged in from 192.168.1.10
2024-02-15 10:05:23 [WARN] Failed login attempt from test_user@sub.domain.org
2024-02-15 10:15:00 [ERROR] Connection lost to db-prod-01 (10.0.0.5)`;

  targetText.value = `admin@example.com
test_user@sub.domain.org`;

  generateBtn.addEventListener('click', () => {
    const rawTargets = targetText.value;
    const lines = rawTargets.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) {
      alert('Please enter at least one target string to match.');
      return;
    }

    try {
      const generatedRegexSrc = generate_regex(lines);
      regexOutput.textContent = generatedRegexSrc;
      resultBox.hidden = false;
      
      highlightMatches(generatedRegexSrc);
    } catch (e) {
      console.error(e);
      alert('Error generating regex: ' + e);
    }
  });

  function highlightMatches(regexStr) {
    const text = inputText.value;
    if (!text) {
      preview.textContent = "No input text to preview matches against.";
      return;
    }

    try {
      const re = new RegExp(regexStr, 'g');
      let lastIndex = 0;
      let match;
      const fragments = [];

      // Reset lastIndex because 'g' is used
      re.lastIndex = 0;
      
      // We can't use matchAll easily if the regex is potentially infinite or empty string matching 
      // (though grex avoids empty unless input has empty).
      // Let's use simple replacement or match loop.
      
      // Actually, standard string replacement with a callback is easiest for highlighting.
      // But we want to preserve exact text structure.
      
      // Construct HTML with spans
      let html = "";
      let cursor = 0;
      
      // Using replace with callback to build HTML
      // Note: This replaces the original text with spans. 
      // Be careful with HTML injection from source text. 
      // We must escape the source text first? No, we process raw text.
      
      // Safer approach: manual loop
      const matches = [...text.matchAll(re)];
      
      if (matches.length === 0) {
        preview.textContent = text;
        return;
      }
      
      matches.forEach(m => {
        const start = m.index;
        const end = start + m[0].length;
        
        // Append text before match (escaped)
        html += escapeHtml(text.slice(cursor, start));
        
        // Append match (wrapped)
        html += `<span class="match">${escapeHtml(m[0])}</span>`;
        
        cursor = end;
      });
      
      // Append remaining
      html += escapeHtml(text.slice(cursor));
      
      preview.innerHTML = html;
      
    } catch (e) {
      preview.textContent = "Invalid Regex generated (or not supported by JS engine): " + regexStr;
    }
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

runApp();
