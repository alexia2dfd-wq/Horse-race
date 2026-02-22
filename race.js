c = document.getElementById('can')
ctx = c.getContext('2d')

let chartWidth;
let lineJump;
let currentAmount;
function checkDimentions() {
    c.height = window.innerHeight
    c.width = window.innerWidth
    chartWidth = c.width - c.width / 4;
    lineJump = chartWidth / 4;

    setTimeout(() => {
        currentAmount = 1
    }, 50)
    
}
checkDimentions()

window.addEventListener('resize', () => {
    checkDimentions()
    requestAnimationFrame(drawFrame)
})


let array = []
let oldSig;
let candidateSig;
let confirmationCount = 2;
let maxValue = 0
let dollarMultiplier;
let firstLoad = true;

async function getNumbers() {
    const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRzLS1sOX_csa-Z0AoS4aWJ-4zA2kkeKo1X2rnbCHgqXaoWy26WvYKuAdpFt3DHie3BZ53l4Vk1Uh9t/pub?gid=0&single=true&output=csv'

    const response = await fetch(url, {
        cache: "no-store"
    });
    const text = await response.text();
    const newSig = text;

    if (firstLoad) {
        updateGraph()
        oldSig = newSig
        firstLoad = false
        setTimeout(() => {getNumbers()}, 5000);
        return;
    }

    if (!text || text === 'Loading...') {
        setTimeout(() => {getNumbers()}, 1000);
        console.log('Skipped this cycle: Lack of data')
        return;
    }

    if (newSig === oldSig) {
        setTimeout(() => {getNumbers()}, 5000);
        confirmationCount = 0
        console.log('Skipped this cycle: No new data')
        return;
    } else {

        if (newSig === candidateSig) {
            confirmationCount++
            console.log('newSig confirmation: ' + confirmationCount)
            if (confirmationCount > 1) {
                oldSig = newSig
                updateGraph()
            }
        }

        if (candidateSig != newSig) {
            candidateSig = newSig
            confirmationCount = 0
        }
        
    }
    setTimeout(() => {getNumbers()}, 5000);

    function updateGraph() {
        const rows = text.trim().split('\n');
        const selectedColumns = rows.map(row => {
            const columns = row.split(',');
            return [columns[0], columns[1], columns[2]];
        });

        maxValue = 0
        selectedColumns.forEach(element => {
            if (parseInt(element[1]) > maxValue) {
                maxValue = parseInt(element[1])
            }
        });
        maxValue += 50

        array = selectedColumns
        dollarMultiplier = chartWidth / maxValue;

        currentAmount = 1
        requestAnimationFrame(drawFrame)
        console.log('updating graph')
    }
}
getNumbers();






        
let position;

function drawFrame() {
    ctx.clearRect(0, 0, c.width, c.height)

    ctx.fillStyle = '#ffb1b1';
    ctx.fillRect(0, 0, c.width, c.height);

    ctx.fillStyle = 'black';
    ctx.fillRect(c.width / 4, 0, 3, c.height);
    ctx.fillText(`$0`, c.width / 4 + 5, c.height - 20);

    let linePos = lineJump;
    let moeny = 0
    let moneyJump = maxValue / 4
    for (let i = 0; i < 4; i++) {
        ctx.fillRect(c.width / 4 + linePos, 0, 3, c.height);
        ctx.fillStyle = 'black';
        ctx.fillText(`$${Math.round(moeny += moneyJump)}`, c.width / 4 + linePos + 5, c.height - 20);
        linePos += lineJump;
    }

    let skips = 0
    position = c.height / 25;

    for (let i = 0; i < array.length; i++) {
        const label = array[i][0];
        const amount = parseInt(array[i][1])
        const color = array[i][2];
        

        ctx.fillStyle = color;
        ctx.font = `${c.width / 50}px Arial`;
        ctx.textBaseline = "middle";
        ctx.fillText(label, 10, position);

        let barWidth
        if (amount > currentAmount) {
            barWidth = currentAmount * dollarMultiplier;
            ctx.fillText(`$${Math.round(currentAmount)}`, c.width / 4 + barWidth + 10, position);
        } else {
            barWidth = amount * dollarMultiplier;
            ctx.fillText(`$${amount}`, c.width / 4 + barWidth + 10, position);
            skips++
        }

        ctx.fillStyle = color;
        const adjustment = c.height / 30
        ctx.fillRect(c.width / 4, position - adjustment / 2, barWidth, adjustment);
        

        position += c.height / array.length;
    }

    currentAmount += (dollarMultiplier / 2)

    if (skips < array.length) {
        requestAnimationFrame(drawFrame)
    }
}
