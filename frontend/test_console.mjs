import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error(`[Browser Error]: ${msg.text()}`);
            } else {
                console.log(`[Browser Log]: ${msg.text()}`);
            }
        });
        page.on('pageerror', err => {
            console.error(`[Page Exception]: ${err.message}`);
        });
        
        console.log('Navigating to http://localhost:5173 ...');
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 30000 }).catch(e => console.error("Navigation error:", e));
        
        console.log('Waiting for any delayed rendering errors...');
        await new Promise(r => setTimeout(r, 1500));
        
        const html = await page.content();
        if (html.includes('id="root"')) {
            const rootContent = await page.$eval('#root', el => el.innerHTML);
            if (rootContent.trim() === '') {
                console.error('[Diagnostic]: The #root element is empty, indicating a render failure.');
            } else {
                console.log('[Diagnostic]: The #root element has content. It is NOT a white screen anymore.');
            }
        }
        
        await browser.close();
        console.log('Test completed.');
    } catch(err) {
        console.error('Puppeteer script failed:', err);
    }
})();
