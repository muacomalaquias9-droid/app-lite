// Runtime iOS 17 emoji replacer
// Substitutes every unicode emoji in user-rendered content with an <img> from
// the Apple emoji CDN (em-content.zobj.net) so Android users see the same iPhone style.

// Match most emoji ranges + ZWJ sequences + skin tones + flags
const EMOJI_REGEX = /(\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*|[\u{1F1E6}-\u{1F1FF}]{2})/gu;

function codepoints(emoji: string, keepVariation = false): string {
  const out: string[] = [];
  for (const c of emoji) {
    const cp = c.codePointAt(0);
    if (!cp) continue;
    if (cp === 0xfe0f && !keepVariation) continue;
    out.push(cp.toString(16));
  }
  return out.join("-");
}

const BASE = "https://cdn.jsdelivr.net/gh/iamcal/emoji-data@master/img-apple-160";

function toImg(emoji: string): string {
  const plain = codepoints(emoji);
  const withVariation = codepoints(emoji, true);
  const url = `${BASE}/${plain}.png`;
  // Some Apple assets are stored with the variation selector (e.g. 263a-fe0f.png).
  // Try that variant before falling back to the native glyph.
  const fallback =
    withVariation !== plain
      ? `if(!this.dataset.retry){this.dataset.retry='1';this.src='${BASE}/${withVariation}.png';}else{this.outerHTML=this.getAttribute('alt')}`
      : `this.outerHTML=this.getAttribute('alt')`;
  return `<img class="ios-emoji" draggable="false" alt="${emoji}" src="${url}" onerror="${fallback}" />`;
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
