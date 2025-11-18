/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Lấy BASE_URL từ Vite (ví dụ: '/tapsan/')
const BASE_URL = import.meta.env.BASE_URL;

document.addEventListener('DOMContentLoaded', () => {

    /* -------------------------------------------------------
     * 🎵 AUDIO & CONTROLS
     * ------------------------------------------------------- */
    const audio = document.getElementById('background-music') as HTMLAudioElement;
    const lastPage = document.getElementById('page-17');
    const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
    const volumeIcon = document.getElementById('volume-icon') as HTMLElement;

    let isMusicPlaying = false;
    let visualizerInitialized = false;
    let lastVolume = 0.5;

    const updateVolumeIcon = (volume: number) => {
        if (volume === 0) volumeIcon.textContent = "🔇";
        else if (volume < 0.5) volumeIcon.textContent = "🔉";
        else volumeIcon.textContent = "🔊";
    };

    if (audio) {
        audio.volume = lastVolume;
        volumeSlider.value = String(audio.volume * 100);
        updateVolumeIcon(audio.volume);
    }

    // Volume slider
    volumeSlider?.addEventListener("input", (e) => {
        const val = Number((e.target as HTMLInputElement).value) / 100;
        audio.volume = val;
        if (val > 0) lastVolume = val;
        updateVolumeIcon(val);
    });

    // Mute toggle
    volumeIcon?.addEventListener("click", () => {
        if (audio.volume > 0) {
            audio.volume = 0;
            volumeSlider.value = "0";
            updateVolumeIcon(0);
        } else {
            audio.volume = lastVolume || 0.5;
            volumeSlider.value = String(audio.volume * 100);
            updateVolumeIcon(audio.volume);
        }
    });

   /* -------------------------------------------------------
 * 🔊 VISUALIZER (SOUND-BARS mới)
 * ------------------------------------------------------- */
const initializeVisualizer = () => {
    // 1. Dùng .sound-visualizer .bar để chọn tất cả 12 thanh từ #sound-left và #sound-right.
    const bars = document.querySelectorAll<HTMLElement>("#sound-right-corner .bar");
    
    if (visualizerInitialized || !audio || bars.length === 0) return;
    visualizerInitialized = true;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaElementSource(audio);
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 64;
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    const freqData = new Uint8Array(analyser.frequencyBinCount);

    const animate = () => {
        requestAnimationFrame(animate);
        analyser.getByteFrequencyData(freqData);

        // ❌ XÓA DÒNG TRUY VẤN DOM THỪA VÀ SAI LÀ 'const allBars = document.querySelectorAll<HTMLElement>("#sound-bars .bar");'

        // SỬ DỤNG biến 'bars' đã được chọn ở trên.
        bars.forEach((bar, i) => { 
            const idx = i % freqData.length;
            const height = 10 + (freqData[idx] / 255) * 50;  
            bar.style.height = `${height}px`;
        });
    };

    animate();
};
    /* -------------------------------------------------------
     * 📖 FLIPBOOK & LAZY LOAD
     * ------------------------------------------------------- */
    
    // <<< THÊM MỚI (Để canh lề sách)
    const bookWrapper = document.getElementById("bookWrapper") as HTMLElement;
    
    const pages = document.querySelectorAll<HTMLElement>('.page');
    const totalPages = pages.length;

    const lazyLoadImages = (pageElement: HTMLElement | null) => {
        if (!pageElement) return;
        const imgs = pageElement.querySelectorAll<HTMLImageElement>('img[data-src]');
        imgs.forEach(image => {
            const ds = image.getAttribute('data-src');
            if (!ds) return;

            const clean = ds.startsWith("/") ? ds.substring(1) : ds;
            image.src = BASE_URL + clean;

            image.onload = () => image.classList.add("loaded");
            image.removeAttribute('data-src');
        });
    };

    // Preload 2 trang đầu
    if (pages[0]) lazyLoadImages(pages[0]);
    if (pages[1]) lazyLoadImages(pages[1]);

    const flipped = new Array(totalPages).fill(false);
    
    // <<< THÊM MỚI (Hàm canh lề sách)
    const updateBookAlignment = () => {
        if (!bookWrapper) return;

        const flippedCount = flipped.filter(Boolean).length;

        if (flippedCount === 0) {
            // Trang bìa: canh trang đơn (bên phải)
            bookWrapper.className = 'book-wrapper align-single-right';
        } else if (flippedCount === totalPages) {
            // Trang cuối: canh trang đơn (bên trái)
            bookWrapper.className = 'book-wrapper align-single-left';
        } else {
            // Trang đôi: canh giữa gáy sách (mặc định)
            bookWrapper.className = 'book-wrapper'; 
        }
    };

    const updateZIndexes = () => {
        let topUnflipped = totalPages;
        let bottomFlipped = 1;
        pages.forEach((p, i) => {
            p.style.zIndex = flipped[i] ? String(bottomFlipped++) : String(topUnflipped--);
        });
        
        updateBookAlignment(); // <<< THÊM MỚI (Gọi hàm canh lề)
    };

    updateZIndexes(); // Tự động gọi canh lề lần đầu

    pages.forEach((page, index) => {
        page.addEventListener("click", () => {
            // Bắt đầu nghe nhạc
            if (!isMusicPlaying) {
                audio.play().catch(console.warn);
                isMusicPlaying = true;
                initializeVisualizer();
            }

            // Lazy load trang kế tiếp
            lazyLoadImages(pages[index + 1]);
            lazyLoadImages(pages[index + 2]);

            // Lật trang
            page.classList.toggle('flipped');
            flipped[index] = !flipped[index];
            updateZIndexes(); // Tự động gọi `updateBookAlignment`

            // Nếu mở trang cuối → tắt nhạc
            if (page === lastPage) {
                if (page.classList.contains("flipped")) audio.pause();
                else audio.play().catch(console.warn);
            }
        });
    });

    /* -------------------------------------------------------
     * 💖 HEART CURSOR
     * ------------------------------------------------------- */
    const canvas = document.getElementById('sparkle-canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");
    canvas.width = innerWidth;
    canvas.height = innerHeight;

    let particles: Particle[] = [];
    const mouse = { x: -100, y: -100 };

    window.addEventListener("mousemove", (e) => {
        mouse.x = e.x; mouse.y = e.y;
        for (let i = 0; i < 1; i++) particles.push(new Particle());
    });

    window.addEventListener("resize", () => {
        canvas.width = innerWidth;
        canvas.height = innerHeight;
    });

    class Particle {
        x = mouse.x;
        y = mouse.y;
        size = Math.random() * 5 + 2;
        speedX = Math.random() * 3 - 1.5;
        speedY = Math.random() * 3 - 1.5;
        rotation = (Math.random() - 0.5) * 0.5;
        rotationSpeed = (Math.random() - 0.5) * 0.02;
        color = `hsl(${330 + Math.random() * 20}, 100%, 75%)`;

        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.rotation += this.rotationSpeed;
            if (this.size > 0.2) this.size -= 0.1;
        }

        draw() {
            if (!ctx) return;
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);

            const scale = this.size / 60;
            ctx.scale(scale, scale);
            ctx.translate(-75, -75);

            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(75, 40);
            ctx.bezierCurveTo(75, 37, 70, 25, 50, 25);
            ctx.bezierCurveTo(20, 25, 20, 62.5, 20, 62.5);
            ctx.bezierCurveTo(20, 80, 40, 102, 75, 120);
            ctx.bezierCurveTo(110, 102, 130, 80, 130, 62.5);
            ctx.bezierCurveTo(130, 62.5, 130, 25, 100, 25);
            ctx.bezierCurveTo(85, 25, 75, 37, 75, 40);
            ctx.fill();
            ctx.restore();
        }
    }

    const render = () => {
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach((p, i) => {
            p.update();
            p.draw();
            if (p.size < 0.2) { particles.splice(i, 1); i--; }
        });
        requestAnimationFrame(render);
    };
    render();

    /* -------------------------------------------------------
     * 🍂 FALLING LEAVES
     * ------------------------------------------------------- */
    const leafContainer = document.getElementById("falling-leaves-container");
    if (leafContainer) {
        const count = 25;

        for (let i = 0; i < count; i++) {
            const leaf = document.createElement('div');
            leaf.classList.add("leaf");

            leaf.style.left = `${Math.random() * 100}vw`;
            leaf.style.animationDuration = `${Math.random() * 8 + 7}s`;
            leaf.style.animationDelay = `-${Math.random() * 10}s`;
            leaf.style.opacity = String(Math.random() * 0.6 + 0.4);

            const size = Math.random() * 10 + 5;
            leaf.style.width = `${size}px`;
            leaf.style.height = `${size}px`;
            leaf.style.backgroundColor = `hsl(330, 100%, ${75 + Math.random() * 15}%)`;

            leafContainer.appendChild(leaf);
        }
    }

});