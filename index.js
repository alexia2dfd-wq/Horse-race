const c = document.getElementById('can');
const ctx = c.getContext('2d');
const headerElement = document.getElementById('top-container');
let cachedHeaderHeight = 0;
let cachedPortraitMode = false;

let chartWidth;
let currentAmount = 1;
let array = [];
let allPages = {};
let historyPages = [];
let currentPage = 'current';
let oldSig;
let totalAmount = 0;
let candidateSig;
let confirmationCount = 2;
let maxValue = 0;
let dollarMultiplier;
let firstLoad = true;
let animationSpeed = 2;

let barsInfo = [];
let hoveredBar = null;
let isPortraitMode = false;
let cursorX = 0;
let cursorY = 0;

let pulseOnlyMode = false;
let pulseTime = 0;
let lastPulseTime = 0;
const pulseSpeed = 0.0005;
const pulseScaleAmplitude = 0.08; 
const pulseOpacityAmplitude = 0.08;
const baseOpacity = 0.3;
let scrollOffset = 0;        

const bgImage = new Image();
bgImage.src = 'img/Sigil.png'; 
bgImageLoaded = false;

bgImage.onload = () => {
    bgImageLoaded = true;
    requestAnimationFrame(drawFrame);
};

function checkDimensions() {
    c.width = window.innerWidth - 10;
    c.height = window.innerHeight - cachedHeaderHeight - 10; //Use cached header height instead of recalculating -CS

    // In portrait mode with no names, we can use more space. Reduce left margin for labels.
    chartWidth = cachedPortraitMode ? c.width - c.width / 8 : c.width - c.width / 4;

    if (array.length > 0 && maxValue > 0) {
        dollarMultiplier = chartWidth / maxValue;
    }


    setTimeout(() => {
        currentAmount = 1;  
    }, 50);

    requestAnimationFrame(drawFrame);
}


async function getNumbers() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (firstLoad) {
        loadingIndicator.classList.add('active');
    }
    
    const SHEET_ID = '1z0Y-71-G4g_PQgt6foISZBKFVm42-3hmEObNexuOh2w';
    const SHEET_RANGE = "'V2'!A:Z"; // Sheet name with range to avoid ambiguity
    const API_KEY = 'AIzaSyBtJg5Py1-IQ8trAQwMu_eaR8Dl8oN2L04';
    
    try {
        // Fetch sheet data
        const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_RANGE)}?key=${API_KEY}`;
        const dataResponse = await fetch(dataUrl, { cache: "no-store" });
        const dataJson = await dataResponse.json();
        
        console.log('API Response:', dataJson);
        
        // Convert values to CSV format for compatibility with existing updateGraph function
        const values = dataJson.values || [];
        console.log('Values array:', values);
        
        if (values.length === 0) {
            console.warn('Sheet is empty or has no data');
            setTimeout(getNumbers, 60000);
            return;
        }
        
        const csvText = values.map(row => row.join(',')).join('\n');
        
        console.log('Fetched data:', csvText);
        const newSig = csvText;

        if (firstLoad) {
            updateGraph(csvText, true);
            oldSig = newSig;
            firstLoad = false;
            loadingIndicator.classList.remove('active');
            setTimeout(getNumbers, 60000);
            return;
        }

        if (!csvText || csvText === 'Loading...') {
            setTimeout(getNumbers, 1000);
            return;
        }

        if (newSig === oldSig) {
            confirmationCount = 0;
        } else {
            if (newSig === candidateSig) {
                confirmationCount++;
                if (confirmationCount > 1) {
                    oldSig = newSig;
                    updateGraph(csvText, false);
                }
            } else {
                candidateSig = newSig;
                confirmationCount = 0;
            }
        }

        loadingIndicator.classList.remove('active');
        setTimeout(getNumbers, 60000);

    } catch (err) {
        console.error('Error fetching data', err);
        loadingIndicator.classList.remove('active');
        setTimeout(getNumbers, 60000);
    }
}

function getNiceIncrement(maxValue) {
    let rough = maxValue / 4;

    let remainder = rough % 25;
    let niceIncrement = rough - remainder;

    if (remainder >= 13) niceIncrement += 25;

    return niceIncrement;
}


function updateGraph(text, isFirstLoad = false) {
    const nameColorMap = {
        'fail-hero gloright': '#4a86e8',
        'nameless fail-heroes': '#b6d7a8',
        'fail-hero osmiumsolver': '#ea4a75',
        'fail-hero crsv': '#00ff00',
        'fail-hero toast': '#bf80ff',
        'fail-hero skyline13': '#cc0000',
        'fail-hero hzaa (hiatus)': '#00ffff',
        'fail-hero bobsmith444': '#ff0000'
    };
    
    const rows = text.trim().split('\n');
    const headerRow = rows[0].split(',');
    
    if (isFirstLoad) {
        allPages = {};
        historyPages = ['current'];
        
        for (let col = 2; col < headerRow.length; col++) {
            const header = headerRow[col]?.trim().toLowerCase();
            if (header && header.includes('history')) {
                historyPages.push(`history-${col}`);
            } else {
                break;
            }
        }
        
        for (const page of historyPages) {
            allPages[page] = [];
            const colIndex = page === 'current' ? 1 : parseInt(page.split('-')[1]);
            
            for (let i = 1; i < rows.length; i++) {
                const columns = rows[i].split(',');
                const rawName = columns[0]?.trim();
                const rawValue = columns[colIndex]?.trim();
                const value = parseInt(rawValue) || 0;
                
                if (rawName && value > 0) {
                    const capitalizedName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
                    const displayName = capitalizedName === 'Anonymous' ? 'Nameless Fail-Heroes' : `Fail-Hero ${capitalizedName}`;
                    const lowerName = displayName.toLowerCase();
                    const color = nameColorMap[lowerName] || generatePastelColor();
                    allPages[page].push([displayName, value, color]);
                }
            }
            allPages[page].sort((a, b) => b[1] - a[1]);
        }
        
        buildPageNav(historyPages);
        switchPage('current');
    } else {
        const colIndex = 1;
        const currentData = [];
        
        for (let i = 1; i < rows.length; i++) {
            const columns = rows[i].split(',');
            const rawName = columns[0]?.trim();
            const rawValue = columns[colIndex]?.trim();
            const value = parseInt(rawValue) || 0;
            
            if (rawName && value > 0) {
                const capitalizedName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
                const displayName = capitalizedName === 'Anonymous' ? 'Nameless Fail-Heroes' : `Fail-Hero ${capitalizedName}`;
                const lowerName = displayName.toLowerCase();
                
                let color = '#888888';
                for (const item of allPages['current']) {
                    if (item[0] === displayName) {
                        color = item[2];
                        break;
                    }
                }
                
                currentData.push([displayName, value, color]);
            }
        }
        
        currentData.sort((a, b) => b[1] - a[1]);
        allPages['current'] = currentData;
        
        if (currentPage === 'current') {
            switchPage('current');
        }
    }
}

function buildPageNav(pages) {
    const nav = document.getElementById('page-nav');
    nav.innerHTML = '';
    
    for (const page of pages) {
        const btn = document.createElement('button');
        btn.className = 'page-btn' + (page === currentPage ? ' active' : '');
        btn.textContent = page === 'current' ? 'Current' : 'History ' + (pages.indexOf(page));
        btn.onclick = () => switchPage(page);
        nav.appendChild(btn);
    }

    const navBtn = document.getElementById('page-nav-btn');
    navBtn.onclick = () => {
        const container = document.getElementById('page-nav-container');
        container.classList.toggle('expanded');
    };
}

function switchPage(page) {
    currentPage = page;
    array = allPages[page] || [];
    currentAmount = 1;
    totalAmount = array.reduce((sum, item) => sum + item[1], 0);
    
    const buttons = document.querySelectorAll('.page-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    const activeBtn = Array.from(buttons).find(btn => btn.textContent === (page === 'current' ? 'Current' : 'History ' + (historyPages.indexOf(page))));
    if (activeBtn) activeBtn.classList.add('active');
    
    if (array.length > 0) {
        maxValue = Math.max(...array.map(el => el[1]), 1) * 1.1 + 50;
        dollarMultiplier = chartWidth / maxValue;
    }
    
    requestAnimationFrame(drawFrame);
}

function generatePastelColor() {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 70 + Math.floor(Math.random() * 20);
    const lightness = 75 + Math.floor(Math.random() * 15);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}


function drawFrame(timestamp = 0) {
    ctx.clearRect(0, 0, c.width, c.height);

    ctx.fillStyle = '#ffb1b1';
    ctx.fillRect(0, 0, c.width, c.height);

    if (lastPulseTime === 0) lastPulseTime = timestamp;
    const delta = timestamp - lastPulseTime;
    lastPulseTime = timestamp;

    pulseTime += delta;   

    const pulse = Math.sin(pulseTime * pulseSpeed);         
    const scaleFactor = 1 + pulse * pulseScaleAmplitude;      
    const currentOpacity = baseOpacity + pulse * pulseOpacityAmplitude;

    if (bgImageLoaded) {
        ctx.globalAlpha = currentOpacity;

        const referenceSize = Math.min(c.width, c.height);
        let baseSize = referenceSize * 1;              

        let imgWidth  = baseSize * scaleFactor;
        let imgHeight = bgImage.height * (imgWidth / bgImage.width);

        const maxAllowed = referenceSize * 1.2;
        if (imgWidth > maxAllowed) {
            imgWidth = maxAllowed;
            imgHeight = bgImage.height * (imgWidth / bgImage.width);
        }

        const x = (c.width  - imgWidth)  / 2;
        const y = (c.height - imgHeight) / 2;

        ctx.drawImage(bgImage, x, y, imgWidth, imgHeight);
        ctx.globalAlpha = 1;  
    }

    // Calculate chart start position based on portrait mode
    const chartStart = isPortraitMode ? c.width / 8 : c.width / 4;

    // Vertical lines
    ctx.fillStyle = 'black';
    // Draw the starting line at 0
    ctx.fillRect(chartStart, 0, 3, c.height);
    ctx.fillStyle = 'black';
    ctx.font = `${c.width / 50}px Arial`;
    ctx.textBaseline = 'top';
    ctx.fillText('$0', chartStart + 5, c.height - (c.width / 50));

    let increment = getNiceIncrement(maxValue);
    maxValue = increment * 4; 

    let numLines = maxValue / increment;
    let amount = 0;

    for (let i = 0; i < numLines; i++) {
        amount += increment;
        
        // Position line based on the actual value
        const linePos = (amount / maxValue) * chartWidth + chartStart;

        ctx.fillStyle = 'black';
        ctx.fillRect(linePos, 0, 3, c.height);

        // Draw the amount label at the bottom of the line
        ctx.fillStyle = 'black';
        ctx.font = `${c.width / 50}px Arial`;
        ctx.textBaseline = 'top';             
        const text = `$${amount}`;
        const textWidth = ctx.measureText(text).width;
        const padding = 5; 
        ctx.fillText(text, linePos + padding, c.height - (c.width / 50)); // Replace magic number to be proportional with how big the text is - CS
    }


    let position = c.height / 25 - scrollOffset;
    let allBarsComplete = true;
    barsInfo = [];

    function darkenColor(color, amount) {
        if (color.startsWith('#')) {
            let num = parseInt(color.slice(1), 16);
            let r = Math.max(0, ((num >> 16) & 0xFF) - amount);
            let g = Math.max(0, ((num >> 8) & 0xFF) - amount);
            let b = Math.max(0, (num & 0xFF) - amount);
            return `rgb(${r},${g},${b})`;
        }
        return color;
    }

    const maxBarsBeforeScroll = 8; // Bars stop shrinking after this count, scrolling handles the rest
    const barSpacing = c.height / maxBarsBeforeScroll; // Always space as if showing 8 bars
    let barHeight = c.height / 30; // Keep original bar thickness

    array.forEach(item => {
        const label = item[0];
        const targetAmount = item[1];
        const color = item[2];

        const displayAmount = Math.min(currentAmount, targetAmount);
        let currentBarHeight = barHeight;
        let barColor = color;

        if (hoveredBar === item) {
            currentBarHeight += 5;
            barColor = darkenColor(color, 20);
        }

        if (position > -currentBarHeight && position < c.height) {
            ctx.fillStyle = barColor;
            ctx.fillRect(chartStart, position - currentBarHeight / 2, displayAmount * dollarMultiplier, currentBarHeight);

            const percentage = (targetAmount / totalAmount) * 100;
            ctx.fillStyle = 'white';
            ctx.font = `${c.width / 60}px Arial`;
            ctx.textBaseline = "middle";
            
            if (isPortraitMode && percentage >= 10) {
                ctx.fillText(`${Math.round(percentage)}%`, chartStart + displayAmount * dollarMultiplier - 40, position);
            } else {
                ctx.fillText(`${Math.round(percentage)}%`, chartStart + displayAmount * dollarMultiplier + 10, position);
            }

            if (!isPortraitMode) {
                ctx.fillStyle = 'black';
                ctx.font = `${c.width / 50}px Arial`;
                ctx.textBaseline = "middle";
                ctx.fillText(label, 15, position);
            }

            barsInfo.push({
                item,
                x: chartStart,
                y: position - currentBarHeight / 2,
                width: displayAmount * dollarMultiplier,
                height: currentBarHeight
            });
        }

        if (displayAmount < targetAmount) allBarsComplete = false;

        position += barSpacing;
    });

    if (hoveredBar) {
        const bar = barsInfo.find(b => b.item === hoveredBar);
        const CSABTMNWOEB = 5; // CSABTMNWOEB aka Corrosive Scraps Arbitrary Buffer That Might Not Work On Everyones Browser
        if (bar) {
            //Heres hopping this CSABTMNWOEB makes the text background fully cover the text -CS
            const tooltipText = isPortraitMode ? `${hoveredBar[0]}: $${hoveredBar[1]}` : `$${hoveredBar[1]}`;
            const tooltipWidth = ctx.measureText(tooltipText).width + (CSABTMNWOEB * 2);
            const tooltipHeight = 24 + (CSABTMNWOEB * 2);
            
            // Position tooltip near cursor with offset
            let tooltipX = cursorX + 10;
            let tooltipY = cursorY - tooltipHeight - 10;
            let textX = tooltipX + CSABTMNWOEB;
            let textY = tooltipY + 18;
            
            // Keep tooltip within canvas bounds
            if (tooltipX + tooltipWidth > c.width) {
                tooltipX = c.width - tooltipWidth - CSABTMNWOEB;
                textX = tooltipX + CSABTMNWOEB;
            }
            if (tooltipX < 0) {
                tooltipX = CSABTMNWOEB;
                textX = tooltipX + CSABTMNWOEB;
            }
            if (tooltipY < 0) {
                tooltipY = cursorY + 10;
                textY = tooltipY + 18;
            }
            if (tooltipY + tooltipHeight > c.height) {
                tooltipY = c.height - tooltipHeight - CSABTMNWOEB;
                textY = tooltipY + 18;
            }
            
            ctx.fillStyle = 'black';
            ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

            ctx.fillStyle = 'pink';
            ctx.fillText(tooltipText, textX, textY);
        }
    }

    currentAmount += animationSpeed;

    if (!allBarsComplete) {
        requestAnimationFrame(drawFrame);
    } else {
        pulseOnlyMode = true;
        requestAnimationFrame(drawFrame);
    }
}

c.addEventListener('mousemove', (e) => {
    const rect = c.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    cursorX = mouseX;
    cursorY = mouseY;

    hoveredBar = null;
    for (const bar of barsInfo) {
        if (
            mouseX >= bar.x && mouseX <= bar.x + bar.width &&
            mouseY >= bar.y && mouseY <= bar.y + bar.height
        ) {
            hoveredBar = bar.item;
            break;
        }
    }
});

c.addEventListener('mouseleave', () => {
    hoveredBar = null;});

function handleTouch(e) {
    const rect = c.getBoundingClientRect();
    const touch = e.touches[0];
    const mouseX = touch.clientX - rect.left;
    const mouseY = touch.clientY - rect.top;

    hoveredBar = null;
    for (const bar of barsInfo) {
        if (
            mouseX >= bar.x && mouseX <= bar.x + bar.width &&
            mouseY >= bar.y && mouseY <= bar.y + bar.height
        ) {
            hoveredBar = bar.item;
            break;
        }
    }}

c.addEventListener('touchstart', handleTouch);
c.addEventListener('touchmove', handleTouch);
c.addEventListener('touchend', () => {
    hoveredBar = null;
});

c.addEventListener('wheel', (e) => {
    e.preventDefault();
    const maxBarsBeforeScroll = 8; // Bars stop shrinking after this count, scrolling handles the rest
    const barSpacing = c.height / maxBarsBeforeScroll; // Always space as if showing 8 bars
    const maxScroll = Math.max(0, array.length * barSpacing - c.height + 100);
    
    scrollOffset += e.deltaY * 0.5;
    scrollOffset = Math.max(0, Math.min(scrollOffset, maxScroll));
    
    requestAnimationFrame(drawFrame);
}, { passive: false });


// Initialize
function updateCachedHeaderHeight() {
    cachedHeaderHeight = headerElement.getBoundingClientRect().height;
    cachedPortraitMode = window.matchMedia("(max-width: 768px) and (orientation: portrait)").matches;
    isPortraitMode = cachedPortraitMode;  // Keep isPortraitMode in sync for other parts of code
}

window.addEventListener('load', () => {
    updateCachedHeaderHeight();
    checkDimensions();
    requestAnimationFrame(drawFrame);
    getNumbers();
});

// Debounced resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        updateCachedHeaderHeight();
        checkDimensions();
        requestAnimationFrame(drawFrame);
    }, 32);
});

// Refresh button
document.getElementById('refresh-btn').addEventListener('click', () => {
    oldSig = undefined;
    candidateSig = undefined;
    confirmationCount = 2;
    firstLoad = true;
    getNumbers();
});




