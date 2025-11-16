/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

document.addEventListener('DOMContentLoaded', () => {
    // --- Audio & Visualizer Logic ---
    const audio = document.getElementById('background-music') as HTMLAudioElement;
    const lastPage = document.getElementById('page-16');
    const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
    const volumeIcon = document.getElementById('volume-icon') as HTMLElement;
    
    let isMusicPlaying = false;
    let visualizerInitialized = false;
    let lastVolume = 0.4;

    const updateVolumeIcon = (volume: number) => {
        if (!volumeIcon) return;
        if (volume === 0) {
            volumeIcon.textContent = '🔇';
        } else if (volume < 0.5) {
            volumeIcon.textContent = '🔉';
        } else {
            volumeIcon.textContent = '🔊';
        }
    };

    if (audio) {
        audio.volume = lastVolume;
        if (volumeSlider) {
            volumeSlider.value = String(audio.volume * 100);
            updateVolumeIcon(audio.volume);
        }
    }

    // --- Volume Controls ---
    if (volumeSlider && audio && volumeIcon) {
        volumeSlider.addEventListener('input', (e) => {
            const value = (e.target as HTMLInputElement).value;
            const newVolume = parseInt(value, 10) / 100;
            audio.volume = newVolume;
            if (newVolume > 0) {
                lastVolume = newVolume;
            }
            updateVolumeIcon(newVolume);
        });

        volumeIcon.addEventListener('click', () => {
            if (audio.volume > 0) {
                // Mute
                audio.volume = 0;
                volumeSlider.value = '0';
                updateVolumeIcon(0);
            } else {
                // Unmute to last known volume or default
                const newVolume = lastVolume > 0 ? lastVolume : 0.4;
                audio.volume = newVolume;
                volumeSlider.value = String(newVolume * 100);
                updateVolumeIcon(newVolume);
            }
        });
    }

    const initializeVisualizer = () => {
        if (visualizerInitialized || !audio) return;
        visualizerInitialized = true;

        const bars = document.querySelectorAll<HTMLElement>(".sound-visualizer .bar");
        if (bars.length === 0) return;

        // Use a single AudioContext
        // Fix: Cast window to any to support webkitAudioContext for older browsers.
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContext.createMediaElementSource(audio);
        const analyser = audioContext.createAnalyser();

        analyser.fftSize = 64;
        source.connect(analyser);
        analyser.connect(audioContext.destination);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const animateBars = () => {
            requestAnimationFrame(animateBars);
            analyser.getByteFrequencyData(dataArray);

            const allBars = document.querySelectorAll<HTMLElement>('.sound-visualizer .bar');
            allBars.forEach((bar, i) => {
                // Modulo to map more bars than available frequency bins
                const dataIndex = i % (analyser.frequencyBinCount);
                const height = (dataArray[dataIndex] / 255) * 40; // max height 40px
                bar.style.height = `${height}px`;
            });
        };
        animateBars();
    };


    // --- Flipbook Logic ---
    const pages = document.querySelectorAll<HTMLElement>('.page');
    const totalPages = pages.length;

    // --- Image Lazy Loading ---
    const lazyLoadImages = (pageElement: HTMLElement | null) => {
        if (!pageElement) return;
        const images = pageElement.querySelectorAll<HTMLImageElement>('img[data-src]');
        images.forEach(img => {
            const dataSrc = img.getAttribute('data-src');
            if (dataSrc) {
                img.src = dataSrc;
                img.removeAttribute('data-src');
                // Add a class for fade-in effect when loaded
                img.onload = () => {
                    img.classList.add('loaded');
                };
            }
        });
    };

    // Preload images for the first couple of pages for a smooth start
    if (pages[0]) lazyLoadImages(pages[0]); // Loads back of page 1
    if (pages[1]) lazyLoadImages(pages[1]); // Loads front and back of page 2


    // Use an array to track the flipped state of each page
    const flippedState = new Array(totalPages).fill(false);

    // Function to update Z-indexes based on the flipped state
    const updateZIndexes = () => {
        let unFlippedCounter = totalPages;
        let flippedCounter = 1;
        pages.forEach((page, index) => {
            if (flippedState[index]) {
                page.style.zIndex = String(flippedCounter);
                flippedCounter++;
            } else {
                page.style.zIndex = String(unFlippedCounter);
                unFlippedCounter--;
            }
        });
    };
    
    // Set initial z-indexes
    updateZIndexes();

    pages.forEach((page, index) => {
        page.addEventListener('click', () => {
            // Start music on the first interaction if it hasn't started yet
            if (!isMusicPlaying && audio) {
                audio.play().catch(error => console.error("Audio play failed:", error));
                isMusicPlaying = true;
                initializeVisualizer();
            }

            // Preload images for the next pages to ensure smooth flipping
            const nextPage = pages[index + 1];
            const pageAfterNext = pages[index + 2];
            if (nextPage) lazyLoadImages(nextPage);
            if (pageAfterNext) lazyLoadImages(pageAfterNext);

            // Toggle animation class
            page.classList.toggle('flipped');
            // Update the state
            flippedState[index] = !flippedState[index];
            // Recalculate z-indexes for all pages
            updateZIndexes();

            // Sync music with the last page flip
            if (page === lastPage && audio) {
                if (page.classList.contains('flipped')) {
                    // If last page is flipped, stop the music
                    audio.pause();
                } else {
                    // If last page is flipped back, resume music
                    audio.play().catch(error => console.error("Audio play failed:", error));
                }
            }
        });
    });


    // --- Heart Cursor Effect Logic ---
    const canvas = document.getElementById('sparkle-canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particles: Particle[] = [];
    const mouse = {
        x: -100,
        y: -100
    };

    window.addEventListener('mousemove', (event) => {
        mouse.x = event.x;
        mouse.y = event.y;
        // Create a burst of particles on move
        for (let i = 0; i < 2; i++) {
            particles.push(new Particle());
        }
    });

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    class Particle {
        x: number;
        y: number;
        size: number;
        speedX: number;
        speedY: number;
        color: string;
        rotation: number;
        rotationSpeed: number;

        constructor() {
            this.x = mouse.x;
            this.y = mouse.y;
            this.size = Math.random() * 5 + 2; // Adjusted size for hearts
            this.speedX = Math.random() * 3 - 1.5;
            this.speedY = Math.random() * 3 - 1.5;
            // Colors in the pink range
            this.color = `hsl(${Math.random() * 20 + 330}, 100%, 75%)`;
            this.rotation = (Math.random() - 0.5) * 0.5; // Slight initial rotation
            this.rotationSpeed = (Math.random() - 0.5) * 0.02; // Slow rotation
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.rotation += this.rotationSpeed;
            if (this.size > 0.2) this.size -= 0.1; // Fade out a bit faster
        }

        draw() {
            if (ctx) {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                
                // Use a scale based on particle size. The heart path's native width is ~110px.
                const scale = this.size / 60;
                ctx.scale(scale, scale);
                
                // The original path's center is roughly (75, 75).
                // We translate by this amount to center the drawing at the particle's origin.
                ctx.translate(-75, -75);

                ctx.fillStyle = this.color;
                ctx.beginPath();
                // A standard bezier curve path for a heart shape
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
    }

    function handleParticles() {
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();
            if (particles[i].size <= 0.2) {
                particles.splice(i, 1);
                i--;
            }
        }
    }

    // --- Falling Leaves Effect Logic ---
    const leafContainer = document.getElementById('falling-leaves-container');
    if (leafContainer) {
        const numberOfLeaves = 50; 

        for (let i = 0; i < numberOfLeaves; i++) {
            const leaf = document.createElement('div');
            leaf.classList.add('leaf');
            
            // Randomize properties for a natural look
            leaf.style.left = `${Math.random() * 100}vw`;
            leaf.style.animationDuration = `${Math.random() * 8 + 7}s`; // Duration between 7s and 15s
            leaf.style.animationDelay = `-${Math.random() * 10}s`; // Negative delay starts them mid-animation
            leaf.style.opacity = String(Math.random() * 0.6 + 0.4); // Opacity from 0.4 to 1.0
            
            const size = Math.random() * 10 + 5; // size from 5px to 15px
            leaf.style.width = `${size}px`;
            leaf.style.height = `${size}px`;
            leaf.style.backgroundColor = `hsl(330, 100%, ${Math.random() * 15 + 75}%)`; // Shades of pink
            
            leafContainer.appendChild(leaf);
        }
    }

    function animate() {
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        handleParticles();
        requestAnimationFrame(animate);
    }

    animate();
});
