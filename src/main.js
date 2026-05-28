import puppeteer from 'puppeteer';
import qrcode from 'qrcode-terminal';
import fs from 'fs';

const SESSION_FILE = './whatsapp-session.json';

async function saveSession(page) {
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
    console.log('✅ Session tersimpan ke file');
}

async function loadSession(page) {
    if (!fs.existsSync(SESSION_FILE)) return false;
    const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE));
    if (sessionData.cookies) {
        await page.setCookie(...sessionData.cookies);
    }
    await page.goto('https://web.whatsapp.com');
    if (sessionData.localStorage) {
        await page.evaluate(ls => {
            for (const [key, value] of Object.entries(ls)) {
                localStorage.setItem(key, value);
            }
        }, sessionData.localStorage);
    }
    console.log('✅ Session berhasil diload');
    return true;
}

async function sendMessage(page, phoneNumber, message) {
    if (phoneNumber.startsWith('0')) phoneNumber = '62' + phoneNumber.slice(1);
    await page.goto(`https://web.whatsapp.com/send?phone=${phoneNumber}`);
    await page.waitForSelector('[aria-label^="Type a message"]');
    const inputBox = await page.$('[aria-label^="Type a message"]');
    await inputBox.focus();
    await page.keyboard.type(message);
    await page.keyboard.press('Enter');
}

const run = async () => {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    });
    const page = await browser.newPage();

    // coba load session
    const hasSession = await loadSession(page);

    await page.goto('https://web.whatsapp.com');
    try {
        await page.waitForSelector('div[data-ref]', { timeout: 90000 });
        const qrString = await page.evaluate(() => {
            return document.querySelector('div[data-ref]').getAttribute('data-ref');
        });
        qrcode.generate(qrString, { small: true });
        console.log('📱 Scan QR dengan WhatsApp di HP kamu...');
        await page.waitForSelector('#pane-side'); // tunggu login selesai
        console.log('✅ Login berhasil');
        await saveSession(page); // simpan session setelah login
    } catch {
        await page.waitForSelector('#pane-side');
        console.log('Login berhasil!');
    }

    // kirim pesan
    let phoneNumber = '089637841188';
    await sendMessage(page, phoneNumber, "Hello from Puppeteer!");
    console.log(`✅ Pesan terkirim ke ${phoneNumber}`);

    // await browser.close();
};

run();
