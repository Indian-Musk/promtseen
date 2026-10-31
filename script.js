// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyASLUfnN4lLtI4GqE9QK3JyWjh2HeS8wsE",
  authDomain: "promtseen-42a38.firebaseapp.com",
  projectId: "promtseen-42a38",
  storageBucket: "promtseen-42a38.firebasestorage.app",
  messagingSenderId: "620714446859",
  appId: "1:620714446859:web:019bb7a7e00248e3d6770e",
  measurementId: "G-PW4Z50GV4H"
};

// Track Firebase initialization state
let firebaseInitialized = false;

// Initialize Firebase
async function initializeFirebase() {
  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded');
    return false;
  }
  
  if (!firebaseInitialized && firebase.apps.length === 0) {
    try {
      firebase.initializeApp(firebaseConfig);
      firebaseInitialized = true;
      console.log('Firebase initialized successfully');
    } catch (error) {
      console.error('Firebase initialization error:', error);
    }
  }
  
  return firebaseInitialized;
}

// Get current user
async function getCurrentUser() {
  await initializeFirebase();
  
  return new Promise((resolve) => {
    const unsubscribe = firebase.auth().onAuthStateChanged(user => {
      unsubscribe();
      resolve(user);
    });
  });
}

// Authentication functions
function checkAuth() {
  return JSON.parse(localStorage.getItem('user'));
}

function showAuthElements() {
  const user = checkAuth();
  const authSection = document.getElementById('authSection');
  const uploadButton = document.getElementById('openUploadModal');
  
  if (authSection) {
    if (user) {
      authSection.innerHTML = `
        <div class="user-profile">
          <img src="${user.avatar || 'https://via.placeholder.com/36x36/4e54c8/white?text=U'}" 
               alt="${user.name}" 
               class="user-avatar"
             
onerror="this.replaceWith(Object.assign(document.createElement('div'), {className: 'avatar-fallback', textContent: 'U'}))"
          <span>${user.name}</span>
          <button class="logout-btn" title="Logout"><i class="fas fa-sign-out-alt"></i></button>
        </div>
      `;
      
      const logoutBtn = authSection.querySelector('.logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          try {
            await firebase.auth().signOut();
            localStorage.removeItem('user');
            window.location.reload();
          } catch (error) {
            console.error('Logout error:', error);
            localStorage.removeItem('user');
            window.location.reload();
          }
        });
      }
    } else {
      authSection.innerHTML = `
        <a href="login.html" class="login-btn">Login</a>
      `;
    }
  }
  
  if (uploadButton) {
    uploadButton.style.display = user ? 'flex' : 'none';
  }
}

// SEO Tracking and Optimization
class SEOTracker {
  static trackUserEngagement(promptId) {
    if (!promptId) return;
    
    let startTime = Date.now();
    let maxScroll = 0;
    
    // Track time spent
    window.addEventListener('beforeunload', () => {
      const timeSpent = Date.now() - startTime;
      if (timeSpent > 3000) {
        this.sendEngagementData(promptId, 'time_spent', timeSpent);
      }
    });
    
    // Track scroll depth
    window.addEventListener('scroll', () => {
      const scrollDepth = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      maxScroll = Math.max(maxScroll, scrollDepth);
    });
    
    window.addEventListener('beforeunload', () => {
      if (maxScroll > 25) {
        this.sendEngagementData(promptId, 'scroll_depth', maxScroll);
      }
    });
    
    // Track social shares
    this.trackSocialShares(promptId);
  }
  
  static trackSocialShares(promptId) {
    setTimeout(() => {
      document.querySelectorAll(`[data-prompt-id="${promptId}"] .share-btn`).forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const platform = btn.dataset.platform;
          this.sharePrompt(promptId, platform, btn.dataset.url);
        });
      });
    }, 1000);
  }
  
  static async sharePrompt(promptId, platform, url) {
    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=Check out this amazing AI prompt&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
    };
    
    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
      
      // Track the share
      await this.sendEngagementData(promptId, 'social_share', 1, platform);
    }
  }
  
  static async sendEngagementData(promptId, type, value, platform = null) {
    try {
      const data = { promptId, type, value };
      if (platform) data.platform = platform;
      
      const response = await fetch('/api/track-engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error tracking engagement:', error);
    }
  }
}

// Enhanced prompt card creation with SEO features
function createPromptCard(prompt) {
  const promptCard = document.createElement('div');
  promptCard.className = 'prompt-card';
  promptCard.id = `prompt-${prompt.id}`;
  promptCard.setAttribute('data-prompt-id', prompt.id);
  
  // Add schema.org microdata
  promptCard.setAttribute('itemscope', '');
  promptCard.setAttribute('itemtype', 'https://schema.org/CreativeWork');
  
  const promptUrl = prompt.promptUrl || `https://home.promptseen.co/prompt/${prompt.id}`;
  const imageUrl = prompt.imageUrl || 'https://via.placeholder.com/350x550/4e54c8/white?text=Prompt+Seen';
  
  promptCard.innerHTML = `
    <div class="prompt-image" style="background-image: url('${imageUrl}')" 
         itemprop="image" itemscope itemtype="https://schema.org/ImageObject">
      <meta itemprop="url" content="${imageUrl}">
      <meta itemprop="width" content="800">
      <meta itemprop="height" content="600">
      ${prompt.likes > 1000 ? `<div class="viral-badge">
        <i class="fas fa-fire"></i> Viral
      </div>` : ''}
      ${!prompt.likes || prompt.likes < 100 ? `<div class="viral-badge" style="background: #20bf6b">
        <i class="fas fa-user"></i> Promt Seen
      </div>` : ''}
    </div>
    <div class="prompt-content" itemprop="mainEntityOfPage" itemscope itemtype="https://schema.org/WebPage">
      <link itemprop="url" href="${promptUrl}">
      <div class="prompt-meta">
        <span><i class="fas fa-heart"></i> <span itemprop="interactionCount">${prompt.likes || 0}</span> Likes</span>
        <span><i class="fas fa-eye"></i> ${prompt.views || 0} Views</span>
        <span><i class="fas fa-download"></i> ${prompt.uses || 0} Uses</span>
      </div>
      <h3 class="prompt-title" itemprop="headline">${prompt.title || 'Untitled Prompt'}</h3>
      <div class="prompt-text" itemprop="description">
        ${prompt.promptText ? (prompt.promptText.length > 200 ? prompt.promptText.substring(0, 200) + '...' : prompt.promptText) : 'No prompt text available.'}
      </div>
      <div class="prompt-analysis">
        <h4>Why this prompt works:</h4>
        <p>This prompt demonstrates effective AI prompt engineering techniques with ${prompt.keywords ? prompt.keywords.slice(0, 3).join(', ') : 'optimal'} parameters for best results.</p>
      </div>
      <div class="seo-meta" style="display: none;">
        <meta itemprop="datePublished" content="${prompt.createdAt || new Date().toISOString()}">
        <meta itemprop="dateModified" content="${prompt.updatedAt || prompt.createdAt || new Date().toISOString()}">
        <meta itemprop="author" content="${prompt.userName || 'Prompt Seen Community'}">
        <div itemprop="publisher" itemscope itemtype="https://schema.org/Organization">
          <meta itemprop="name" content="Prompt Seen">
        </div>
      </div>
      <div class="social-share">
        <button class="share-btn" data-platform="twitter" data-url="${promptUrl}">
          <i class="fab fa-twitter"></i> Share
        </button>
        <button class="share-btn" data-platform="facebook" data-url="${promptUrl}">
          <i class="fab fa-facebook"></i> Share
        </button>
        <a href="${promptUrl}" target="_blank" class="seo-link" aria-label="View prompt details">Explore</a>
      </div>
    </div>
  `;
  
  // Track engagement for this prompt
  SEOTracker.trackUserEngagement(prompt.id);
  
  return promptCard;
}

// Mobile Navigation Toggle
function initMobileNavigation() {
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navLinks = document.querySelector('.nav-links');
  
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      mobileToggle.querySelector('i').classList.toggle('fa-bars');
      mobileToggle.querySelector('i').classList.toggle('fa-times');
    });
    
    // Close mobile menu when clicking on a link
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        mobileToggle.querySelector('i').classList.add('fa-bars');
        mobileToggle.querySelector('i').classList.remove('fa-times');
      });
    });
  }
}

// Filter buttons functionality
function initFilterButtons() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Simple filtering based on button text
      const filter = btn.textContent.toLowerCase();
      const cards = document.querySelectorAll('.prompt-card');
      
      cards.forEach(card => {
        if (filter === 'all') {
          card.style.display = 'block';
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, 50);
        } else {
          const title = card.querySelector('.prompt-title').textContent.toLowerCase();
          const text = card.querySelector('.prompt-text').textContent.toLowerCase();
          if (title.includes(filter) || text.includes(filter)) {
            card.style.display = 'block';
            setTimeout(() => {
              card.style.opacity = '1';
              card.style.transform = 'translateY(0)';
            }, 50);
          } else {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
              card.style.display = 'none';
            }, 300);
          }
        }
      });
    });
  });
}

// Scroll effect for header
function initScrollEffects() {
  window.addEventListener('scroll', () => {
    const header = document.querySelector('header');
    if (header) {
      if (window.scrollY > 100) {
        header.style.background = 'rgba(255, 255, 255, 0.98)';
        header.style.backdropFilter = 'blur(10px)';
        header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.15)';
      } else {
        header.style.background = 'rgba(255, 255, 255, 0.95)';
        header.style.backdropFilter = 'blur(5px)';
        header.style.boxShadow = '0 2px 15px rgba(0, 0, 0, 0.1)';
      }
    }
  });
}

// Upload Modal Functionality
function initUploadModal() {
  const uploadModal = document.getElementById('uploadModal');
  const openUploadBtn = document.getElementById('openUploadModal');
  const closeModalBtn = document.getElementById('closeModal');
  const uploadForm = document.getElementById('uploadForm');
  const imageUpload = document.getElementById('imageUpload');
  const imagePreview = document.getElementById('imagePreview');
  
  if (openUploadBtn && uploadModal) {
    openUploadBtn.addEventListener('click', () => {
      const user = checkAuth();
      if (!user) {
        alert('Please login to upload creations');
        window.location.href = 'login.html?returnUrl=' + encodeURIComponent(window.location.href);
        return;
      }
      
      uploadModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  }
  
  if (closeModalBtn && uploadModal) {
    closeModalBtn.addEventListener('click', () => {
      uploadModal.classList.remove('active');
      document.body.style.overflow = '';
    });
  }
  
  if (uploadModal) {
    uploadModal.addEventListener('click', (e) => {
      if (e.target === uploadModal) {
        uploadModal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }
  
  if (imageUpload && imagePreview) {
    imageUpload.addEventListener('change', function() {
      const file = this.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          imagePreview.src = e.target.result;
          imagePreview.style.display = 'block';
        }
        reader.readAsDataURL(file);
      } else {
        imagePreview.style.display = 'none';
      }
    });
    
    // Drag and drop functionality
    const fileUploadArea = document.querySelector('.file-upload');
    if (fileUploadArea) {
      fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = '#4e54c8';
        fileUploadArea.style.background = 'rgba(78, 84, 200, 0.05)';
      });
      
      fileUploadArea.addEventListener('dragleave', () => {
        fileUploadArea.style.borderColor = '#ddd';
        fileUploadArea.style.background = '';
      });
      
      fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = '#ddd';
        fileUploadArea.style.background = '';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          imageUpload.files = files;
          const event = new Event('change', { bubbles: true });
          imageUpload.dispatchEvent(event);
        }
      });
    }
  }
  
  if (uploadForm) {
    uploadForm.addEventListener('submit', handleUploadSubmit);
  }
}

// Handle upload form submission
async function handleUploadSubmit(e) {
  e.preventDefault();
  
  const user = checkAuth();
  if (!user) {
    alert('Please login to upload creations');
    window.location.href = 'login.html?returnUrl=' + encodeURIComponent(window.location.href);
    return;
  }
  
  const title = document.getElementById('promptTitle').value;
  const promptText = document.getElementById('promptText').value;
  const category = document.getElementById('category').value;
  const file = imageUpload.files[0];
  
  if (!file) {
    alert('Please select an image to upload!');
    return;
  }
  
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    alert('Please upload a JPEG, PNG, or WebP image');
    return;
  }
  
  if (file.size > 5 * 1024 * 1024) {
    alert('File size exceeds 5MB limit. Please choose a smaller image.');
    return;
  }
  
  if (!title || !title.trim()) {
    alert('Please enter a title for your creation');
    return;
  }
  
  if (!promptText || !promptText.trim()) {
    alert('Please enter the prompt text used to generate this image');
    return;
  }
  
  try {
    const submitBtn = uploadForm.querySelector('.submit-btn');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    submitBtn.disabled = true;
    
    await initializeFirebase();
    const firebaseUser = await getCurrentUser();
    
    if (!firebaseUser) {
      throw new Error('User not authenticated with Firebase. Please log in again.');
    }
    
    const idToken = await firebaseUser.getIdToken();
    
    const formData = new FormData();
    formData.append('image', file);
    formData.append('title', title);
    formData.append('promptText', promptText);
    if (category) formData.append('category', category);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`
      },
      body: formData
    });
    
    if (!response.ok) {
      let errorMsg = `Upload failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorMsg;
      } catch (e) {
        console.error('Error parsing error response:', e);
      }
      throw new Error(errorMsg);
    }
    
    const result = await response.json();
    
    if (result.success) {
      const promptsContainer = document.getElementById('promptsContainer');
      if (promptsContainer) {
        addPromptToShowcase(result.upload);
      }
      
      const uploadModal = document.getElementById('uploadModal');
      const uploadForm = document.getElementById('uploadForm');
      const imagePreview = document.getElementById('imagePreview');
      
      uploadModal.classList.remove('active');
      document.body.style.overflow = '';
      uploadForm.reset();
      imagePreview.style.display = 'none';
      
      // Show success message
      showNotification('Upload successful! Your creation is now visible in the showcase.', 'success');
    } else {
      throw new Error(result.error || 'Upload failed');
    }
  } catch (error) {
    console.error('Upload error:', error);
    
    let userMessage;
    if (error.message.includes('bucket') || error.message.includes('Storage')) {
      userMessage = 'Storage service unavailable. Please try again later.';
    } else if (error.message.includes('permission') || error.message.includes('credentials')) {
      userMessage = 'Permission error. Please log out and log in again.';
    } else if (error.message.includes('size')) {
      userMessage = 'File too large. Please select an image under 5MB.';
    } else {
      userMessage = 'Could not save your image. Please try a different file.';
    }
    
    showNotification(`Upload failed: ${userMessage}`, 'error');
  } finally {
    const submitBtn = uploadForm.querySelector('.submit-btn');
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fas fa-upload"></i> Upload with SEO Optimization';
      submitBtn.disabled = false;
    }
  }
}

// Show notification
function showNotification(message, type = 'info') {
  // Remove existing notification
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
      <button class="notification-close"><i class="fas fa-times"></i></button>
    </div>
  `;
  
  // Add styles if not already added
  if (!document.querySelector('#notification-styles')) {
    const styles = document.createElement('style');
    styles.id = 'notification-styles';
    styles.textContent = `
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        max-width: 400px;
        animation: slideIn 0.3s ease;
      }
      .notification-success { border-left: 4px solid #20bf6b; }
      .notification-error { border-left: 4px solid #ff6b6b; }
      .notification-info { border-left: 4px solid #4e54c8; }
      .notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .notification-close {
        background: none;
        border: none;
        cursor: pointer;
        color: #777;
        margin-left: auto;
      }
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(styles);
  }
  
  document.body.appendChild(notification);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
  
  // Close button
  notification.querySelector('.notification-close').addEventListener('click', () => {
    notification.remove();
  });
}

function addPromptToShowcase(prompt) {
  const promptCard = createPromptCard(prompt);
  const promptsContainer = document.getElementById('promptsContainer');
  
  if (promptsContainer) {
    // Add animation
    promptCard.style.opacity = '0';
    promptCard.style.transform = 'translateY(20px)';
    promptCard.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    
    promptsContainer.prepend(promptCard);
    
    // Animate in
    setTimeout(() => {
      promptCard.style.opacity = '1';
      promptCard.style.transform = 'translateY(0)';
    }, 50);
  }
}

// Load uploads from server with pagination
async function loadUploads(page = 1) {
  const promptsContainer = document.getElementById('promptsContainer');
  
  try {
    if (promptsContainer) {
      promptsContainer.innerHTML = `
        <div class="loading" style="text-align: center; padding: 60px; color: #666;">
          <i class="fas fa-spinner fa-spin fa-2x" style="margin-bottom: 20px;"></i>
          <p>Loading AI creations...</p>
        </div>
      `;
    }
    
    const response = await fetch(`/api/uploads?page=${page}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load uploads: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (promptsContainer) {
      promptsContainer.innerHTML = '';
      
      if (data.uploads.length === 0) {
        promptsContainer.innerHTML = `
          <div class="no-content" style="text-align: center; padding: 60px; color: #666;">
            <i class="fas fa-image fa-3x" style="margin-bottom: 20px; opacity: 0.5;"></i>
            <h3>No creations yet</h3>
            <p>Be the first to upload your AI creation!</p>
            <button class="cta-button" id="firstUploadBtn" style="margin-top: 20px;">
              <i class="fas fa-cloud-upload-alt"></i> Upload Your First Creation
            </button>
          </div>
        `;
        
        document.getElementById('firstUploadBtn').addEventListener('click', () => {
          const uploadBtn = document.getElementById('openUploadModal');
          if (uploadBtn) uploadBtn.click();
        });
        
        return;
      }
      
      data.uploads.forEach((upload, index) => {
        const promptCard = createPromptCard(upload);
        
        // Add staggered animation
        promptCard.style.opacity = '0';
        promptCard.style.transform = 'translateY(20px)';
        promptCard.style.transition = `opacity 0.5s ease ${index * 0.1}s, transform 0.5s ease ${index * 0.1}s`;
        
        promptsContainer.appendChild(promptCard);
        
        // Animate in
        setTimeout(() => {
          promptCard.style.opacity = '1';
          promptCard.style.transform = 'translateY(0)';
        }, 100 + (index * 100));
      });
    }
    
    updatePagination(data.currentPage, data.totalPages);
  } catch (error) {
    console.error('Error loading uploads:', error);
    if (promptsContainer) {
      promptsContainer.innerHTML = `
        <div class="error" style="text-align: center; padding: 60px; color: #ff6b6b;">
          <i class="fas fa-exclamation-triangle fa-2x" style="margin-bottom: 20px;"></i>
          <h3>Error loading content</h3>
          <p>Please try again later</p>
          <button class="btn-outline" onclick="loadUploads(1)" style="margin-top: 20px;">
            <i class="fas fa-redo"></i> Retry
          </button>
        </div>
      `;
    }
  }
}

function updatePagination(currentPage, totalPages) {
  const pagination = document.getElementById('pagination');
  if (!pagination || totalPages <= 1) return;
  
  pagination.innerHTML = '';
  
  // Previous button
  if (currentPage > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i> Prev';
    prevBtn.addEventListener('click', () => loadUploads(currentPage - 1));
    pagination.appendChild(prevBtn);
  }
  
  // Page numbers
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, startPage + 4);
  
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
    pageBtn.textContent = i;
    pageBtn.addEventListener('click', () => {
      if (i !== currentPage) loadUploads(i);
    });
    pagination.appendChild(pageBtn);
  }
  
  // Next button
  if (currentPage < totalPages) {
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
    nextBtn.addEventListener('click', () => loadUploads(currentPage + 1));
    pagination.appendChild(nextBtn);
  }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  await initializeFirebase();
  showAuthElements();
  
  // Initialize all components
  initMobileNavigation();
  initFilterButtons();
  initScrollEffects();
  initUploadModal();
  
  // Load uploads if on showcase page
  if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
    await loadUploads(1);
  }
  
  // Add structured data for homepage
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Prompt Seen",
    "url": "https://home.promptseen.co",
    "description": "AI Prompt Engineering Platform - Create, share and discover effective AI prompts",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://home.promptseen.co/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };
  
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(structuredData);
  document.head.appendChild(script);
  
  // Add CSS for animations
  const animationStyles = document.createElement('style');
  animationStyles.textContent = `
    .prompt-card {
      transition: opacity 0.5s ease, transform 0.5s ease;
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(animationStyles);
});

// Make functions available globally for onclick handlers
window.loadUploads = loadUploads;