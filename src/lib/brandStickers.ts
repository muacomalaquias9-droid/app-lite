// Pack de emojis/stickers de aplicativos no estilo Telegram (ex.: NETFLIX).
// São textos unicode estilizados, por isso aparecem no feed em qualquer dispositivo.

export interface BrandSticker {
  id: string;
  label: string;
  text: string;
}

const NEG = "🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩";
const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NEG_CHARS = Array.from(NEG);

export function toAppSticker(word: string): string {
  return Array.from(word.toUpperCase())
    .map((c) => {
      const i = ALPHA.indexOf(c);
      return i >= 0 ? NEG_CHARS[i] : c === " " ? " " : c;
    })
    .join("");
}

const BRANDS: [string, string][] = [
  ["netflix", "Netflix"],
  ["youtube", "YouTube"],
  ["tiktok", "TikTok"],
  ["instagram", "Instagram"],
  ["facebook", "Facebook"],
  ["whatsapp", "WhatsApp"],
  ["telegram", "Telegram"],
  ["spotify", "Spotify"],
  ["blynk", "Blynk"],
  ["x", "X"],
  ["snapchat", "Snapchat"],
  ["discord", "Discord"],
  ["twitch", "Twitch"],
  ["google", "Google"],
  ["apple", "Apple"],
  ["android", "Android"],
  ["amazon", "Amazon"],
  ["primevideo", "Prime Video"],
  ["hbomax", "HBO Max"],
  ["disney", "Disney Plus"],
  ["canva", "Canva"],
  ["capcut", "CapCut"],
  ["chatgpt", "ChatGPT"],
  ["pubg", "PUBG"],
  ["freefire", "Free Fire"],
  ["roblox", "Roblox"],
  ["minecraft", "Minecraft"],
  ["fifa", "FIFA"],
  ["playstation", "PlayStation"],
  ["xbox", "Xbox"],
  ["uber", "Uber"],
  ["paypal", "PayPal"],
  ["visa", "Visa"],
  ["deezer", "Deezer"],
  ["shazam", "Shazam"],
  ["zoom", "Zoom"],
  ["linkedin", "LinkedIn"],
  ["pinterest", "Pinterest"],
  ["reddit", "Reddit"],
  ["shein", "Shein"],
];

export const BRAND_STICKERS: BrandSticker[] = BRANDS.map(([id, label]) => ({
  id,
  label,
  text: toAppSticker(label),
}));
