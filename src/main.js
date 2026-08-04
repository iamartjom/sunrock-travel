import Lenis from 'lenis';

const TOTAL_FRAMES = 313;
const images = new Array(TOTAL_FRAMES);

const canvas = document.getElementById('video-canvas');
const ctx = canvas.getContext('2d');
const loader = document.getElementById('loader');
const loaderBar = document.getElementById('loader-bar');
const loaderLogoFill = document.getElementById('loader-logo-fill');
const loaderPercent = document.getElementById('loader-percent');

let targetFrame = 0;
let currentFrame = 0;
let isLoaded = false;

// Initialize Lenis for smooth momentum scroll
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  touchMultiplier: 2,
  smoothWheel: true,
  wheelMultiplier: 1,
});

function updateLenis(time) {
  lenis.raf(time);
  requestAnimationFrame(updateLenis);
}
requestAnimationFrame(updateLenis);

// Calculate aspect-ratio covered drawing dimensions (object-fit: cover)
function drawFrame(img) {
  if (!img) return;

  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  const imgWidth = img.width || 1920;
  const imgHeight = img.height || 1080;

  const imgAspect = imgWidth / imgHeight;
  const canvasAspect = canvasWidth / canvasHeight;

  let drawWidth, drawHeight, offsetX, offsetY;

  if (canvasAspect > imgAspect) {
    drawWidth = canvasWidth;
    drawHeight = canvasWidth / imgAspect;
    offsetX = 0;
    offsetY = (canvasHeight - drawHeight) / 2;
  } else {
    drawHeight = canvasHeight;
    drawWidth = canvasHeight * imgAspect;
    offsetX = (canvasWidth - drawWidth) / 2;
    offsetY = 0;
  }

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
}

// Adjust canvas resolution to window DPR
function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;

  const frameIdx = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(currentFrame)));
  if (images[frameIdx]) {
    drawFrame(images[frameIdx]);
  }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Lenis scroll listener & section highlight update
const navItems = document.querySelectorAll('.nav-item');
const heroCenter = document.querySelector('.hero-center');
const heroCards = document.querySelector('.hero-section .cards-container');

lenis.on('scroll', ({ scroll, limit }) => {
  if (limit > 0) {
    const progress = Math.max(0, Math.min(1, scroll / limit));
    targetFrame = progress * (TOTAL_FRAMES - 1);

    // Scroll-driven fade-out for Hero center content (in place, no upward movement)
    if (heroCenter && document.body.classList.contains('page-loaded')) {
      const heroOpacity = Math.max(0, 1 - (scroll / 320));
      const heroScale = 1 - (1 - heroOpacity) * 0.05;
      const heroBlur = (1 - heroOpacity) * 8;

      heroCenter.style.opacity = heroOpacity;
      heroCenter.style.transform = `translate(-50%, -50%) scale(${heroScale})`;
      heroCenter.style.filter = `blur(${heroBlur}px)`;
      heroCenter.style.pointerEvents = heroOpacity < 0.05 ? 'none' : 'auto';
    }

    // Scroll-driven fade-out for Hero bottom cards
    if (heroCards && document.body.classList.contains('page-loaded')) {
      const cardsOpacity = Math.max(0, 1 - (scroll / 320));
      heroCards.style.opacity = cardsOpacity;
      heroCards.style.pointerEvents = cardsOpacity < 0.05 ? 'none' : 'auto';
    }

    // Dynamic active nav update based on 5 sections scroll progress
    if (progress < 0.20) {
      updateActiveNav(0); // Home
    } else if (progress < 0.40) {
      updateActiveNav(1); // Flight Routes
    } else if (progress < 0.60) {
      updateActiveNav(2); // Departures
    } else if (progress < 0.80) {
      updateActiveNav(3); // About Us
    } else {
      updateActiveNav(4); // Contact
    }
  }
});

function updateActiveNav(activeIndex) {
  navItems.forEach((item, index) => {
    if (index === activeIndex) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

// Render loop with lerp for silky smooth video frames animation
function renderLoop() {
  const diff = targetFrame - currentFrame;

  if (Math.abs(diff) > 0.001) {
    currentFrame += diff * 0.12; // Smooth inertia interpolation factor
  } else {
    currentFrame = targetFrame;
  }

  const frameIdx = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(currentFrame)));
  if (images[frameIdx]) {
    drawFrame(images[frameIdx]);
  }

  requestAnimationFrame(renderLoop);
}

// Helper to safely hide loader screen and trigger entrance sequence
function hideLoader() {
  if (isLoaded) return;
  isLoaded = true;

  if (loaderBar) loaderBar.style.width = '100%';
  if (loaderLogoFill) loaderLogoFill.style.width = '100%';
  if (loaderPercent) loaderPercent.textContent = '100%';

  if (loader) {
    loader.classList.add('hidden');
    setTimeout(() => {
      loader.style.display = 'none';
      document.body.classList.add('page-loaded');
    }, 400);
  } else {
    document.body.classList.add('page-loaded');
  }
}

// Parallel frame preloader with extended smooth cinematic duration
function preloadFrames() {
  let loadedCount = 0;
  let targetProgress = 0;
  let currentProgress = 0;
  let allFramesFetched = false;
  const startTime = Date.now();
  const MIN_DURATION_MS = 1300; // Exactly 1.3 seconds preloader duration

  function animateLoaderProgress() {
    if (isLoaded) return;

    const elapsedTime = Date.now() - startTime;
    const timeProgress = Math.min(100, (elapsedTime / MIN_DURATION_MS) * 100);
    const fetchProgress = (loadedCount / TOTAL_FRAMES) * 100;

    // Actual progress is the minimum of timeProgress and fetchProgress until all frames are fetched
    if (allFramesFetched) {
      targetProgress = timeProgress;
    } else {
      targetProgress = Math.min(timeProgress, fetchProgress);
    }

    // Smooth lerp progress increment
    currentProgress += (targetProgress - currentProgress) * 0.1;
    if (Math.abs(targetProgress - currentProgress) < 0.2) {
      currentProgress = targetProgress;
    }

    const displayVal = Math.min(100, Math.floor(currentProgress));
    if (loaderBar) loaderBar.style.width = `${displayVal}%`;
    if (loaderLogoFill) loaderLogoFill.style.width = `${displayVal}%`;
    if (loaderPercent) loaderPercent.textContent = `${displayVal}%`;

    if (displayVal >= 100 && elapsedTime >= MIN_DURATION_MS) {
      setTimeout(hideLoader, 300);
      return;
    }

    requestAnimationFrame(animateLoaderProgress);
  }

  function onSingleFrameLoaded() {
    loadedCount++;

    if (loadedCount === 1 && images[0]) {
      drawFrame(images[0]);
    }

    if (loadedCount >= TOTAL_FRAMES) {
      allFramesFetched = true;
    }
  }

  requestAnimationFrame(animateLoaderProgress);

  for (let i = 1; i <= TOTAL_FRAMES; i++) {
    const frameNumber = String(i).padStart(4, '0');
    const imgPath = `/frames/frame_${frameNumber}.jpg`;

    const img = new Image();

    // Attach handlers before setting src
    img.onload = () => {
      images[i - 1] = img;
      onSingleFrameLoaded();
    };

    img.onerror = () => {
      onSingleFrameLoaded();
    };

    img.src = imgPath;

    if (img.complete && img.naturalWidth !== 0) {
      img.onload();
    }
  }

  // Failsafe timeout
  setTimeout(() => {
    hideLoader();
  }, 4000);
}

preloadFrames();
requestAnimationFrame(renderLoop);
