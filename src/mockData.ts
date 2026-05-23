/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PresetMedia {
  name: string;
  type: 'image' | 'video';
  url: string;
  thumbnail: string;
  caption: string;
  location: string;
}

export const PRESET_MEDIAS: PresetMedia[] = [
  {
    name: "Cyber Alleyway ⛈️",
    type: "video",
    url: "https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-light-under-rain-40072-large.mp4",
    thumbnail: "https://images.unsplash.com/photo-1515260268569-9271009adfdb?auto=format&fit=crop&q=80&w=600",
    caption: "Neon reflections in deep digital dark alleys.",
    location: "Neo Tokyo, Sector 9"
  },
  {
    name: "Forest Stream 🍃",
    type: "video",
    url: "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4",
    thumbnail: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80&w=600",
    caption: "Finding organic tranquil frequencies in mountain rivers.",
    location: "Kyoto Highlands"
  },
  {
    name: "Waves Rolling 🌊",
    type: "video",
    url: "https://assets.mixkit.co/videos/preview/mixkit-waves-breaking-in-the-sea-1527-large.mp4",
    thumbnail: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&q=80&w=600",
    caption: "Colossal waters expanding infinitely.",
    location: "Reynisdrangar, Iceland"
  },
  {
    name: "Synth Keyboard 🎹",
    type: "video",
    url: "https://assets.mixkit.co/videos/preview/mixkit-typing-on-a-glowing-keyboard-in-the-dark-44163-large.mp4",
    thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600",
    caption: "Procedural sound design compilation night sessions.",
    location: "The Synth Lab"
  },
  {
    name: "Cyberpunk City Skyline 🌆",
    type: "image",
    url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=800",
    thumbnail: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=200",
    caption: "High towers casting long shadow bands.",
    location: "Chiba Prefecture, Neo City"
  },
  {
    name: "Monolithic Void 🔳",
    type: "image",
    url: "https://images.unsplash.com/photo-1501183007986-d0d080b147f9?auto=format&fit=crop&q=80&w=800",
    thumbnail: "https://images.unsplash.com/photo-1501183007986-d0d080b147f9?auto=format&fit=crop&q=80&w=200",
    caption: "Absolute geometric isolation layers.",
    location: "Slyte Museum of Art"
  }
];
