const express = require('express');
const path = require('path');
const Busboy = require('busboy');
const axios = require('axios');
require('dotenv').config();

// ---------- Firebase Admin: safe, optional init ----------
let admin;
let firebaseAdminLoaded = false;

try {
  admin = require('firebase-admin');
  // The real package always exposes credential.cert. If it doesn't, the
  // module is corrupt/misnamed and we must not call it.
  firebaseAdminLoaded = !!(admin && admin.credential && typeof admin.credential.cert === 'function');
  if (!firebaseAdminLoaded) {
    console.warn('⚠️ firebase-admin loaded but credential API is missing.');
    console.warn('   Run: npm uninstall firebase-admin && npm install firebase-admin');
  }
} catch (err) {
  console.warn('⚠️ firebase-admin not installed:', err.message);
  admin = null;
}

function createMockAdmin() {
  // Firestore/storage must return falsy so the app falls back to mock data.
  return {
    initializeApp: () => {},
    credential: { cert: () => ({}) },
    firestore: () => null,
    storage:   () => null,
    auth:      () => ({ verifyIdToken: () => Promise.resolve({}) })
  };
}

if (firebaseAdminLoaded) {
  try {
    const serviceAccount = process.env.FIREBASE_ADMIN_PRIVATE_KEY ? {
      projectId:  process.env.FIREBASE_ADMIN_PROJECT_ID,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL
    } : null;

    if (serviceAccount && serviceAccount.privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_ADMIN_STORAGE_BUCKET
      });
      console.log('✅ Firebase Admin initialized successfully');
    } else {
      console.log('⚠️ Firebase Admin credentials not provided - running in demo mode');
      admin = createMockAdmin();
    }
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    admin = createMockAdmin();
  }
} else {
  console.log('🎭 Running in demo mode (no Firebase Admin)');
  admin = createMockAdmin();
}

const app = express();
const port = process.env.PORT || 3000;

// These are now safely null in demo mode, which the existing `if (db)` /
// `if (bucket)` branches already handle.
const db     = typeof admin.firestore === 'function' ? admin.firestore() : null;
const bucket = typeof admin.storage   === 'function' ? admin.storage()?.bucket() : null;

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from current directory
app.use(express.static(__dirname));

// SEO Optimization Class
class SEOOptimizer {
  static generateSEOTitle(promptTitle) {
    const keywords = this.extractKeywords(promptTitle);
    const baseTitle = `AI Prompt: ${promptTitle} - Prompt Seen`;
    return keywords.length > 0 ? `${keywords.slice(0, 3).join(', ')} | ${baseTitle}` : baseTitle;
  }

  static generateMetaDescription(promptText, title) {
    const cleanText = promptText.replace(/[^\w\s]/gi, ' ').substring(0, 155);
    return `${cleanText}... Explore this AI-generated image and learn prompt engineering techniques.`;
  }

  static extractKeywords(text) {
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.has(word));

    return [...new Set(words)];
  }

  static generateSlug(title) {
    return title.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 60);
  }

  static generateStructuredData(prompt) {
    return {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      "name": prompt.title,
      "description": prompt.metaDescription,
      "image": prompt.imageUrl,
      "author": {
        "@type": "Person",
        "name": prompt.userName || "Prompt Seen User"
      },
      "datePublished": prompt.createdAt,
      "keywords": prompt.keywords.join(', '),
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `https://promtseen.com/prompt/${prompt.id}`
      }
    };
  }
}

// Sitemap Generator Class
class SitemapGenerator {
  static generateSitemap(urls) {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    urls.forEach(url => {
      xml += `<url>\n`;
      xml += `  <loc>${this.escapeXml(url.loc)}</loc>\n`;
      if (url.lastmod) xml += `  <lastmod>${url.lastmod}</lastmod>\n`;
      if (url.changefreq) xml += `  <changefreq>${url.changefreq}</changefreq>\n`;
      if (url.priority) xml += `  <priority>${url.priority}</priority>\n`;
      xml += `</url>\n`;
    });

    xml += `</urlset>`;
    return xml;
  }

  static escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }
}

// Mock data for development
const mockPrompts = [
  {
    id: 'mountain-ai-prompt',
    title: 'mountain',
    promptText: 'Create a cinematic double-exposure travel poster for “Manali, Himachal” using my uploaded photo. Keep the same face, pose, outfit, sunglasses, and natural features unchanged. Blend Himalayan valleys, pine forests, misty mountains, winding roads, rivers, and clouds inside the portrait silhouette. Add a small full-body version beside a scooter/bike on a mountain road. Style: luxury Himalayan tourism campaign, dreamy matte tones, soft fog, atmospheric depth, realistic blending, minimal typography, clean white background, ultra-realistic editorial aesthetic.            Text:                                    “Manali”.                              “Himachal”.                              “TRAVEL• BREATHE• ESCAPE”',
    imageUrl: 'https://pub-7c47bf4b49e24e8a984db081699eedb0.r2.dev/prompts/1780064765385-a46522a4-5e26-4c7e-a2e3-68c3e235493d.png',
    userName: '@promtseen',
    likes: 42,
    views: 156,
    uses: 23,
    keywords: ['fantasy', 'landscape', 'mountains', 'digital art'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seoScore: 85
  },
  {
    id: 'travel-ai-photo-prompt',
    title: 'Travel ai photo prompt',
    promptText: 'Create a cinematic double-exposure travel poster for “Rishikesh, Uttarakhand” using my uploaded photo. Keep the same face, pose, outfit, and natural features unchanged. Blend Himalayan valleys, pine forests, misty mountains, winding roads, rivers, and clouds inside the portrait silhouette. Add a small full-body version beside a bike on a mountain road. Style: luxury Himalayan tourism campaign, dreamy matte tones, soft fog, atmospheric depth, realistic blending, minimal typography, clean white background, ultra-realistic editorial aesthetic.                        Text.                                “Rishikesh”                        “Uttarakhand”.                            “TRAVEL • BREATHE • ESCAPE” don’t change face',
    imageUrl: 'https://pub-7c47bf4b49e24e8a984db081699eedb0.r2.dev/prompts/1780064966924-3afee6ab-5b0f-465c-991d-37e04dfd49ed.png',
    userName: '@promtseen',
    likes: 67,
    views: 289,
    uses: 45,
    keywords: ['travel', 'city', 'prompt', 'cinematic'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seoScore: 92
  },
  {
    id: 'prompt-seen-new-diwali-ai-photo-prompt',
    title: 'prompt seen new diwali ai photo prompt',
    promptText: 'Create a vertical medium portrait of a woman celebrating Diwali at night, captured in crisp cinematic detail. She has a soft smile, looking down toward a lit sparkling phuljhadi held in her right hand. She is dressed in a mustard-yellow silk pre-draped saree with a thick strap sleeveless sequins work blouse. Her hair is full open. She wears a simple maang tikka, chaandbali earrings, a diamond bracelet. In the shallow-depth-of-field background, a vibrant ground firework fountain (anar) erupts with olden sparks illuminating th night haze. 8k resolution. 3:4 ratio.',

    imageUrl: 'https://pub-7c47bf4b49e24e8a984db081699eedb0.r2.dev/prompts/1794128157587-4f135b89-f47b-4214-b952-fd741b715a1e.png',
    userName: '@promtseen',
    likes: 89,
    views: 342,
    uses: 56,
    keywords: ['diwali', 'promptseen', 'viral', 'prompt'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seoScore: 88
  },
  {
    id: 'viral-lehenga-ai-photo-editing-prompt',
    title: 'Viral Lehenga ai photo editing prompt',
    promptText: 'Transform the uploaded adult woman photo into a soft Prompt Seen Girl butterfly portrait. Keep the face recognizable and realistic. Place her in a pastel flower garden with two or three realistic butterflies near hair and shoulder, light embroidered outfit, airy morning glow, shallow depth of field, crisp eyes, natural smile, and 4:5 vertical framing. Do not add fantasy wings, text, logos, watermark, or distorted insects.',
    imageUrl: 'https://pub-7c47bf4b49e24e8a984db081699eedb0.r2.dev/prompts/1791368182158-2192f75f-7eae-4ee6-a90b-db2b28c302f0.png',
    userName: '@promtseen',
    likes: 104,
    views: 521,
    uses: 78,
    keywords: ['ai', 'photo', 'editing', 'lehenga'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seoScore: 94
  },
  {
    id: 'viral-car-backflip-ai-video-prompt',
    title: 'Viral car backflip ai video prompt',
    promptText: 'A cinematic shot from a trailing vehicle on a wide highway under a cloudy sky. A black SUV and a red hatchback are driving parallel to each other at the same speed. A man wearing a black shirt and blue jeans climbs out of the side window of the moving black SUV onto its roof. Once on the roof, he performs a spectacular backflip across the gap between the cars, and lands safely on the roof of the moving red hatchback. Realistic action stunt, dynamic motion, highly detailed.',
    imageUrl: 'https://pub-7c47bf4b49e24e8a984db081699eedb0.r2.dev/thumbnails/1791270044377-0336ab5f-9e5a-46bf-96f8-bf5237400774.JPG',
    userName: '@promtseen',
    likes: 73,
    views: 298,
    uses: 41,
    keywords: ['car', 'flip', 'backflip', 'boy'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seoScore: 86
  },
  {
    id: 'raksha-bandhan-ai-photo-editing-prompt',
    title: 'Raksha bandhan ai photo editing prompt ',
    promptText: 'A beautiful artistic collage of Raksha Bandhan moments arranged in a warm festive layout. The collage features multiple overlapping scenes: a smiling sister tying a colorful rakhi on her brother’s wrist, a close-up of an elegant designer rakhi, a traditional brass thali filled with diya, kumkum, rice and marigold flowers, a brother covering his sister’s eyes while gifting her a pink box, siblings sharing sweets',
    imageUrl: 'https://pub-7c47bf4b49e24e8a984db081699eedb0.r2.dev/prompts/1787824036722-a58e4c0e-bd9f-45b0-a206-cf131af1266f.png',
    userName: '@promtseen',
    likes: 156,
    views: 789,
    uses: 92,
    keywords: ['portrait', 'collage', 'rakshabandhan', 'prompt'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seoScore: 95
  },
  {
    id: 'mahadev-ai-prompt',
    title: 'Mahadev ai prompt',
    promptText: 'A hyper-realistic cinematic wide shot of a young Indian woman sitting in a profound meditative state on a tiger-skin rug atop a smooth basalt rock by the rushing turquoise waters of the Ganges River at Gangotri. She wears a simple, hand-loomed white Khadi cotton sari with a thin gold border. Behind her, a massive, thirty-foot-tall volcanic avatar of Lord Shiva emerges from the Himalayan mist. His skin is textured like cooling lava, with glowing orange veins of magma pulsing beneath the surface. He sits in a matching lotus position, his eyes closed in deep dhyana. The lighting is the soft, blue-toned dawn light of the high mountains, contrasted by the intense orange glow emanating from Shiva’s body. Small embers and frozen ice crystals float in the air together. In the background, the jagged, snow-capped peaks of Shivling mountain are visible under a violet sky. The camera is a Fujifilm GFX 100S with a 35mm f/1.8 lens, capturing every pore on the woman’s face and every crystalline crack in th deity’s stone-like skin. The mood is one of absolute silence and cosmic power. High-resolution textures show the frayed edges of the cotton fabric and the wet sheen on the river stones. Tiny sparks fly from Shiva’s matted hair, which is styled into a towering jata adorned with a miniature glowing crescent moon made of pure white light. A large, realistic king cobra is coiled around his neck, its scales reflecting the magma glow. Volumetric fog rolls off the water’s surface, catching the dual-toned light. The composition follows the golden ratio, placing the woman’s serene face as the focal point against the immense, terrifyingly beautiful scale of the Mahadev. –ar 3:4',
    imageUrl: 'https://pub-7c47bf4b49e24e8a984db081699eedb0.r2.dev/prompts/1786869983575-784f43c2-41e7-4d05-845a-ef585f4d59fd.png',
    userName: '@promtseen',
    likes: 64,
    views: 276,
    uses: 38,
    keywords: ['mahadev', 'station', 'ai', 'prompt'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seoScore: 87
  },
  {
    id: 'viral-mahadev-tandav-ai-prompt',
    title: 'Viral Mahadev tandav ai prompt ',
    promptText: 'An intense action shot capturing a woman performing a classical Bharatanatyam dance move, her body angled dynamically as her silk Kanchipuram sari in emerald green and maroon swirls around her. Behind her, the volcanic Lord Shiva performs the celestial dance of destruction, the Tandava. His four massive arms are spread wide; one holds a blazing Trishula, another a vibrating damaru drum that creates visible sonic ripples in the air. His body is a masterpiece of anatomical detail, composed of charred obsidian with glowing red cracks. He is surrounded by a ring of fire, the Agni-mandal. The setting is an ancient, crumbling stone temple courtyard in Hampi at midnight. The ground is covered in a layer of grey ash that kicks up as they move. The lighting is dramatic Chiaroscuro, with heavy shadows and brilliant highlights from the leaping flames. The camera is a Sony A7R V with a 24mm wide-angle lens, used at a low angle to emphasize the towering height of the deity. Motion blur is visible on the edges of the woman’s silk pleats, while Shiva remains sharply in focus as an eternal force. The air is thick with smoke and the smell of burning incense. Sparks from the fire merge with the starry night sky. Every bead of sweat on the woman’s forehead and every drop of molten rock dripping from Shiva’s fingertips is rendered in 8K detail. The mood is chaotic, powerful, and transformative. –ar 3:4',
    imageUrl: 'https://pub-7c47bf4b49e24e8a984db081699eedb0.r2.dev/prompts/1786869800681-2b10dbb0-e216-4a26-8549-8cc067d8ca22.png',
    userName: '@promtseen',
    likes: 98,
    views: 432,
    uses: 67,
    keywords: ['mahadev', 'tandav', 'prompt', 'viral'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seoScore: 90
  },
  {
    id: 'promtseen-eye-gf-ai-photo-viral-prompt',
    title: 'Promtseen eye gf ai photo viral prompt',
    promptText: 'A surreal cinematic digital artwork featuring a lone young man standing in the middle of a vast green grass field under a dramatic overcast sky. He wears a dark navy shirt and loose dark pants, standing with arms Fully outstrethed and head tilted upward, expressing freedom, longing, and emotional surrender. Behind him, dominating the entire sky, is an enormous monochrome female face blended seamlessly into the clouds. The composition focuses on her ultra-detailed expressive eyes, rendered at colossal scale, staring directly forward with deep emotion and melancholy. A small black bindi sits between her eyebrows. Her eyelashes, eyebrows, skin texture, and eye reflections are highly detailed and realistic. The giant face appears ethereal, dreamlike, and ghostly, emerging from storm clouds with soft atmospheric blending. Moody cinematic lighting, dark blue-gray color grading, emotional fantasy atmosphere, dramatic depth, volumetic clouds, subtle Fog, ultra-realistic textures. 4:5',
    imageUrl: 'https://pub-7c47bf4b49e24e8a984db081699eedb0.r2.dev/prompts/1786258953781-a746b9b2-3484-402b-bec3-f8bb8d1af577.png',
    userName: '@promtseen',
    likes: 81,
    views: 367,
    uses: 49,
    keywords: ['eye', 'photo', 'prompt', 'gf'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seoScore: 89
  },
  {
    id: 'Mahadev-war-ai-prompt-to-create-viral-photo-with-mahadev',
    title: 'Mahadev war ai prompt to create viral photo with mahadev',
    promptText: 'A dramatic scene on an ancient battlefield at dusk. A woman dressed as a warrior in leather armor and a saffron headscarf is kneeling, sharpening a bronze sword on a whetstone. Behind her, the volcanic Lord Shiva stands as an indestructible wall of fire and stone. His body is bulky and muscular, like a mountain range, with rivers of golden lava flowing down his chest. He holds a massive Trishula that glows with white-hot heat, its tip melting the very air around it. The sky is a bruised purple and orange, filled with the smoke of distant fires. The ground is littered with broken shields and arrows. The camera is a Nikon Z9 with a 70-200mm lens, compressed to show the scale of the deity compared to the woman. The lighting is harsh and directional, coming from the fires of the battlefield and the god’s own radiance. High-resolution details include the scratches on the woman’s armor, the sparks flying from the whetstone, and the cooling crust of rock on Shiva’s shoulders. The mood is one of grim determination and divine protection. The air is thick with grit and the sound of a thousand blowing conch shells. –ar 3:4',
    imageUrl: 'https://pub-7c47bf4b49e24e8a984db081699eedb0.r2.dev/prompts/1786869533477-0f7999e7-41e6-4176-882e-9ec029fa7732.png',
    userName: '@promtseen',
    likes: 134,
    views: 612,
    uses: 85,
    keywords: ['anime', 'warrior', 'mahadev', 'prompt'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seoScore: 93
  },
  {
    id: 'indian-flag-On-Hand-With-lion-ai-photo-prompt',
    title: 'Indian flag On Hand With lion ai photo prompt',
    promptText: 'Use the uploaded reference image as the exact face reference. Preserve 100% identical facial identity, hairstyle, skin tone, sunglasses, and expression. Create an ultra-realistic cinematic portrait of a young Indian girlwalking confidently toward the camera on a Indian tricolour smoke road surrounded. She wears a fitted graceful white cotton kurti with a flowing saffron dupatta, green bangles, elegant jhumka earrings, a tiny black bindi, and long silky black hair. carrying a Big Fresh Indian Flag. A powerful male lion on his right, both calm and synchronized. Add dense smoke, floating embers, moody atmosphere, volumetric lighting, HDR, ultra-detailed fur, realistic skin texture, premium color grading, shallow depth of field, DSLR 85mm lens, blockbuster movie poster style, ultra-sharp focus, 8K, vertical 4:5, no text, no watermark.',
    imageUrl: 'https://pub-7c47bf4b49e24e8a984db081699eedb0.r2.dev/prompts/1786178696170-6c1a1fcf-f24b-405c-aeb8-e26407843c8a.png',
    userName: '@promtseen',
    likes: 56,
    views: 231,
    uses: 32,
    keywords: ['flag', 'indian', 'lion', 'photo'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seoScore: 84
  },
  {
    id: 'chocolate-baby-ai-prompt ',
    title: 'Chocolate baby ai prompt ',
    promptText: 'Use the uploaded photo as the only identity reference. face lock Maintain the maximum facial resemblance: features, proportions, expression, and natural asymmetries. A premium handmade collectible doll, adorable, with a slightly large head, small and slender body, round cheeks, realistic 3D face, glass eyes, and felt and fabric textures. The tiny doll hugs a KitKat chocolate bar almost its own size, with several bites taken out of it. He smiles proudly, with a bit of chocolate on his mouth,cheeks, and hands. A few drops of melted chocolate on the floor. A giant human finger gently lifts him by the back of his clothing while he refuses to let go of the Strong contrast of scale, warm, bright, and clean atmosphere, minimalist background, premium diorama macro photography, soft depth of field, professional photographic quality, and extreme facial fidelity to the original photo. 9:16 ratio',
    imageUrl: 'https://pub-7c47bf4b49e24e8a984db081699eedb0.r2.dev/prompts/1785753531241-d44e1c46-7377-4146-9d66-8ed679ed7157.JPG',
    userName: '@promtseen',
    likes: 72,
    views: 315,
    uses: 44,
    keywords: ['chocolate', 'trendy', 'prompt', 'baby'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seoScore: 86
  },
  {
    id: 'motu-patlu-ai-prompt',
    title: 'Motu patlu ai prompt ',
    promptText: 'Transform the uploaded image into realistic talking in hindi like "Are Yaar Hum Kaha Aagaye Yeh Toh [Location /Akash Nagar ] Hai " Do not change face ,eyes, ears, no watermarks ,face should be exactly same as in the attached image ',
    imageUrl: 'https://pub-7c47bf4b49e24e8a984db081699eedb0.r2.dev/prompts/1784270764572-dc8cd3a8-5f02-4b99-ba89-9ddd132246d9.png',
    userName: '@promtseen',
    likes: 91,
    views: 401,
    uses: 58,
    keywords: ['motu', 'jungle', 'patlu', 'prompt'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seoScore: 91
  },
  {
    id: 'green-saree-prompt-for-girls',
    title: 'Green saree prompt for girls ',
    promptText: 'Ultra-realistic indoor iPhone 16 Pro front-camera selfie collage, 2×2 grid with four perfectly equal square frames, appearing exactly like naturally captured real-life selfies instead of AI-generated artwork. Absolute smartphone realism with authentic iPhone front camera optics, subtle sensor noise, delicate film grain, tiny handheld motion blur, slight autofocus softness, realistic JPEG compression, HDR turned off, no beauty mode, no skin smoothing, no over-sharpening, no artificial perfection. True-to-life skin texture with visible pores, baby hairs, peach fuzz, natural lip texture, tiny facial asymmetry, lifelike eye reflections, soft lens imperfections, realistic front-camera perspective.',
    imageUrl: 'https://pub-7c47bf4b49e24e8a984db081699eedb0.r2.dev/prompts/1784190808513-614b2dc5-a7a6-459f-ad5c-1d42065461b2.png',
    userName: '@promtseen',
    likes: 87,
    views: 389,
    uses: 52,
    keywords: ['prompt', 'saree', 'Green', 'adventure'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seoScore: 88
  },
  {
    id: 'three-layer-viral-ai-photo-creation-prompt',
    title: 'Three layer viral ai photo creation prompt for rainy seasion ',
    promptText: 'Create an ultra-realistic rainy cinematic collage in 4:5 format using the uploaded image as the ONLY facial identity reference.STRICT IDENTITY LOCK: Keep the exact same face, hairstyle, skin tone, expression, and identity in all three frames. Preserve realistic skin texture and natural facial lighting. Only the outfit, background, camera angle, and atmosphere may change.',
    imageUrl: 'https://pub-7c47bf4b49e24e8a984db081699eedb0.r2.dev/prompts/1783841637458-19351a37-7cc8-4c0d-a350-d0f366aabe9f.png',
    userName: '@promtseen',
    likes: 118,
    views: 534,
    uses: 73,
    keywords: ['layer', 'three', 'rainy', 'portrait'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seoScore: 92
  },
  {
    id: 'Vector-photo-editing-prompt',
    title: 'Vector photo editing prompt to create viral ai vector',
    promptText: 'Stylized 2D digital illustration of a confident South Asian woman. She has middle-parted dark wavy hair, a small black bindi, round tinted sunglasses with metallic frames, and silver drop earrings. She wears an elegant lavender purple saree draped over a black blouse with intricate silver embroidered borders. Set against a dark navy-purple background with a diagonal pastel purple banner patterned with subtle hearts. Clean vector art, modern chic aesthetic, vivid portrait shot. 4:5 ratio.',
    imageUrl: 'https://pub-7c47bf4b49e24e8a984db081699eedb0.r2.dev/prompts/1788343856650-a5053535-f66a-4cb6-9fd0-57b56e593fc0.png',
    userName: '@promtseen',
    likes: 79,
    views: 356,
    uses: 47,
    keywords: ['vector', 'viral', 'ai', 'prompt'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seoScore: 87
  },
  {
    id: 'Krishna-behind-me-viral-ai-prompt',
    title: 'Krishna behind me viral ai prompt',
    promptText: 'Turn this prompt into a profession. Same face Same outfit 101% face don’t change: ultrawide. Upper-angle low-angle shot young man. Change this background: Add a green tree behind the boy And Add realistic flowers to the tree and drop them down as well. seat this boy under the tree in a stylish pose And add grass all around this boy; it needs to look realistic. And add Krishna’s flute and peacock feather under the tree. And add 4k Little Krishna 3D behind the boy, in the ‘Jubilee’ style. Little Krishna is watching me from behind the tree. Add a pose like that. Increase quality: Instagrammable 4:5 ratio.',
    imageUrl: 'https://pub-7c47bf4b49e24e8a984db081699eedb0.r2.dev/prompts/1783234589188-13e6388c-1ca0-4d66-bc17-ccbaa290ae88.png',
    userName: '@promtseen',
    likes: 95,
    views: 423,
    uses: 61,
    keywords: ['vaporwave', 'sunset', 'retro', 'synthwave'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seoScore: 90
  },
  {
    id: 'viral-horror-ai-photo-editing-prompt-seen',
    title: 'Viral Horror ai photo editing prompt seen',
    promptText:' Behind him stands a terrifying Grim Reaper dressed in a dark black hooded cloak, featuring a haunting skull face and carrying a massive sharp scythe. The eerie Reaper casually rests one arm over the man’s shoulder, creating a powerful and cinematic dark fantasy atmosphere.',
    imageUrl: 'https://pub-7c47bf4b49e24e8a984db081699eedb0.r2.dev/prompts/1781335298758-cf1acdc4-d69f-4f57-a71a-c235ded98c28.png',
    userName: '@promtseen',
    likes: 142,
    views: 687,
    uses: 89,
    keywords: ['horror', 'editing', 'prompt', 'ai'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seoScore: 94
  },
  {
    id: 'loard-krishna-ai-prompt-for-girls-to-create-quote',
    title: 'Loard krishna ai prompt for girls to create quote',
    promptText: 'Ultra-realistic cinematic portrait of a young South Asian woman standing beside a giant blue Lord Krishna mural, eyes closed, holding a wooden flute, wearing an oversized navy-blue trendy short kurti with light-wash jeans, warm golden sunset backlight, ethereal glow, dark textured wall, spiritual devotional vibe, grainy 90s film aesthetic, realistic street photography, elegant Hindi typography on left side saying — “श्रीकृष्ण कहते हैं — धैर्य रखो, सही समय पर सब सुंदर होगा।”',
    imageUrl: 'https://pub-7c47bf4b49e24e8a984db081699eedb0.r2.dev/prompts/1781163901862-9c7e3e0f-545f-409d-bff6-607dc04e8d58.png',
    userName: '@promtseen',
    likes: 83,
    views: 371,
    uses: 54,
    keywords: ['loard', 'krishna', 'quote', 'trending'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seoScore: 89
  },
  {
    id: 'couple-viral-ai-photo-editing-prompt',
    title: 'Couple viral ai photo editing prompt',
    promptText: 'A happy young couple a man and a woman, wearing matching light purple hoodies, embracing and looking at each other with smiles. The man has a beard and short dark hair, and the woman has long dark hair. The background is softly blurred with warm, bokeh lights in the shape of hearts. The mans hoodie has a cartoon drawing of a boy holding a heart with the text Mine Forever" below it. The womans hoodie has a cartoon drawing of a girl holding a heart with the text Inm yours below it. The lighting is soft and romantic. Dont change the face make sure the face is the same.',
    imageUrl: 'https://pub-7c47bf4b49e24e8a984db081699eedb0.r2.dev/prompts/1779179389001-8bd4d925-8de2-4222-aea6-2e40e1cbc433.png',
    userName: '@promtseen',
    likes: 127,
    views: 598,
    uses: 81,
    keywords: ['editing', 'couple', 'fantasy', 'prompt'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seoScore: 93
  },
  {
    id: 'romantic-couple-beach-ai-photo-editing-prompt',
    title: 'Romantic couple beach ai photo editing prompt',
    promptText: 'A romantic beach couple photoshoot with a creative double-exposure effect. The background shows a close-up of the couple lovingly embracing, faces touching, smiling softly with deep affection. The man has a neatly trimmed beard and short hair, wearing a light reddish-orange patterned casual shirt, while the woman has long dark hair tied back in a ponytail, wearing a colorful floral top in shades of pink, red, and white. In the lower part of the composition, the couple is walking barefoot along the sandy beach, holding their shoes in their hands, walking arm in arm, gazing at each other with joy. The atmosphere is natural, bright, and romantic with a soft pastel sky and calm seaside vibes. The style is cinematic, dreamy, and vibrant, emphasizing intimacy, togetherness, and the beauty of love.',
    imageUrl: 'https://pub-7c47bf4b49e24e8a984db081699eedb0.r2.dev/prompts/1776841270645-872601a1-3394-4754-9ca3-2e06b6a7ddd5.png',
    userName: '@promtseen',
    likes: 76,
    views: 334,
    uses: 46,
    keywords: ['couple', 'romantic', 'trending', 'prompt'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seoScore: 88
  },
  {
    id: 'floating-islands',
    title: 'Floating Islands',
    promptText: 'Series of floating islands connected by rope bridges, waterfalls cascading into the void, lush vegetation, small villages, sunset clouds below, fantasy concept art, epic scale',
    imageUrl: 'https://picsum.photos/seed/floatingislands/800/600',
    userName: '@promtseen',
    likes: 108,
    views: 487,
    uses: 68,
    keywords: ['floating islands', 'fantasy', 'waterfall', 'concept'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seoScore: 91
  },
  {
    id: 'mahadev-ai-prompt-to-create-viral-wall-painting',
    title: 'Mahadev ai prompt to create viral wall painting',
    promptText: 'A cinematic, full-length portrait of a young South Asian woman with closed eyes and crossed, wearing an oversized white button-down shirt and light-wash wide-leg jeans, leaning against a dark textured wall next to a massive, serene blue mural of Lord Shivas face, illuminated by a dramatic, glowing backlight that creates an ethereal halo effect with a warm, grainy 90s film aesthetic.',
    imageUrl: 'https://pub-7c47bf4b49e24e8a984db081699eedb0.r2.dev/prompts/1780041854702-2c8b1ded-6646-43bd-abf3-732953d80445.png',
    userName: '@promtseen',
    likes: 69,
    views: 302,
    uses: 42,
    keywords: ['alien', 'market', 'sci-fi', 'planet'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seoScore: 86
  },
  {
    id: 'viral-chibi-style-ai-photo-editing-prompts',
    title: 'viral Chibi Style ai photo editing prompts',
    promptText: 'Use a real face as reference. Same background. Bright soft lighting with candy-color highlights. Surround with mini 3D chibi versions holding lollipops, candies, drinks, making playful expressions. Add doodles like candy shapes, stars, swirls, cute icons. Include handwritten text like “sweet,” “fun,” “yay,” “cute mood.” Style: vibrant pastel palette, glossy chibi texture, playful Korean Instagram vibe, clean layout, 4:5 ratio.',
    imageUrl: 'https://pub-7c47bf4b49e24e8a984db081699eedb0.r2.dev/prompts/1778137334096-f13bc557-b889-4ffa-aedf-343fbcb7fada.png',
    userName: '@promtseen',
    likes: 85,
    views: 378,
    uses: 51,
    keywords: ['trending', 'chibi', 'viral', 'prompt'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seoScore: 89
  },
  {
    id: 'car-ai-prompt-to-create-instagram-story',
    title: 'Car ai prompt to create instagram story ',
    promptText: 'Ultra-realistic editorial close-up portrait. A young man (use uploaded image for face reference) wearing a light-pink suit jacket, black inner shirt, white tailored pants, and white sneakers, relaxed on the hood of a glossy Lamborghini. Right hand lightly touches the blazers lapel, smiling with a romantic gaze. Waist-up framing. Tall pink-magenta wildflowers blur in dreamy bokeh in the foreground; a golden-hour garden with green foliage behind the car. Soft sunlight, cinematic depth. 8K HDR, natural and luxurious.',
    imageUrl: 'https://pub-7c47bf4b49e24e8a984db081699eedb0.r2.dev/prompts/1779179138983-96de53e0-c1e5-4c5a-9f6f-f890f960ed3e.png',
    userName: '@promtseen',
    likes: 62,
    views: 287,
    uses: 39,
    keywords: ['vintage', 'train', 'steam', 'autumn'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seoScore: 85
  },
  {
    id: 'promtseen-chibi-style-ai-photo-editing-prompt',
    title: 'promtseen chibi style ai photo editing prompt',
    promptText: 'Use a real face as reference. Keep original background. Warm soft lighting with a dreamy glow. Add multiple 3D chibi mini versions of the character interacting with floating transparent bubbles (inside bubbles: smiling, posing, waving). Add glossy reflections and light flares. Include white doodle elements like sparkles, tiny hearts, swirl lines, and bubble trails. Add aesthetic handwritten words like “dream,” “soft,” “glow,” “magic.” Style: pastel dreamy tones, glossy 3D chibi, soft blur highlights, clean Instagram aesthetic, 4:5 ratio.',
    imageUrl: 'https://pub-7c47bf4b49e24e8a984db081699eedb0.r2.dev/prompts/1778137407802-f4af87e6-844f-4790-921d-87e6020e7334.png',
    userName: '@promtseen',
    likes: 113,
    views: 512,
    uses: 71,
    keywords: ['chibi', 'style', 'prompt', 'trending'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seoScore: 92
  },
  {
    id: 'mother-day-ai-prompt',
    title: 'Mother day ai prompt to create special memories with mom',
    promptText: 'Create a realistic soft cinematic Mothers Day photo of me and my mother using our reference photos. Keep both faces exactly the same (do not change facial features).My mother is sitting comfortably on a sofa/chair wearing a beautiful elegant saree (pastel pink / mauve with golden embroidery).lam standing beside herwearing a royal blue traditional suitwith embroidered dupatta. Iam gentlyplacinga shiny queen crowm/tiara on my mothers head. We both are looking into each others eyes with love and a warm smile. Background should be dreamy and aesthetic with soft golden fairy lights, pastel flowers, and a beautiful Mothers Day vibe.Lighting should be warm, soft and natural with realistic skin texture.High quality DSLR look, soft glow, shallowdepth of field, bokeh effect, ultrarealistic, 4K.',
    imageUrl: 'https://pub-7c47bf4b49e24e8a984db081699eedb0.r2.dev/prompts/1778400372917-c1464934-c149-456b-8f58-717cefff23e4.png',
    userName: '@promtseen',
    likes: 97,
    views: 445,
    uses: 63,
    keywords: ['fairy', 'ethereal', 'wings', 'magical'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seoScore: 90
  }
];

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Prompt Seen API',
    mode: db ? 'production' : 'development'
  });
});

// Dynamic Robots.txt
app.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.BASE_URL || `https://${req.get('host')}`;

  const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /private/
Disallow: /api/

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/sitemap-posts.xml

# Crawl delay (optional)
Crawl-delay: 1

# Allow bots for SEO pages
User-agent: Googlebot
Allow: /prompt/
Allow: /category/
Crawl-delay: 2

User-agent: Bingbot
Allow: /prompt/
Allow: /category/
Crawl-delay: 2

User-agent: Twitterbot
Allow: /prompt/
Allow: /category/
Crawl-delay: 1

# Block AI scrapers (optional)
User-agent: ChatGPT-User
Disallow: /

User-agent: GPTBot
Disallow: /

User-agent: CCBot
Disallow: /`;

  res.set('Content-Type', 'text/plain');
  res.send(robotsTxt);
});

// Dynamic Sitemap Index
app.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = process.env.BASE_URL || `https://${req.get('host')}`;

    const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap-pages.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-posts.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
</sitemapindex>`;

    res.set('Content-Type', 'application/xml');
    res.send(sitemapIndex);

  } catch (error) {
    console.error('❌ Sitemap index error:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Pages Sitemap (static pages)
app.get('/sitemap-pages.xml', async (req, res) => {
  try {
    const baseUrl = process.env.BASE_URL || `https://${req.get('host')}`;

    const pages = [
      {
        loc: baseUrl + '/',
        lastmod: new Date().toISOString(),
        changefreq: 'daily',
        priority: '1.0'
      },
      {
        loc: baseUrl + '/index.html',
        lastmod: new Date().toISOString(),
        changefreq: 'daily',
        priority: '1.0'
      },
      {
        loc: 'https://www.promptseen.co/promptconverter.html',
        lastmod: new Date().toISOString(),
        changefreq: 'weekly',
        priority: '0.8'
      },
      {
        loc: 'https://www.promptseen.co/howitworks.html',
        lastmod: new Date().toISOString(),
        changefreq: 'weekly',
        priority: '0.8'
      },
      {
        loc: 'https://promptseen.co/login.html',
        lastmod: new Date().toISOString(),
        changefreq: 'monthly',
        priority: '0.5'
      }
    ];

    const sitemap = SitemapGenerator.generateSitemap(pages);
    res.set('Content-Type', 'application/xml');
    res.send(sitemap);

  } catch (error) {
    console.error('❌ Pages sitemap error:', error);
    res.status(500).send('Error generating pages sitemap');
  }
});

// Posts Sitemap (dynamic prompts)
app.get('/sitemap-posts.xml', async (req, res) => {
  try {
    const baseUrl = process.env.BASE_URL || `https://${req.get('host')}`;
    let prompts = [];

    if (db) {
      // Production mode - fetch from Firestore
      const snapshot = await db.collection('uploads')
        .orderBy('updatedAt', 'desc')
        .limit(1000) // Limit to 1000 latest prompts for sitemap
        .get();

      prompts = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
        };
      });
    } else {
      // Development mode - use mock data
      prompts = mockPrompts;
    }

    const urls = prompts.map(prompt => ({
      loc: `${baseUrl}/prompt/${prompt.id}`,
      lastmod: prompt.updatedAt || prompt.createdAt || new Date().toISOString(),
      changefreq: 'weekly',
      priority: '0.8'
    }));

    // Add category pages
    const categories = ['art', 'photography', 'design', 'writing', 'other'];
    categories.forEach(category => {
      urls.push({
        loc: `${baseUrl}/category/${category}`,
        lastmod: new Date().toISOString(),
        changefreq: 'weekly',
        priority: '0.6'
      });
    });

    const sitemap = SitemapGenerator.generateSitemap(urls);
    res.set('Content-Type', 'application/xml');
    res.send(sitemap);

  } catch (error) {
    console.error('❌ Posts sitemap error:', error);
    // Fallback to basic sitemap with just pages
    const baseUrl = process.env.BASE_URL || `https://${req.get('host')}`;
    const fallbackUrls = [
      {
        loc: baseUrl + '/',
        lastmod: new Date().toISOString(),
        changefreq: 'daily',
        priority: '1.0'
      }
    ];
    const sitemap = SitemapGenerator.generateSitemap(fallbackUrls);
    res.set('Content-Type', 'application/xml');
    res.send(sitemap);
  }
});

// Upload endpoint
app.post('/api/upload', async (req, res) => {
  console.log('📤 Upload request received');

  // Handle file upload with Busboy
  const busboy = Busboy({ headers: req.headers });
  const fields = {};
  let fileBuffer = null;
  let fileName = null;
  let fileType = null;

  busboy.on('field', (fieldname, val) => {
    fields[fieldname] = val;
    console.log(`📝 Field ${fieldname}: ${val.substring(0, 50)}...`);
  });

  busboy.on('file', (fieldname, file, info) => {
    if (fieldname !== 'image') {
      return res.status(400).json({ error: 'Only image files are allowed' });
    }

    const { filename, encoding, mimeType } = info;
    console.log(`📁 File upload: ${filename}, type: ${mimeType}`);

    fileName = filename;
    fileType = mimeType;

    const chunks = [];
    file.on('data', (data) => {
      chunks.push(data);
    });

    file.on('end', () => {
      fileBuffer = Buffer.concat(chunks);

      // Validate file size (5MB limit)
      if (fileBuffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'File size exceeds 5MB limit' });
      }
    });
  });

  busboy.on('finish', async () => {
    try {
      // Validate required fields
      if (!fields.title || !fields.promptText) {
        return res.status(400).json({ error: 'Title and prompt text are required' });
      }

      if (!fileBuffer) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(fileType)) {
        return res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed' });
      }

      let imageUrl;
      let uploadResult;

      if (bucket) {
        // Production mode - upload to Firebase Storage
        const fileExtension = fileName.split('.').pop();
        const newFileName = `prompts/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
        const file = bucket.file(newFileName);

        await file.save(fileBuffer, {
          metadata: {
            contentType: fileType,
            metadata: {
              uploadedBy: fields.userId || 'anonymous',
              uploadedAt: new Date().toISOString()
            }
          }
        });

        // Make the file publicly accessible
        await file.makePublic();
        imageUrl = `https://storage.googleapis.com/${bucket.name}/${newFileName}`;

        console.log('✅ Image uploaded to Firebase Storage:', imageUrl);
      } else {
        // Development mode - use placeholder
        imageUrl = 'https://via.placeholder.com/800x400/4e54c8/white?text=Uploaded+Image';
        console.log('🎭 Development mode: Using placeholder image');
      }

      // Generate SEO metadata
      const seoTitle = SEOOptimizer.generateSEOTitle(fields.title);
      const metaDescription = SEOOptimizer.generateMetaDescription(fields.promptText, fields.title);
      const keywords = SEOOptimizer.extractKeywords(fields.title + ' ' + fields.promptText);
      const slug = SEOOptimizer.generateSlug(fields.title);

      // Create prompt data
      const promptData = {
        title: fields.title,
        promptText: fields.promptText,
        imageUrl: imageUrl,
        category: fields.category || 'general',
        userName: fields.userName || 'Anonymous User',
        likes: 0,
        views: 0,
        uses: 0,
        keywords: keywords,
        seoTitle: seoTitle,
        metaDescription: metaDescription,
        slug: slug,
        seoScore: Math.floor(Math.random() * 30) + 70, // Random score between 70-100
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      let docRef;

      if (db) {
        // Production mode - save to Firestore
        docRef = await db.collection('uploads').add(promptData);
        console.log('✅ Prompt saved to Firestore with ID:', docRef.id);

        // Update sitemap (in production, you might want to trigger a sitemap rebuild)
        console.log('🔍 Sitemap will be updated on next crawl');
      } else {
        // Development mode - generate mock ID
        docRef = { id: 'demo-' + Date.now() };
        console.log('🎭 Development mode: Mock prompt created with ID:', docRef.id);
      }

      // Add ID and URL to response
      const responseData = {
        id: docRef.id,
        ...promptData,
        promptUrl: `/prompt/${docRef.id}`
      };

      res.json({
        success: true,
        upload: responseData,
        message: 'Upload successful! Your creation is now live.'
      });

    } catch (error) {
      console.error('❌ Upload error:', error);
      res.status(500).json({
        error: 'Upload failed',
        details: error.message,
        mode: db ? 'production' : 'development'
      });
    }
  });

  busboy.on('error', (error) => {
    console.error('❌ Busboy error:', error);
    res.status(500).json({ error: 'File upload processing failed' });
  });

  // Pipe the request to busboy
  req.pipe(busboy);
});

// API Routes
app.get('/api/uploads', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 12;

    if (db) {
      // Production mode with Firestore
      const offset = (page - 1) * limit;
      const snapshot = await db.collection('uploads')
        .orderBy('createdAt', 'desc')
        .offset(offset)
        .limit(limit)
        .get();

      const uploads = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        uploads.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          promptUrl: `/prompt/${doc.id}`          // full-page link
        });
      });

      const countSnapshot = await db.collection('uploads').count().get();
      const totalCount = countSnapshot.data().count;
      const totalPages = Math.ceil(totalCount / limit);

      res.json({ uploads, currentPage: page, totalPages, totalCount });
    } else {
      // Development mode with mock data
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      // 👇 every demo prompt now carries its own /prompt/:id URL
      const uploads = mockPrompts.slice(startIndex, endIndex).map(p => ({
        ...p,
        promptUrl: `/prompt/${p.id}`
      }));

      res.json({
        uploads,
        currentPage: page,
        totalPages: Math.ceil(mockPrompts.length / limit),
        totalCount: mockPrompts.length
      });
    }
  } catch (error) {
    console.error('Error fetching uploads:', error);
    // Fallback to mock data – also with promptUrl
    res.json({
      uploads: mockPrompts.map(p => ({ ...p, promptUrl: `/prompt/${p.id}` })),
      currentPage: 1,
      totalPages: 1,
      totalCount: mockPrompts.length
    });
  }
});

// Individual prompt pages for SEO + full display of every demo prompt
app.get('/prompt/:id', async (req, res) => {
  try {
    const promptId = req.params.id;
    console.log(`📄 Serving prompt page for ID: ${promptId}`);

    // 1) Demo prompts resolve first – works in both dev AND production mode,
    //    so every showcase card's "Explore" link always opens a full page.
    const mockPrompt = mockPrompts.find(p => p.id === promptId);

    if (mockPrompt) {
      // bump the in-memory view counter (resets on server restart)
      mockPrompt.views = (mockPrompt.views || 0) + 1;
      return res.send(generatePromptHTML(createPromptData(mockPrompt, promptId)));
    }

    // 2) Production: look up user uploads in Firestore
    if (db) {
      const doc = await db.collection('uploads').doc(promptId).get();
      if (!doc.exists) return sendPromptNotFound(res, promptId);
      return res.send(generatePromptHTML(createPromptData(doc.data(), doc.id)));
    }

    // 3) Nothing found → proper 404 (no more silently showing demo-1)
    return sendPromptNotFound(res, promptId);

  } catch (error) {
    console.error('❌ Error serving prompt page:', error);
    sendErrorPage(res, error);
  }
});

// Category pages for SEO
app.get('/category/:category', async (req, res) => {
  try {
    const category = req.params.category;
    const baseUrl = process.env.BASE_URL || `https://${req.get('host')}`;

    const html = generateCategoryHTML(category, baseUrl);
    res.set('Content-Type', 'text/html');
    res.send(html);

  } catch (error) {
    console.error('❌ Error serving category page:', error);
    sendErrorPage(res, error);
  }
});

// Helper function to generate category page HTML
function generateCategoryHTML(category, baseUrl) {
  const categoryNames = {
    'art': 'AI Art',
    'photography': 'AI Photography',
    'design': 'AI Design',
    'writing': 'AI Writing',
    'other': 'Other AI Creations'
  };

  const categoryName = categoryNames[category] || 'AI Prompts';
  const description = `Explore ${categoryName} prompts and AI-generated content. Discover the best prompt engineering techniques for ${categoryName.toLowerCase()}.`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${categoryName} Prompts - Prompt Seen</title>
    <meta name="description" content="${description}">
    <meta name="robots" content="index, follow">

    <!-- Open Graph -->
    <meta property="og:title" content="${categoryName} Prompts - Prompt Seen">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${baseUrl}/category/${category}">

    <!-- JSON-LD Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "${categoryName} Prompts",
      "description": "${description}",
      "url": "${baseUrl}/category/${category}",
      "mainEntity": {
        "@type": "ItemList",
        "name": "${categoryName} AI Prompts"
      }
    }
    </script>

    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 40px; background: #f5f7fa; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); text-align: center; }
        h1 { color: #4e54c8; margin-bottom: 20px; }
        p { color: #666; line-height: 1.6; margin-bottom: 30px; }
        .back-link { color: #4e54c8; text-decoration: none; padding: 12px 25px; border: 2px solid #4e54c8; border-radius: 30px; display: inline-block; }
        .back-link:hover { background: #4e54c8; color: white; }
    </style>
</head>
<body>
    <div class="container">
        <h1>${categoryName} Prompts</h1>
        <p>${description}</p>
        <p>This category page is automatically generated for SEO purposes. The actual ${categoryName.toLowerCase()} content is available on our main showcase page.</p>
        <a href="/" class="back-link">← Back to Prompt Showcase</a>
    </div>
</body>
</html>`;
}

// Helper function to create prompt data
function createPromptData(prompt, id) {
  return {
    id: id,
    title: prompt.title || 'Untitled Prompt',
    seoTitle: prompt.seoTitle || prompt.title || 'AI Prompt - Prompt Seen',
    metaDescription: prompt.metaDescription || (prompt.promptText ?
      prompt.promptText.substring(0, 155) + '...' :
      'Explore this AI-generated image and learn prompt engineering techniques.'),
    imageUrl: prompt.imageUrl || 'https://via.placeholder.com/800x400/4e54c8/white?text=Prompt+Seen+AI+Image',
    promptText: prompt.promptText || 'No prompt text available.',
    userName: prompt.userName || 'Anonymous',
    likes: prompt.likes || 0,
    views: prompt.views || 0,
    uses: prompt.uses || 0,
    keywords: prompt.keywords || ['AI', 'prompt', 'image generation'],
    createdAt: prompt.createdAt ?
      (typeof prompt.createdAt === 'string' ? prompt.createdAt : prompt.createdAt.toISOString()) :
      new Date().toISOString(),
    seoScore: prompt.seoScore || 0
  };
}

// Escape user-controlled strings before embedding into HTML
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Helper function to generate the full prompt detail HTML
function generatePromptHTML(promptData) {
  const safeTitle       = escapeHtml(promptData.title);
  const safeSeoTitle    = escapeHtml(promptData.seoTitle);
  const safeDescription = escapeHtml(promptData.metaDescription);
  const safeImage       = escapeHtml(promptData.imageUrl);
  const safeUser        = escapeHtml(promptData.userName);
  const safePrompt      = escapeHtml(promptData.promptText);

  const keywordChips = (promptData.keywords || [])
    .map(k => `<span class="keyword-chip">${escapeHtml(k)}</span>`)
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeSeoTitle}</title>
    <meta name="description" content="${safeDescription}">
    <meta name="keywords" content="${(promptData.keywords || []).map(escapeHtml).join(', ')}">
    <meta name="robots" content="index, follow, max-image-preview:large">

    <!-- Open Graph -->
    <meta property="og:title" content="${safeSeoTitle}">
    <meta property="og:description" content="${safeDescription}">
    <meta property="og:image" content="${safeImage}">
    <meta property="og:url" content="https://promtseen.com/prompt/${escapeHtml(promptData.id)}">
    <meta property="og:type" content="article">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeSeoTitle}">
    <meta name="twitter:description" content="${safeDescription}">
    <meta name="twitter:image" content="${safeImage}">

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background: #f5f7fa; line-height: 1.6; color: #2d334a; padding: 20px; }
        .container { max-width: 860px; margin: 0 auto; background: white; padding: 30px; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
        .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
        .brand { font-weight: 700; color: #4e54c8; font-size: 1.1rem; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; }
        h1 { color: #4e54c8; margin-bottom: 20px; font-size: 2rem; line-height: 1.3; }
        .user-info { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; color: #666; font-size: 0.9rem; flex-wrap: wrap; }
        .prompt-image { width: 100%; max-height: 520px; object-fit: contain; border-radius: 10px; margin-bottom: 20px; background: #f0f4f8; transition: opacity .5s ease; }
        .prompt-content { background: #f8f9fa; padding: 25px; border-radius: 10px; margin: 20px 0; }
        .prompt-content h2 { margin-bottom: 15px; color: #2d334a; font-size: 1.4rem; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
        .prompt-text { white-space: pre-wrap; word-break: break-word; font-family: 'Courier New', monospace; background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #4e54c8; font-size: 1rem; line-height: 1.6; }
        .copy-btn { background: #4e54c8; color: #fff; border: none; padding: 9px 16px; border-radius: 30px; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: background .2s ease; }
        .copy-btn:hover { background: #3d43b0; }
        .prompt-meta { display: flex; gap: 30px; margin: 25px 0; padding: 20px; background: #f8f9fa; border-radius: 10px; flex-wrap: wrap; }
        .meta-item { display: flex; align-items: center; gap: 8px; }
        .meta-item strong { color: #4e54c8; font-weight: 600; }
        .keywords { margin: 10px 0 0; display: flex; flex-wrap: wrap; gap: 8px; }
        .keyword-chip { background: #eceeff; color: #4e54c8; padding: 5px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
        .back-link { display: inline-flex; align-items: center; gap: 8px; margin-top: 20px; color: #4e54c8; text-decoration: none; padding: 12px 25px; border: 2px solid #4e54c8; border-radius: 30px; transition: all 0.3s ease; font-weight: 600; }
        .back-link:hover { background: #4e54c8; color: white; transform: translateY(-2px); }
        .seo-score { display: inline-block; padding: 5px 12px; background: #20bf6b; color: white; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
        @media (max-width: 768px) {
            body { padding: 10px; }
            .container { padding: 20px; }
            h1 { font-size: 1.5rem; }
            .prompt-meta { flex-direction: column; gap: 15px; padding: 15px; }
            .prompt-content { padding: 18px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="topbar">
            <a href="/" class="brand"><i class="fas fa-wand-magic-sparkles"></i> Promt Seen</a>
            ${promptData.seoScore ? `<span class="seo-score">Prompt Seen score: ${promptData.seoScore}/100</span>` : ''}
        </div>

        <div class="user-info">
            <i class="fas fa-user-circle"></i>
            <span>Created by: ${safeUser}</span>
        </div>

        <h1>${safeTitle}</h1>

        <img src="${safeImage}"
             alt="${safeTitle} - AI Generated Image"
             class="prompt-image"
             onerror="this.src='https://via.placeholder.com/800x400/4e54c8/white?text=Image+Not+Available'"
             id="promptImage">

        <div class="prompt-content">
            <h2>
                <span><i class="fas fa-magic"></i> Full Prompt</span>
                <button class="copy-btn" id="copyBtn" onclick="copyPrompt()">
                    <i class="fas fa-copy"></i> Copy Prompt
                </button>
            </h2>
            <div class="prompt-text" id="promptText">${safePrompt}</div>
            <div class="keywords">${keywordChips}</div>
        </div>

        <div class="prompt-meta">
            <div class="meta-item"><i class="fas fa-heart" style="color:#ff6b6b;"></i><strong>Likes:</strong> ${promptData.likes}</div>
            <div class="meta-item"><i class="fas fa-eye" style="color:#4e54c8;"></i><strong>Views:</strong> ${promptData.views}</div>
            <div class="meta-item"><i class="fas fa-download" style="color:#20bf6b;"></i><strong>Uses:</strong> ${promptData.uses}</div>
            <div class="meta-item"><i class="fas fa-calendar" style="color:#8f94fb;"></i><strong>Created:</strong> ${new Date(promptData.createdAt).toLocaleDateString()}</div>
        </div>

        <a href="/" class="back-link"><i class="fas fa-arrow-left"></i> Back to Prompt Showcase</a>
    </div>

    <script>
        function copyPrompt() {
            const text = document.getElementById('promptText').innerText;
            const btn = document.getElementById('copyBtn');
            const done = function () {
                btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(function () { btn.innerHTML = '<i class="fas fa-copy"></i> Copy Prompt'; }, 2000);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(done).catch(done);
            } else {
                const ta = document.createElement('textarea');
                ta.value = text; document.body.appendChild(ta); ta.select();
                try { document.execCommand('copy'); } catch (e) {}
                document.body.removeChild(ta); done();
            }
        }

        // Fade-in the image once loaded
        document.addEventListener('DOMContentLoaded', function () {
            const img = document.getElementById('promptImage');
            if (!img) return;
            img.style.opacity = '0';
            if (img.complete && img.naturalHeight !== 0) { img.style.opacity = '1'; }
            else { img.onload = function () { this.style.opacity = '1'; }; }
        });
    </script>
</body>
</html>`;
}

// Helper function for 404 page
function sendPromptNotFound(res, promptId) {
  res.status(404).send(`
<!DOCTYPE html>
<html>
<head>
    <title>Prompt Not Found - Prompt Seen</title>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 40px; background: #f5f7fa; text-align: center; }
        .container { max-width: 600px; margin: 50px auto; background: white; padding: 40px; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
        h1 { color: #ff6b6b; margin-bottom: 20px; }
        a { color: #4e54c8; text-decoration: none; padding: 12px 25px; border: 2px solid #4e54c8; border-radius: 30px; display: inline-block; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Prompt Not Found</h1>
        <p>The prompt you're looking for doesn't exist or may have been removed.</p>
        <p><small>Prompt ID: ${promptId}</small></p>
        <a href="/">← Return to Prompt Seen</a>
    </div>
</body>
</html>`);
}

// Helper function for error page
function sendErrorPage(res, error) {
  res.status(500).send(`
<!DOCTYPE html>
<html>
<head>
    <title>Error - Prompt Seen</title>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 40px; background: #f5f7fa; text-align: center; }
        .container { max-width: 600px; margin: 50px auto; background: white; padding: 40px; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
        h1 { color: #ff6b6b; margin-bottom: 20px; }
        a { color: #4e54c8; text-decoration: none; padding: 12px 25px; border: 2px solid #4e54c8; border-radius: 30px; display: inline-block; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Error Loading Prompt</h1>
        <p>There was an error loading this prompt. Please try again later.</p>
        <a href="/">← Return to Home</a>
    </div>
</body>
</html>`);
}

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Simple 404 handler
app.use((req, res) => {
  res.status(404).send(`
    <html>
      <head><title>Page Not Found</title></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1>Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <a href="/">Return to Home</a>
      </body>
    </html>
  `);
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Base URL: http://localhost:${port}`);
  console.log(`🔗 Prompt routes: http://localhost:${port}/prompt/:id`);
  console.log(`📤 Upload endpoint: http://localhost:${port}/api/upload`);
  console.log(`🗺️  Sitemap: http://localhost:${port}/sitemap.xml`);
  console.log(`🤖 Robots.txt: http://localhost:${port}/robots.txt`);
  console.log(`❤️  Health check: http://localhost:${port}/health`);

  if (!db) {
    console.log(`🎭 Running in DEVELOPMENT mode with mock data`);
    console.log(`📝 Sample prompts:`);
    mockPrompts.forEach(prompt => {
      console.log(`   → http://localhost:${port}/prompt/${prompt.id}`);
    });
  }
});