let gridSize = 32;
let currentColor = '#ff4d94';
let currentTool = 'pencil';
let isDrawing = false;
let colors = ['#1e1e2e','#ff4d94','#a855f7','#3b82f6','#22d3ee','#eab308','#f97316','#ef4444','#84cc16'];
let grid = [];

const defaultBg = '#1e1e2e';

function createPalette() {
    const palette = document.getElementById('palette');
    palette.innerHTML = '';
    colors.forEach((color, index) => {
        const sw = document.createElement('div');
        sw.className = 'color-swatch';
        sw.style.backgroundColor = color;
        if (index === 1) sw.classList.add('active');
        sw.onclick = () => {
            currentColor = color;
            document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
            sw.classList.add('active');
        };
        palette.appendChild(sw);
    });
}

function createGrid() {
    const container = document.getElementById('pixel-grid');
    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    
    grid = [];
    for (let i = 0; i < gridSize * gridSize; i++) {
        const pixel = document.createElement('div');
        pixel.className = 'pixel';
        pixel.style.backgroundColor = defaultBg;
        pixel.dataset.index = i;
        
        pixel.addEventListener('mousedown', (e) => { 
            isDrawing = true; 
            handlePixel(pixel); 
        });
        pixel.addEventListener('mouseover', () => { 
            if (isDrawing) handlePixel(pixel); 
        });
        pixel.addEventListener('mouseup', () => isDrawing = false);
        
        container.appendChild(pixel);
        grid.push(pixel);
    }
}

function handlePixel(pixel) {
    if (currentTool === 'pencil') {
        pixel.style.backgroundColor = currentColor;
    } else if (currentTool === 'eraser') {
        pixel.style.backgroundColor = defaultBg;
    } else if (currentTool === 'fill') {
        floodFill(pixel);
    }
}

function selectTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tool-${tool}`).classList.add('active');
}

function clearGrid() {
    grid.forEach(p => p.style.backgroundColor = defaultBg);
}

function changeGridSize() {
    gridSize = parseInt(document.getElementById('grid-size').value);
    createGrid();
}

function downloadImage() {
    const gridEl = document.getElementById('pixel-grid');
    domtoimage.toPng(gridEl, { quality: 1 }).then(dataUrl => {
        const link = document.createElement('a');
        link.download = 'my-pixel-art.png';
        link.href = dataUrl;
        link.click();
    }).catch(err => alert('Ошибка сохранения'));
}

// ==================== НОРМАЛЬНАЯ ЗАЛИВКА ====================
function floodFill(startPixel) {
    const targetColor = startPixel.style.backgroundColor || defaultBg;
    if (targetColor === currentColor) return;

    const startIndex = parseInt(startPixel.dataset.index);
    const toFill = [];
    const visited = new Set();
    const queue = [startIndex];
    visited.add(startIndex);

    while (queue.length > 0) {
        const current = queue.shift();
        const pixel = grid[current];
        
        if (pixel.style.backgroundColor !== targetColor) continue;
        
        toFill.push(pixel);

        const row = Math.floor(current / gridSize);
        const col = current % gridSize;

        const directions = [[0,1], [1,0], [0,-1], [-1,0]];
        
        for (let [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (newRow >= 0 && newRow < gridSize && newCol >= 0 && newCol < gridSize) {
                const neighborIndex = newRow * gridSize + newCol;
                if (!visited.has(neighborIndex)) {
                    visited.add(neighborIndex);
                    queue.push(neighborIndex);
                }
            }
        }
    }

    // Staggering анимация
    toFill.forEach((pixel, i) => {
        setTimeout(() => {
            pixel.style.backgroundColor = currentColor;
        }, i * 2);
    });

    // Анимация через anime.js
    anime({
        targets: toFill,
        scale: [0.7, 1],
        duration: 300,
        delay: anime.stagger(3),
        easing: 'easeOutQuad'
    });
}

function scrollToEditor() {
    document.getElementById('editor-section').scrollIntoView({ behavior: "smooth" });
}

// ====================== LOCALSTORAGE ======================

function saveToLocalStorage() {
    const canvasData = grid.map(pixel => pixel.style.backgroundColor || defaultBg);
    
    const data = {
        currentColor: currentColor,
        colors: colors,
        gridSize: gridSize,
        canvasData: canvasData
    };
    
    localStorage.setItem('pixelArtData', JSON.stringify(data));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('pixelArtData');
    if (!saved) return false;
    
    try {
        const data = JSON.parse(saved);
        
        // Восстанавливаем палитру
        if (data.colors && data.colors.length > 0) {
            colors = data.colors;
        }
        
        // Восстанавливаем размер
        if (data.gridSize) {
            gridSize = data.gridSize;
            document.getElementById('grid-size').value = gridSize;
        }
        
        // Пересоздаём палитру и сетку
        createPalette();
        
        // Создаём сетку
        createGrid();
        
        // Восстанавливаем рисунок
        if (data.canvasData && data.canvasData.length === grid.length) {
            grid.forEach((pixel, i) => {
                if (data.canvasData[i]) {
                    pixel.style.backgroundColor = data.canvasData[i];
                }
            });
        }
        
        // Восстанавливаем выбранный цвет
        if (data.currentColor) {
            currentColor = data.currentColor;
            // Обновляем активный цвет в палитре
            document.querySelectorAll('.color-swatch').forEach(sw => {
                if (sw.style.backgroundColor === currentColor) {
                    sw.classList.add('active');
                }
            });
        }
        
        return true;
    } catch(e) {
        console.log('Ошибка загрузки данных');
        return false;
    }
}

// Автосохранение при изменениях
function autoSave() {
    saveToLocalStorage();
}

// Добавляем автосохранение в ключевые функции
const originalHandlePixel = handlePixel;
handlePixel = function(pixel) {
    originalHandlePixel(pixel);
    setTimeout(autoSave, 100); // небольшая задержка
};

const originalFloodFill = floodFill;
floodFill = function(startPixel) {
    originalFloodFill(startPixel);
    setTimeout(autoSave, 800); // после анимации заливки
};

const originalClearGrid = clearGrid;
clearGrid = function() {
    originalClearGrid();
    setTimeout(autoSave, 100);
};

// ====================== ИНИЦИАЛИЗАЦИЯ ======================
window.onload = () => {
    const loaded = loadFromLocalStorage();
    
    if (!loaded) {
        createPalette();
        createGrid();
    }
    
    document.addEventListener('mouseup', () => isDrawing = false);
    document.addEventListener('mouseleave', () => isDrawing = false);
    
    console.log('%cPixelArt готов к работе! Данные сохраняются автоматически.', 'color:#ff4d94; font-size:16px');
};
