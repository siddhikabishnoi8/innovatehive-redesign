/**
 * InnovateHive Landing Page JavaScript
 * Handles animations, form submission, and interactive elements
 */

// ====================
// Utility Functions
// ====================

/**
 * Debounce function to limit rate of function execution
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ====================
// Navbar Scroll Effect
// ====================
function initNavbarScroll() {
  const navbar = document.getElementById('mainNav');
  
  const handleScroll = () => {
    if (window.scrollY > 100) {
      navbar.classList.add('navbar-scrolled');
      navbar.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    } else {
      navbar.classList.remove('navbar-scrolled');
      navbar.style.boxShadow = 'none';
    }
  };
  
  window.addEventListener('scroll', debounce(handleScroll, 10));
}

// ====================
// Smooth Scroll for Anchor Links
// ====================
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      
      // Don't prevent default for Bootstrap data-bs-toggle elements
      if (this.hasAttribute('data-bs-toggle')) {
        return;
      }
      
      if (href !== '#' && href !== '') {
        e.preventDefault();
        const target = document.querySelector(href);
        
        if (target) {
          const navHeight = document.getElementById('mainNav').offsetHeight;
          const targetPosition = target.offsetTop - navHeight;
          
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
          
          // Close mobile menu if open
          const navbarCollapse = document.getElementById('navbarNav');
          if (navbarCollapse.classList.contains('show')) {
            bootstrap.Collapse.getInstance(navbarCollapse).hide();
          }
        }
      }
    });
  });
}

// ====================
// Intersection Observer for Scroll Animations
// ====================
function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Unobserve after animation to improve performance
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  // Observe all elements with reveal-section class
  document.querySelectorAll('.reveal-section').forEach(element => {
    observer.observe(element);
  });
}

// ====================
// Counter Animation
// ====================
function initCounterAnimation() {
  const counterElements = document.querySelectorAll('.stat-item__number');
  let animated = false;
  
  const observerOptions = {
    threshold: 0.5
  };
  
  const animateCounter = (element) => {
    const target = parseInt(element.getAttribute('data-target'));
    const duration = 2000; // 2 seconds
    const increment = target / (duration / 16); // 60fps
    let current = 0;
    
    const updateCounter = () => {
      current += increment;
      if (current < target) {
        element.textContent = Math.floor(current);
        requestAnimationFrame(updateCounter);
      } else {
        element.textContent = target;
      }
    };
    
    updateCounter();
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !animated) {
        animated = true;
        counterElements.forEach(counter => {
          animateCounter(counter);
        });
      }
    });
  }, observerOptions);
  
  const statsSection = document.querySelector('.stats-section');
  if (statsSection) {
    observer.observe(statsSection);
  }
}

// ====================
// Form Submission Handler
// ====================
function initContactForm() {
  const form = document.getElementById('contactForm');
  const messageDiv = document.getElementById('formMessage');
  
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Basic validation
    if (!data.name || !data.email || !data.message) {
      showFormMessage('Please fill in all fields.', 'danger');
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      showFormMessage('Please enter a valid email address.', 'danger');
      return;
    }
    
    // Disable submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';
    
    try {
      // Send form data to Flask backend
      const response = await fetch('/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        showFormMessage('Thank you! Your message has been sent successfully.', 'success');
        form.reset();
      } else {
        showFormMessage(result.error || 'Something went wrong. Please try again.', 'danger');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      showFormMessage('Network error. Please check your connection and try again.', 'danger');
    } finally {
      // Re-enable submit button
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
      // Reinitialize Lucide icons
      lucide.createIcons();
    }
  });
}

/**
 * Display form submission message
 */
function showFormMessage(message, type) {
  const messageDiv = document.getElementById('formMessage');
  messageDiv.className = `alert alert-${type}`;
  messageDiv.textContent = message;
  messageDiv.style.display = 'block';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 5000);
}

// ====================
// Newsletter Form Handler
// ====================
function initNewsletterForm() {
  const newsletterForms = document.querySelectorAll('.footer__newsletter-form');
  
  newsletterForms.forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const emailInput = form.querySelector('input[type="email"]');
      const email = emailInput.value.trim();
      
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        alert('Please enter a valid email address.');
        return;
      }
      
      try {
        const response = await fetch('/newsletter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email })
        });
        
        if (response.ok) {
          alert('Thank you for subscribing!');
          emailInput.value = '';
        } else {
          alert('Subscription failed. Please try again.');
        }
      } catch (error) {
        console.error('Newsletter subscription error:', error);
        alert('Network error. Please try again later.');
      }
    });
  });
}

// ====================
// Active Navigation Link Highlighting
// ====================
function initActiveNavigation() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
  
  const highlightNavigation = () => {
    const scrollY = window.pageYOffset;
    
    sections.forEach(section => {
      const sectionHeight = section.offsetHeight;
      const sectionTop = section.offsetTop - 100;
      const sectionId = section.getAttribute('id');
      
      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
          }
        });
      }
    });
  };
  
  window.addEventListener('scroll', debounce(highlightNavigation, 100));
}

// ====================
// Lazy Loading Images
// ====================
function initLazyLoading() {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          observer.unobserve(img);
        }
      });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }
}

// ====================
// Accessibility: Focus Management
// ====================
function initAccessibilityFeatures() {
  // Add focus visible class for better keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      document.body.classList.add('keyboard-nav');
    }
  });
  
  document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-nav');
  });
  
  // Trap focus in modals if any
  const modals = document.querySelectorAll('[role="dialog"]');
  modals.forEach(modal => {
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        modal.close();
      }
    });
  });
}

// ====================
// Performance: Reduce Motion
// ====================
function respectReducedMotion() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  
  if (prefersReducedMotion.matches) {
    // Disable animations
    document.querySelectorAll('.reveal-section, .fade-up').forEach(element => {
      element.style.animation = 'none';
      element.style.transition = 'none';
      element.classList.add('visible');
    });
  }
}

// ====================
// Initialize All Features
// ====================
function init() {
  // Wait for DOM to be fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }
}

function initializeApp() {
  console.log('InnovateHive Landing Page Initialized');
  
  // Initialize all features
  initNavbarScroll();
  initSmoothScroll();
  initScrollAnimations();
  initCounterAnimation();
  initContactForm();
  initNewsletterForm();
  initActiveNavigation();
  initLazyLoading();
  initAccessibilityFeatures();
  respectReducedMotion();
  
  // Initialize Lucide icons if library is loaded
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  
  console.log('All features initialized successfully');
}

// Start initialization
init();

// ====================
// Service Worker Registration (Optional - for PWA)
// ====================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Uncomment when you have a service worker file
    // navigator.serviceWorker.register('/sw.js')
    //   .then(reg => console.log('Service Worker registered'))
    //   .catch(err => console.log('Service Worker registration failed'));
  });
}