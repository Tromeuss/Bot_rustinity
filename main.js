const { setMaxIdleHTTPParsers } = require('http');
const { resolve } = require('path');
const puppeteer = require('puppeteer');
let isAvailable = true; // Garder une trace de l'état précédent

const { Client, GatewayIntentBits, ActivityType } = require("discord.js");
const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

let config = require("./config");
bot.login(config.token);

bot.on('ready', async (client) => {
    console.log(`connecté à ${client.user.username} !\n` + `-> le bot est utilisé sur ${client.guilds.cache.size} serveurs`);
    console.log(`Logged to ${client.user.tag}!`);
    client.user.setPresence({
        activities: [{ name: config.clients.activity, type: ActivityType.Watching }],
        status: 'dnd',
    });

    await verifier_vip();
});

async function verifier_vip() {
    async function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('https://store.rustinity.com/category/eu-2x-monthly-large');
    await page.setViewport({ width: 1080, height: 1024 });
    await page.waitForSelector('a[data-remote="/package/queue-skip33"]');
    await page.click('a[data-remote="/package/queue-skip33"]');
    await sleep(3000);

    const isTextPresent = await page.evaluate(() => {
        const paragraphs = Array.from(document.querySelectorAll('p'));
        return paragraphs.some(p => p.textContent.trim() === 'This package is sold out, check again later');
    });

    let message = null;

    if (isTextPresent) {
        console.log('Le Skip Queue n\'est pas disponible');
        if (isAvailable) {
            message = "Le Skip Queue n'est plus disponible sur https://store.rustinity.com/category/eu-2x-monthly-large";
            isAvailable = false;
        }
    } else {
        console.log('Le Skip Queue est disponible');
        if (!isAvailable) {
            message = "Le Skip Queue est disponible sur https://store.rustinity.com/category/eu-2x-monthly-large";
            isAvailable = true;
        }
    }

    await sleep(3000);
    await browser.close();

    if (message) {
        const channel = bot.channels.cache.get(config.channelId);

        if (!channel) {
            console.error('Le canal n\'existe pas ou n\'est pas accessible.');
            return;
        }

        await channel.send(message);
    }
}

setInterval(verifier_vip, 1000 * 30);

