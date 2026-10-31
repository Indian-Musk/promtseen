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
        "@id": `https://home.promptseen.co/prompt/${prompt.id}`
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
    id: 'demo-1',
    title: 'Fantasy Landscape with Mountains',
    promptText: 'Create a fantasy landscape with majestic mountains, floating islands, and a mystical waterfall, digital art, highly detailed, epic composition',
    imageUrl: 'https://via.placeholder.com/800x400/4e54c8/white?text=Fantasy+Landscape',
    userName: 'Demo User',
    likes: 42,
    views: 156,
    uses: 23,
    keywords: ['fantasy', 'landscape', 'mountains', 'digital art'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seoScore: 85
  },
  {
    id: 'demo-2',
    title: 'Cyberpunk City Street',
    promptText: 'Cyberpunk city street at night, neon signs, rainy pavement, futuristic vehicles, Blade Runner style, cinematic lighting',
    imageUrl: 'https://via.placeholder.com/800x400/8f94fb/white?text=Cyberpunk+City',
    userName: 'Demo User',
    likes: 67,
    views: 289,
    uses: 45,
    keywords: ['cyberpunk', 'city', 'neon', 'futuristic'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seoScore: 92
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
          promptUrl: `/prompt/${doc.id}`
        });
      });

      const countSnapshot = await db.collection('uploads').count().get();
      const totalCount = countSnapshot.data().count;
      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        uploads,
        currentPage: page,
        totalPages,
        totalCount
      });
    } else {
      // Development mode with mock data
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const uploads = mockPrompts.slice(startIndex, endIndex);
      
      res.json({
        uploads,
        currentPage: page,
        totalPages: Math.ceil(mockPrompts.length / limit),
        totalCount: mockPrompts.length
      });
    }
  } catch (error) {
    console.error('Error fetching uploads:', error);
    // Fallback to mock data
    res.json({
      uploads: mockPrompts,
      currentPage: 1,
      totalPages: 1,
      totalCount: mockPrompts.length
    });
  }
});

// Individual prompt pages for SEO
app.get('/prompt/:id', async (req, res) => {
  try {
    const promptId = req.params.id;
    console.log(`📄 Serving prompt page for ID: ${promptId}`);
    
    let promptData;

    if (db && promptId !== 'demo-1' && promptId !== 'demo-2') {
      // Production mode - fetch from Firestore
      const doc = await db.collection('uploads').doc(promptId).get();
      
      if (!doc.exists) {
        return sendPromptNotFound(res, promptId);
      }

      const prompt = doc.data();
      promptData = createPromptData(prompt, doc.id);
    } else {
      // Development mode - use mock data
      const mockPrompt = mockPrompts.find(p => p.id === promptId) || mockPrompts[0];
      promptData = createPromptData(mockPrompt, promptId);
    }

    const html = generatePromptHTML(promptData);
    res.set('Content-Type', 'text/html');
    res.send(html);

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

// Helper function to generate prompt HTML
function generatePromptHTML(promptData) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${promptData.seoTitle}</title>
    <meta name="description" content="${promptData.metaDescription}">
    <meta name="keywords" content="${promptData.keywords.join(', ')}">
    <meta name="robots" content="index, follow, max-image-preview:large">
    
    <!-- Open Graph -->
    <meta property="og:title" content="${promptData.seoTitle}">
    <meta property="og:description" content="${promptData.metaDescription}">
    <meta property="og:image" content="${promptData.imageUrl}">
    <meta property="og:url" content="https://home.promptseen.co/prompt/${promptData.id}">
    <meta property="og:type" content="article">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${promptData.seoTitle}">
    <meta name="twitter:description" content="${promptData.metaDescription}">
    <meta name="twitter:image" content="${promptData.imageUrl}">
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f7fa; line-height: 1.6; color: #2d334a; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
        h1 { color: #4e54c8; margin-bottom: 20px; font-size: 2rem; line-height: 1.3; }
        .user-info { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; color: #666; font-size: 0.9rem; }
        .prompt-image { width: 100%; height: 400px; object-fit: cover; border-radius: 10px; margin-bottom: 20px; background: #f0f4f8; }
        .prompt-content { background: #f8f9fa; padding: 25px; border-radius: 10px; margin: 20px 0; }
        .prompt-content h2 { margin-bottom: 15px; color: #2d334a; font-size: 1.4rem; }
        .prompt-text { white-space: pre-wrap; font-family: 'Courier New', monospace; background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #4e54c8; font-size: 1rem; line-height: 1.5; }
        .prompt-meta { display: flex; gap: 30px; margin: 25px 0; padding: 20px; background: #f8f9fa; border-radius: 10px; flex-wrap: wrap; }
        .meta-item { display: flex; align-items: center; gap: 8px; }
        .meta-item strong { color: #4e54c8; font-weight: 600; }
        .back-link { display: inline-flex; align-items: center; gap: 8px; margin-top: 20px; color: #4e54c8; text-decoration: none; padding: 12px 25px; border: 2px solid #4e54c8; border-radius: 30px; transition: all 0.3s ease; font-weight: 600; }
        .back-link:hover { background: #4e54c8; color: white; transform: translateY(-2px); }
        .seo-score { display: inline-block; padding: 5px 12px; background: #20bf6b; color: white; border-radius: 20px; font-size: 0.8rem; font-weight: 600; margin-left: 10px; }
        @media (max-width: 768px) {
            body { padding: 10px; }
            .container { padding: 20px; }
            h1 { font-size: 1.5rem; }
            .prompt-image { height: 300px; }
            .prompt-meta { flex-direction: column; gap: 15px; padding: 15px; }
            .prompt-content { padding: 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="user-info">
            <i class="fas fa-user-circle"></i>
            <span>Created by: ${promptData.userName}</span>
            ${promptData.seoScore ? `<span class="seo-score">Prompt seen: ${promptData.seoScore}/100</span>` : ''}
        </div>
        
        <h1>${promptData.title}</h1>
        
        <img src="${promptData.imageUrl}" 
             alt="${promptData.title} - AI Generated Image" 
             class="prompt-image"
             onerror="this.src='https://via.placeholder.com/800x400/4e54c8/white?text=Image+Not+Available'"
             id="promptImage">
        
        <div class="prompt-content">
            <h2><i class="fas fa-magic"></i> Prompt Used:</h2>
            <div class="prompt-text">${promptData.promptText}</div>
        </div>
        
        <div class="prompt-meta">
            <div class="meta-item">
                <i class="fas fa-heart" style="color: #ff6b6b;"></i>
                <strong>Likes:</strong> ${promptData.likes}
            </div>
            <div class="meta-item">
                <i class="fas fa-eye" style="color: #4e54c8;"></i>
                <strong>Views:</strong> ${promptData.views}
            </div>
            <div class="meta-item">
                <i class="fas fa-download" style="color: #20bf6b;"></i>
                <strong>Uses:</strong> ${promptData.uses}
            </div>
            <div class="meta-item">
                <i class="fas fa-calendar" style="color: #8f94fb;"></i>
                <strong>Created:</strong> ${new Date(promptData.createdAt).toLocaleDateString()}
            </div>
        </div>
        
        <a href="/" class="back-link">
            <i class="fas fa-arrow-left"></i> Back to Prompt Seen
        </a>
    </div>
    
    <script>
        // Image loading animation
        document.addEventListener('DOMContentLoaded', function() {
            const img = document.getElementById('promptImage');
            if (img) {
                if (img.complete && img.naturalHeight !== 0) {
                    img.style.opacity = '1';
                } else {
                    img.onload = function() {
                        this.style.opacity = '1';
                    };
                    img.style.transition = 'opacity 0.5s ease';
                    img.style.opacity = '0';
                }
            }
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