// Runtime iOS 17 emoji replacer
// Substitutes every unicode emoji in user-rendered content with an <img> from
// the Apple emoji CDN (em-content.zobj.net) so Android users see the same iPhone style.

// Match most emoji ranges + ZWJ sequences + skin tones + flags
const EMOJI_REGEX = /(\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*|[\u{1F1E6}-\u{1F1FF}]{2})/gu;

function codepoints(emoji: string): string {
  const out: string[] = [];
  for (const c of emoji) {
    const cp = c.codePointAt(0);
    if (cp && cp !== 0xfe0f) out.push(cp.toString(16));
  }
  return out.join("-");
}

function toImg(emoji: string): string {
  const cp = codepoints(emoji);
  // emojicdn redirects to canonical Apple PNG for the codepoint
  const url = `https://cdn.jsdelivr.net/gh/iamcal/emoji-data@master/img-apple-160/${cp}.png`;
  return `<img class="ios-emoji" draggable="false" alt="${emoji}" src="${url}" onerror="this.outerHTML=this.getAttribute('alt')" />`;
}

function processNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || "";
    if (!EMOJI_REGEX.test(text)) return;
    EMOJI_REGEX.lastIndex = 0;
    const html = text.replace(EMOJI_REGEX, (m) => toImg(m));
    const span = document.createElement("span");
    span.innerHTML = html;
    (node as Text).replaceWith(span);
    return;
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element;
    const tag = el.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEXTAREA" || tag === "INPUT") return;
    if (el.classList && el.classList.contains("ios-emoji")) return;
    // shallow-clone children list because we mutate during iteration
    const children = Array.from(el.childNodes);
    children.forEach(processNode);
  }
}

let observer: MutationObserver | null = null;

export function startIosEmojiReplacer() {
  if (typeof document === "undefined" || observer) return;
  processNode(document.body);
  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach(processNode);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
