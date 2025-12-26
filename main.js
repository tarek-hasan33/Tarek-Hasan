document.addEventListener("DOMContentLoaded", function () {
  //Intro Overlay with Hello Shuffle
  const greetings = [
    "Hello",
    "হ্যালো",
    "Hola",
    "Bonjour",
    "Ciao",
    "Hallo",
    "नमस्ते",
    "こんにちは",
    "안녕하세요",
    "你好",
    "سلام",
  ];
  const overlay = document.getElementById("intro-overlay");
  if (!overlay) return;
  const helloShuffle = overlay.querySelector(".hello-shuffle");
  if (!helloShuffle) return;

  let greetIndex = 0;
  const shuffleInterval = setInterval(() => {
    helloShuffle.textContent = greetings[greetIndex];
    greetIndex = (greetIndex + 1) % greetings.length;
  }, 150);

  setTimeout(() => {
    clearInterval(shuffleInterval);
    overlay.classList.add("fade-out");

    setTimeout(() => {
      overlay.style.display = "none";
      initMainAnimations(); //main animation initiation
    }, 300);
  }, 1800);

  (function initStarfieldOptimized() {
    const canvas = document.getElementById("starfield");
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });

    const rocketImg = new Image();
    rocketImg.src = "images/rocket/rocket.svg";

    // Offscreen cache for static stars
    const starCache = document.createElement("canvas");
    const sctx = starCache.getContext("2d", { alpha: true });

    let w = 0,
      h = 0,
      dpr = 1;

    // Performance knobs
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const STAR_COUNT = isMobile ? 900 : 1400; // lower on mobile
    const GLOW_RATIO = isMobile ? 0.05 : 0.07; // few glowy ones
    const MAX_SHOOTING = isMobile ? 1 : 2; // cap simultaneous streaks
    const TARGET_FPS = 30; // stars don’t need 60fps
    const FRAME_TIME = 1000 / TARGET_FPS;

    const stars = [];
    const shooting = [];
    let lastFrame = 0;
    let running = true;
    const rockets = [];
    const smoke = [];

    function rand(min, max) {
      return Math.random() * (max - min) + min;
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      w = window.innerWidth;
      h = window.innerHeight;

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      starCache.width = Math.floor(w * dpr);
      starCache.height = Math.floor(h * dpr);
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      buildStars();
      renderStarCache(); // draw static stars once
    }

    function buildStars() {
      stars.length = 0;
      for (let i = 0; i < STAR_COUNT; i++) {
        const glow = Math.random() < GLOW_RATIO;
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: glow ? rand(0.6, 1.2) : rand(0.3, 0.9), // tiny dots
          a: glow ? rand(0.25, 0.85) : rand(0.12, 0.55),
          glow,
        });
      }
    }

    function renderStarCache() {
      sctx.clearRect(0, 0, w, h);

      // subtle depth tint
      const bg = sctx.createRadialGradient(
        w * 0.5,
        h * 0.2,
        20,
        w * 0.5,
        h * 0.2,
        Math.max(w, h)
      );
      bg.addColorStop(0, "rgba(203, 214, 226, 0.03)");
      bg.addColorStop(1, "rgba(1, 22, 39, 0)");
      sctx.fillStyle = bg;
      sctx.fillRect(0, 0, w, h);

      for (const s of stars) {
        if (s.glow) {
          sctx.shadowBlur = 6;
          sctx.shadowColor = "rgba(46, 196, 182, 0.20)";
        } else {
          sctx.shadowBlur = 0;
        }
        sctx.fillStyle = `rgba(203, 214, 226, ${s.a})`;
        sctx.fillRect(s.x, s.y, s.r, s.r);
      }
      sctx.shadowBlur = 0;
    }

    function spawnShootingStar() {
      if (shooting.length >= MAX_SHOOTING) return;

      // Choose spawn edge
      const r = Math.random();
      let startX, startY, angle;

      if (r < 0.55) {
        // TOP (same idea as before)
        startX = rand(0, w);
        startY = -60;

        // Mostly downward with small left/right variance
        angle = rand(Math.PI * 0.35, Math.PI * 0.65);
      } else if (r < 0.775) {
        // LEFT
        startX = -60;
        startY = rand(0, h); // full height for better spread

        // Aim to the right-ish (inward)
        angle = rand(-Math.PI * 0.15, Math.PI * 0.15);
      } else {
        // RIGHT
        startX = w + 60;
        startY = rand(0, h); // full height for better spread

        // Aim to the left-ish (inward)
        angle = rand(Math.PI - Math.PI * 0.15, Math.PI + Math.PI * 0.15);
      }

      // Slightly slower (adjust to taste)
      const speed = rand(isMobile ? 8 : 10, isMobile ? 14 : 18);

      shooting.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: rand(35, 75),
        len: rand(110, 220),
        w: rand(0.8, 1.4),
      });
    }

    function spawnRocket() {
      if (rockets.length >= 1) return; // only one at a time

      // spawn from random edge
      const edge = Math.floor(Math.random() * 4);
      let x, y;

      if (edge === 0) {
        x = Math.random() * w;
        y = -60;
      }
      if (edge === 1) {
        x = w + 60;
        y = Math.random() * h;
      }
      if (edge === 2) {
        x = Math.random() * w;
        y = h + 60;
      }
      if (edge === 3) {
        x = -60;
        y = Math.random() * h;
      }

      const targetX = Math.random() * w;
      const targetY = Math.random() * h;

      const dx = targetX - x;
      const dy = targetY - y;
      const mag = Math.hypot(dx, dy) || 1;

      const speed = 3;
      const diagonal = Math.hypot(w, h);

      rockets.push({
        x,
        y,
        vx: (dx / mag) * speed,
        vy: (dy / mag) * speed,
        angle: Math.atan2(dy, dx), // movement direction
        life: 0,
        maxLife: 1000,
      });
    }

    // Rare rocket spawns (random)
    setInterval(() => {
      if (!running) return;
      if (Math.random() < 0.4) spawnRocket(); // 20% chance every 5s = ~25s average
    }, 5000);

    function emitSmoke(x, y, vx, vy) {
      for (let i = 0; i < 3; i++) {
        smoke.push({
          x: x + (Math.random() - 0.5) * 4,
          y: y + (Math.random() - 0.5) * 4,
          vx: -vx * 0.15 + (Math.random() - 0.5) * 0.4,
          vy: -vy * 0.15 + (Math.random() - 0.5) * 0.4,
          r: Math.random() * 2 + 1,
          a: 0.15,
          life: 0,
          maxLife: 50,
        });
      }

      if (smoke.length > 400) smoke.splice(0, smoke.length - 400);
    }

    function drawRocket(r) {
      const size = 28;
      ctx.save();
      ctx.translate(r.x, r.y);

      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (!isIOS) {
        ctx.rotate(r.angle + Math.PI / 2);
      } else {
        ctx.rotate(r.angle);
      }

      ctx.globalAlpha = 0.85;
      ctx.drawImage(rocketImg, -size / 2, -size / 2, size, size);

      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // Pause only when tab is hidden (NOT when scrolling)
    function onVisibility() {
      running = !document.hidden;
    }
    document.addEventListener("visibilitychange", onVisibility);
    running = !document.hidden;

    function draw(ts) {
      requestAnimationFrame(draw);
      if (!running) return;

      if (ts - lastFrame < FRAME_TIME) return; // throttle to ~30fps
      lastFrame = ts;

      // draw cached star background
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(starCache, 0, 0, w, h);

      // shooting stars
      for (let i = shooting.length - 1; i >= 0; i--) {
        const sh = shooting[i];
        sh.x += sh.vx;
        sh.y += sh.vy;
        sh.life++;

        const t = sh.life / sh.maxLife;
        const alpha = 1 - t;

        const tailX = sh.x - sh.vx * (sh.len / 22);
        const tailY = sh.y - sh.vy * (sh.len / 22);

        const grad = ctx.createLinearGradient(sh.x, sh.y, tailX, tailY);
        grad.addColorStop(0, `rgba(46, 196, 182, ${0.75 * alpha})`);
        grad.addColorStop(0.55, `rgba(203, 214, 226, ${0.28 * alpha})`);
        grad.addColorStop(1, `rgba(203, 214, 226, 0)`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = sh.w;
        ctx.beginPath();
        ctx.moveTo(sh.x, sh.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        if (
          sh.life >= sh.maxLife ||
          sh.x < -400 ||
          sh.x > w + 400 ||
          sh.y < -400 ||
          sh.y > h + 400
        ) {
          shooting.splice(i, 1);
        }
      }

      // ---- rockets update + smoke ----
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.x += r.vx;
        r.y += r.vy;
        r.life++;

        // smoke comes from behind rocket
        emitSmoke(
          r.x - Math.cos(r.angle) * 14,
          r.y - Math.sin(r.angle) * 14,
          r.vx,
          r.vy
        );

        if (
          r.life > r.maxLife ||
          r.x < -200 ||
          r.x > w + 200 ||
          r.y < -200 ||
          r.y > h + 200
        ) {
          rockets.splice(i, 1);
        }
      }

      // ---- smoke draw ----
      for (let i = smoke.length - 1; i >= 0; i--) {
        const p = smoke[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        const t = p.life / p.maxLife;
        ctx.globalAlpha = p.a * (1 - t);
        ctx.fillStyle = "rgba(203,214,226,0.6)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + t * 2, 0, Math.PI * 2);
        ctx.fill();

        if (p.life >= p.maxLife) smoke.splice(i, 1);
      }
      ctx.globalAlpha = 1;

      // ---- rocket draw ----
      for (const r of rockets) drawRocket(r);
    }

    function debounce(fn, wait = 150) {
      let t;
      return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
      };
    }

    // --- stable resize handling (prevents mobile scroll resets) ---
    let lastW = 0;
    let lastH = 0;

    function safeResize() {
      const newW = window.innerWidth;
      const newH = window.visualViewport?.height || window.innerHeight;

      const widthChanged = newW !== lastW;
      const heightChangedALot = Math.abs(newH - lastH) > 120;

      // Ignore mobile scroll-induced resizes
      if (!widthChanged && !heightChangedALot) return;

      lastW = newW;
      lastH = newH;

      resize();
    }

    // initial setup
    safeResize();

    // listen for real resizes only
    window.addEventListener("resize", debounce(safeResize, 150));
    window.addEventListener("orientationchange", debounce(safeResize, 150));

    requestAnimationFrame(draw);
  })();

  // MAIN ANIMATION
  function initMainAnimations() {
    //Typed.js
    if (window.Typed) {
      new Typed(".typed-text", {
        strings: [" <span class='intro-name'>tarek</span> here."],
        typeSpeed: 60,
        showCursor: false,
        contentType: "html",
      });
    }

    //Fade-in on scroll
    const fadeSections = document.querySelectorAll(".fade-in-section");
    const observer = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              entry.target.classList.add("active");
            }, i * 200);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    fadeSections.forEach((section) => {
      section.classList.remove("active");
      observer.observe(section);
    });

    //Tabbed content
    const tabContainers = document.querySelectorAll(".tabs-container");
    tabContainers.forEach((container) => {
      const buttons = container.querySelectorAll(".tab-button");
      const panels = container.querySelectorAll(".tab-panel");
      const indicator = container.querySelector(".tab-indicator");

      let activeIndex = 0;

      function activateTab(index, applyFocus = true) {
        panels.forEach((panel, i) => {
          panel.classList.remove("active", "fade-in");
          if (i === index) {
            panel.classList.add("active");
            setTimeout(() => {
              panel.classList.add("fade-in");

              const paragraphs = panel.querySelectorAll(
                ".content-description p"
              );
              paragraphs.forEach((p, i) => {
                p.classList.remove("visible");
                setTimeout(() => {
                  p.classList.add("visible");
                }, i * 300);
              });
            }, 400);
          }
        });

        // Buttons: update active and focused states
        buttons.forEach((btn, i) => {
          btn.classList.remove("active", "focused");
          if (i === index) {
            btn.classList.add("active");
            if (applyFocus) btn.classList.add("focused");
          }
        });

        if (indicator) {
          const button = buttons[index];
          if (button) {
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
              // Horizontal indicator below button
              const containerTabs = container.querySelector(".tab-buttons");
              const scrollLeft = containerTabs.scrollLeft || 0;
              const leftPos = button.offsetLeft - scrollLeft;

              indicator.style.left = `${leftPos}px`;
              indicator.style.width = `${button.offsetWidth}px`;
              indicator.style.bottom = "0";
              indicator.style.top = "auto";
              indicator.style.height = "2px";
              indicator.style.right = "auto";
            } else {
              // Vertical indicator on left (desktop)
              indicator.style.top = `${button.offsetTop}px`;
              indicator.style.height = `${button.offsetHeight}px`;
              indicator.style.left = "";
              indicator.style.width = "2px";
              indicator.style.bottom = "";
            }
          }
        }

        // Adjust tab content height to active panel height
        const tabContent = container.querySelector(".tab-content");
        const activePanel = container.querySelector(".tab-panel.active");
        if (tabContent && activePanel) {
          tabContent.style.height = activePanel.offsetHeight + 5 + "px";
        }

        // Save active index
        activeIndex = index;
      }

      buttons.forEach((button, index) => {
        button.addEventListener("click", (e) => {
          e.stopPropagation();
          activateTab(index, true);

          const ripple = document.createElement("span");
          ripple.classList.add("ripple");

          const rect = button.getBoundingClientRect();
          ripple.style.width = ripple.style.height = `${Math.max(
            rect.width,
            rect.height
          )}px`;
          ripple.style.left = `${e.clientX - rect.left - rect.width / 2}px`;
          ripple.style.top = `${e.clientY - rect.top - rect.height / 2}px`;

          button.appendChild(ripple);
          ripple.addEventListener("animationend", () => ripple.remove());
        });
      });

      document.addEventListener("click", () => {
        buttons.forEach((btn) => btn.classList.remove("focused"));
      });

      activateTab(0, false);
    });

    //Orbit icon positioning with smooth entry
    function positionOrbitIcons(rotatorSelector) {
      const rotator = document.querySelector(rotatorSelector);
      if (!rotator) return;

      const icons = rotator.querySelectorAll(".orbit-icon");
      const count = icons.length;
      const radius = rotator.offsetWidth / 2;

      icons.forEach((icon, index) => {
        const angle = (index / count) * 2 * Math.PI;
        const x = radius + radius * Math.cos(angle);
        const y = radius + radius * Math.sin(angle);

        icon.style.left = `${x}px`;
        icon.style.top = `${y}px`;

        // Only wrap if not already wrapped
        if (!icon.querySelector(".icon-inner")) {
          const img = icon.querySelector("img");
          if (img) {
            const wrapper = document.createElement("div");
            wrapper.classList.add("icon-inner");
            wrapper.appendChild(img.cloneNode(true));
            img.remove();
            icon.appendChild(wrapper);
          }
        }

        // Smooth fade-in via class after positioning
        requestAnimationFrame(() => {
          icon.classList.add("visible");
        });
      });
    }

    positionOrbitIcons(".outer-rotator");
    positionOrbitIcons(".inner-rotator");

    window.addEventListener("resize", () => {
      positionOrbitIcons(".outer-rotator");
      positionOrbitIcons(".inner-rotator");
    });

    //Initialize auto slide on hover
    initAutoSlides();

    // POPUP IMAGE MODAL WITH NAVIGATION (for HTML-defined popup)
    const popup = document.getElementById("image-popup");
    const popupImg = popup.querySelector("img");
    const popupOverlay = popup.querySelector(".popup-overlay");
    const leftArrow = popup.querySelector(".left-arrow");
    const rightArrow = popup.querySelector(".right-arrow");

    let currentImages = [];
    let currentIndex = 0;
    let touchStartX = 0;
    let touchEndX = 0;

    // Handler to prevent touch scroll on mobile
    function preventTouchScroll(e) {
      e.preventDefault();
    }

    document.querySelectorAll(".fade-in-section.cards").forEach((card) => {
      const images = card.querySelectorAll(".project-images img");
      if (images.length === 0) return;

      images.forEach((img, index) => {
        img.style.cursor = "pointer";
        img.addEventListener("click", () => {
          currentImages = images;
          currentIndex = index;
          popupImg.src = currentImages[currentIndex].src;
          popup.classList.remove("hidden");
          document.body.style.overflow = "hidden";
          document.documentElement.style.overflow = "hidden";

          // Disable touch scroll on mobile
          document.addEventListener("touchmove", preventTouchScroll, {
            passive: false,
          });
        });
      });
    });

    popupImg.addEventListener("touchstart", (e) => {
      touchStartX = e.changedTouches[0].screenX;
    });

    popupImg.addEventListener("touchend", (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleGesture();
    });

    function showPopupImage(index) {
      currentIndex = (index + currentImages.length) % currentImages.length;
      popupImg.src = currentImages[currentIndex].src;
    }

    leftArrow.addEventListener("click", (e) => {
      e.stopPropagation();
      showPopupImage(currentIndex - 1);
    });

    rightArrow.addEventListener("click", (e) => {
      e.stopPropagation();
      showPopupImage(currentIndex + 1);
    });

    popupOverlay.addEventListener("click", () => {
      popup.classList.add("hidden");
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";

      // Re-enable touch scroll on mobile
      document.removeEventListener("touchmove", preventTouchScroll);
    });

    // Keyboard navigation and Escape to close
    document.addEventListener("keydown", (e) => {
      if (popup.classList.contains("hidden")) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        leftArrow.click();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        rightArrow.click();
      } else if (e.key === "Escape") {
        popup.classList.add("hidden");
        document.body.style.overflow = "";
        document.documentElement.style.overflow = "";
        document.removeEventListener("touchmove", preventTouchScroll);
      }
    });

    function handleGesture() {
      const swipeThreshold = 50; // minimum px to consider it a swipe
      const deltaX = touchEndX - touchStartX;

      if (Math.abs(deltaX) > swipeThreshold) {
        if (deltaX < 0) {
          showPopupImage(currentIndex + 1); // swipe left
        } else {
          showPopupImage(currentIndex - 1); // swipe right
        }
      }
    }
  }

  //Auto slide function for project image sliders on hover
  function initAutoSlides() {
    const cards = document.querySelectorAll(".fade-in-section.cards");

    cards.forEach((card) => {
      const images = card.querySelectorAll(".project-images img");
      if (images.length === 0) return;

      const leftArrow = card.querySelector(".left-arrow");
      const rightArrow = card.querySelector(".right-arrow");

      let currentIndex = 0;
      let slideInterval;
      let userInteracted = false;

      function showImage(index) {
        images.forEach((img, i) => {
          img.style.display = i === index ? "block" : "none";
          img.style.opacity = i === index ? "1" : "0";
        });
        currentIndex = index;
      }

      function startSlide() {
        if (userInteracted) return;
        slideInterval = setInterval(() => {
          currentIndex = (currentIndex + 1) % images.length;
          showImage(currentIndex);
        }, 2500);
      }

      function stopSlide() {
        clearInterval(slideInterval);
      }

      card.addEventListener("mouseenter", () => {
        startSlide();
      });

      card.addEventListener("mouseleave", () => {
        stopSlide();
        currentIndex = 0;
        showImage(currentIndex);
        userInteracted = false;
      });

      if (leftArrow) {
        leftArrow.addEventListener("click", () => {
          stopSlide();
          userInteracted = true;
          currentIndex = (currentIndex - 1 + images.length) % images.length;
          showImage(currentIndex);
        });
      }

      if (rightArrow) {
        rightArrow.addEventListener("click", () => {
          stopSlide();
          userInteracted = true;
          currentIndex = (currentIndex + 1 + images.length) % images.length;
          showImage(currentIndex);
        });
      }
      //Initial state: show first image
      showImage(currentIndex);
    });
  }
});
