import puppeteer from 'puppeteer';
import qrcode from 'qrcode-terminal';
import fs from 'fs';

const SESSION_FILE = './whatsapp-session.json';

const run = async () => {
    const browser = await puppeteer.launch({
        headless: false,
        executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    });

    const page = await browser.newPage();

    // Load session jika ada
    if (fs.existsSync(SESSION_FILE)) {
        const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE));
        if (sessionData.cookies) {
            await page.setCookie(...sessionData.cookies);
        }
        if (sessionData.localStorage) {
            await page.goto('https://web.whatsapp.com');
            await page.evaluate(ls => {
                for (const [key, value] of Object.entries(ls)) {
                    localStorage.setItem(key, value);
                }
            }, sessionData.localStorage);
        }
        console.log('Session loaded, langsung login tanpa QR.');
    }

    await page.goto('https://web.whatsapp.com');

    try {
        // cek QR
        await page.waitForSelector('div[data-ref]', { timeout: 5000 });
        const qrString = await page.evaluate(() => {
            return document.querySelector('div[data-ref]').getAttribute('data-ref');
        });
        qrcode.generate(qrString, { small: true });
        console.log('Scan QR dengan WhatsApp di HP kamu...');
        await page.waitForSelector('#pane-side');
        console.log('Login berhasil, menyimpan session...');

        const cookies = await page.cookies();
        const localStorageData = await page.evaluate(() => {
            let data = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                data[key] = localStorage.getItem(key);
            }
            return data;
        });
        fs.writeFileSync(SESSION_FILE, JSON.stringify({ cookies, localStorage: localStorageData }));
        console.log('Session tersimpan!');
    } catch {
        console.log('Sudah login, tidak perlu QR.');
    }

    // nomor tujuan
    let phoneNumber = '089637841188';
    if (phoneNumber.startsWith('0')) {
        phoneNumber = '62' + phoneNumber.slice(1);
    }

    // buka chat baru
    const url = `https://web.whatsapp.com/send?phone=${phoneNumber}`;
    await page.goto(url);

    // tunggu input box dengan XPath
    await page.waitForSelector('[aria-label^="Type a message"]');
    const inputBox = await page.$('[aria-label^="Type a message"]');
    await inputBox.focus();
    await page.keyboard.type("Hello from Puppeteer!");
    await page.keyboard.press('Enter');


    console.log(`Pesan terkirim ke ${phoneNumber}`);

    // await browser.close();
};

run();
