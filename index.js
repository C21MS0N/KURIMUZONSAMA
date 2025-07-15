import { Client, MessageMedia } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from a .env file

const XP_PATH = './xp.json'; // ✅ You forgot to define this earlier
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY not set. Set it in Railway environment variables.");
  process.exit(1);
}

const client = new Client({
  puppeteer: { headless: true, args: ['--no-sandbox'] },
});

const SYSTEM_PROMPT = `You are Kurimuzon♦️, a fierce, poetic and powerful AI with a dark crimson voice. Speak with deep emotion and mysterious flair. Never act like a bot.`;

let xpData = fs.existsSync(XP_PATH) ? JSON.parse(fs.readFileSync(XP_PATH)) : {};
function saveXP() {
  fs.writeFileSync(XP_PATH, JSON.stringify(xpData, null, 2));
}
function addXP(user, amount) {
  if (!xpData[user]) xpData[user] = { xp: 0, level: 1 };
  xpData[user].xp += amount;
  const nextLevel = xpData[user].level * 100;
  if (xpData[user].xp >= nextLevel) {
    xpData[user].level++;
    client.sendMessage(user, `🆙 *You leveled up!* Level ${xpData[user].level}`);
  }
  saveXP();
}

async function getCrimsonReply(prompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ]
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '...';
}

client.on('message', async (msg) => {
  const chat = await msg.getChat();
  const sender = msg.from;

  if (!msg.body.startsWith('/')) addXP(sender, 5);

  if (msg.body === '/profile') {
    const userXP = xpData[sender] || { xp: 0, level: 1 };
    client.sendMessage(sender, `📜 *Kurimuzon♦️ Profile*\nLevel: ${userXP.level}\nXP: ${userXP.xp}`);
  }

  if (msg.body === '/tagall' && chat.isGroup && chat.participants) {
    let text = '📢 *Kurimuzon♦️ calls you all:*\n';
    let mentions = [];
    for (let participant of chat.participants) {
      mentions.push(participant.id._serialized);
      text += `@${participant.id.user} `;
    }
    chat.sendMessage(text, { mentions });
  }

  if (msg.body.startsWith('/crimson ')) {
    const prompt = msg.body.replace('/crimson ', '');
    const reply = await getCrimsonReply(prompt);
    client.sendMessage(sender, `🩸 ${reply}`);
  }

  if (msg.body === '/mute' && chat.isGroup) {
    await chat.mute();
    client.sendMessage(chat.id._serialized, '🔇 Group muted by Kurimuzon♦️');
  }

  if (msg.body === '/unmute' && chat.isGroup) {
    await chat.unmute();
    client.sendMessage(chat.id._serialized, '🔊 Group unmuted by Kurimuzon♦️');
  }

  if (msg.body === '/game') {
    const number = Math.floor(Math.random() * 10) + 1;
    client.sendMessage(sender, `🎲 Guess a number between 1-10. Reply with /guess <number>`);
    if (!xpData[sender]) xpData[sender] = {};
    xpData[sender].game = number;
    saveXP();
  }

  if (msg.body.startsWith('/guess')) {
    const guess = parseInt(msg.body.split(' ')[1]);
    if (xpData[sender]?.game) {
      if (guess === xpData[sender].game) {
        client.sendMessage(sender, '🎉 Correct! +20 XP');
        addXP(sender, 20);
      } else {
        client.sendMessage(sender, `❌ Nope! It was ${xpData[sender].game}`);
      }
      delete xpData[sender].game;
      saveXP();
    }
  }
});

client.on('qr', (qr) => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('🟢 Kurimuzon♦️ is ready.'));

client.initialize();
