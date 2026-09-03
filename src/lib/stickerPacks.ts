import helloSticker from '@/assets/stickers/hello.png';
import waveSticker from '@/assets/stickers/wave.png';
import fireSticker from '@/assets/stickers/fire.png';
import searchSticker from '@/assets/stickers/search.png';
import friendsSticker from '@/assets/stickers/friends.png';
import trophySticker from '@/assets/stickers/trophy.png';

export interface StickerItem {
  id: string;
  /** Imagem real do sticker (PNG transparente). */
  src: string;
  label: string;
  /** Termo sugerido de pesquisa ligado ao sticker. */
  term: string;
}

export interface StickerPack {
  id: string;
  name: string;
  stickers: StickerItem[];
}

export const STICKER_PACKS: StickerPack[] = [
  {
    id: 'social',
    name: 'Social',
    stickers: [
      { id: 'hello', src: helloSticker, label: 'Olá', term: 'ola' },
      { id: 'wave', src: waveSticker, label: 'Saudar', term: 'novo' },
      { id: 'friends', src: friendsSticker, label: 'Amigos', term: 'amigo' },
    ],
  },
  {
    id: 'destaque',
    name: 'Destaques',
    stickers: [
      { id: 'fire', src: fireSticker, label: 'Em alta', term: 'top' },
      { id: 'trophy', src: trophySticker, label: 'Verificados', term: 'oficial' },
      { id: 'search', src: searchSticker, label: 'Descobrir', term: 'paji' },
    ],
  },
];

export const ALL_STICKERS: StickerItem[] = STICKER_PACKS.flatMap((p) => p.stickers);
export { searchSticker, friendsSticker };
