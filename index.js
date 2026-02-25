const c = document.getElementById('can');
const ctx = c.getContext('2d');

let chartWidth;
let currentAmount = 1;
let array = [];
let oldSig;
let candidateSig;
let confirmationCount = 2;
let maxValue = 0;
let dollarMultiplier;
let firstLoad = true;
let animationSpeed = 2;

let barsInfo = []; // Track bar positions for hover
let hoveredBar = null;

let pulseOnlyMode = false;
let pulseTime = 0;              // accumulator for animation
let lastPulseTime = 0;
const pulseSpeed = 0.0005;      // smaller = slower pulse 
const pulseScaleAmplitude = 0.08; 
const pulseOpacityAmplitude = 0.08; // opacity variation → 0.08–0.18
const baseOpacity = 0.3;        

const bgImage = new Image();
bgImage.src = 'img/Sigil.png'; 
bgImageLoaded = false;

bgImage.onload = () => {
    bgImageLoaded = true;
    requestAnimationFrame(drawFrame);
};

function checkDimensions() {
    const header = document.getElementById('top-container')
    c.width = window.innerWidth - 10;
    c.height = window.innerHeight - header.getBoundingClientRect().height - 10; //Use normal flow instead of position absolute so now this can be simpler formula -CS


    chartWidth = c.width - c.width / 4;

    if (array.length > 0 && maxValue > 0) {
        dollarMultiplier = chartWidth / maxValue;
    }


    setTimeout(() => {
        currentAmount = 1;  
    }, 50);

    requestAnimationFrame(drawFrame);
}


async function getNumbers() {
    const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRzLS1sOX_csa-Z0AoS4aWJ-4zA2kkeKo1X2rnbCHgqXaoWy26WvYKuAdpFt3DHie3BZ53l4Vk1Uh9t/pub?gid=0&single=true&output=csv';
    try {
        const response = await fetch(url, { cache: "no-store" });
        const text = await response.text();
        const newSig = text;

        if (firstLoad) {
            updateGraph(text);
            oldSig = newSig;
            firstLoad = false;
            setTimeout(getNumbers, 5000);
            return;
        }

        if (!text || text === 'Loading...') {
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
                    updateGraph(text);
                }
            } else {
                candidateSig = newSig;
                confirmationCount = 0;
            }
        }

        setTimeout(getNumbers, 5000);

    } catch (err) {
        console.error('Error fetching data', err);
        setTimeout(getNumbers, 5000);
    }
}

function getNiceIncrement(maxValue) {
    let rough = maxValue / 4;

    let remainder = rough % 25;
    let niceIncrement = rough - remainder;

    if (remainder >= 13) niceIncrement += 25;

    return niceIncrement;
}



function updateGraph(text) {
    const rows = text.trim().split('\n');
    array = rows.map(row => {
        const columns = row.split(',');
        return [columns[0], parseInt(columns[1]), columns[2]]; // label, value, color
    });

    maxValue = Math.max(...array.map(el => el[1])) * 1.1 + 50;
    dollarMultiplier = chartWidth / maxValue;

    currentAmount = 1;
    requestAnimationFrame(drawFrame);
}


function drawFrame(timestamp = 0) {
    ctx.clearRect(0, 0, c.width, c.height);

    // Background
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

    // Vertical lines
    ctx.fillStyle = 'black';
    ctx.fillRect(c.width / 4, 0, 3, c.height);

    let increment = getNiceIncrement(maxValue);
    maxValue = increment * 4; 

    let numLines = maxValue / increment;
    let lineJump = chartWidth / numLines;

    let linePos = lineJump;
    let amount = 0;

    for (let i = 0; i < numLines; i++) {
        amount += increment;

        // Draw the vertical line
        ctx.fillStyle = 'black';
        ctx.fillRect(c.width / 4 + linePos, 0, 3, c.height);

        // Draw the amount label at the bottom of the line
        ctx.fillStyle = 'black';
        ctx.font = `${c.width / 50}px Arial`;
        ctx.textBaseline = 'top';             
        const text = `$${amount}`;
        const textWidth = ctx.measureText(text).width;
        const padding = 5; 
        ctx.fillText(text, c.width / 4 + linePos + padding, c.height - (c.width / 50)); // Replace magic number to be proportional with how big the text is - CS


        linePos += lineJump;
    }


    // Draw bars
    let position = c.height / 25;
    let allBarsComplete = true;
    barsInfo = []; // reset

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

    array.forEach(item => {
        const label = item[0];
        const targetAmount = item[1];
        const color = item[2];

        const displayAmount = Math.min(currentAmount, targetAmount);
        let barHeight = c.height / 30;
        let barColor = color;

        // If hovered, increase height and darken color
        if (hoveredBar === item) {
            barHeight += 5; // pixel amount
            barColor = darkenColor(color, 20); // darken by X units
        }

        ctx.fillStyle = barColor;
        ctx.fillRect(c.width / 4, position - barHeight / 2, displayAmount * dollarMultiplier, barHeight);

        // Draw labels
        ctx.fillStyle = 'black';
        ctx.font = `${c.width / 50}px Arial`;
        ctx.textBaseline = "middle";
        ctx.fillText(label, 15, position);

        // Save bar info for hover detection
        barsInfo.push({
            item,
            x: c.width / 4,
            y: position - barHeight / 2,
            width: displayAmount * dollarMultiplier,
            height: barHeight
        });

        if (displayAmount < targetAmount) allBarsComplete = false;

        position += c.height / array.length;
    });

    // Tooltip
    if (hoveredBar) {
        const bar = barsInfo.find(b => b.item === hoveredBar);
        const CSABTMNWOEB = 5; // CSABTMNWOEB aka Corrosive Scraps Arbitrary Buffer That Might Not Work On Everyones Browser
        if (bar) {
            //Heres hopping this CSABTMNWOEB makes the text background fully cover the text -CS
            const tooltipText = `$${hoveredBar[1]}`;
            ctx.fillStyle = 'black';
            ctx.fillRect(bar.x + bar.width + CSABTMNWOEB, bar.y - CSABTMNWOEB, ctx.measureText(tooltipText).width + (CSABTMNWOEB * 2), 24 + (CSABTMNWOEB * 2));

            ctx.fillStyle = 'pink';
            ctx.fillText(tooltipText, (bar.x + bar.width) + (CSABTMNWOEB * 2), bar.y + (bar.height / 2));
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

// Handle hover detection
c.addEventListener('mousemove', (e) => {
    const rect = c.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

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

// Clear hover when mouse leaves canvas
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


// Initialize
window.addEventListener('load', () => {
    checkDimensions();
    requestAnimationFrame(drawFrame);
    getNumbers();
});

// Debounced resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        checkDimensions();
        requestAnimationFrame(drawFrame);
    }, 100);
});




