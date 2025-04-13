const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const fs = require('fs');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

let settings = {
    autostatus: false,
    autobio: false,
    antidelete: false,
    antiviewonce: false,
    antiedit: false,
    autoreact: false
};

app.use(express.json());
app.use(express.static('panel'));

app.get('/api/config', (req, res) => {
    res.json(settings);
});

app.post('/api/config', (req, res) => {
    settings = { ...settings, ...req.body };
    fs.writeFileSync('./config.json', JSON.stringify(settings, null, 2));
    res.json({ success: true });
});

async function startSock() {
    const { state, saveCreds } = await useMultiFileAuthState('session');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;

        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const sender = msg.key.remoteJid;

        if (body.startsWith(".")) {
            const cmd = body.slice(1).trim().toLowerCase();

            if (cmd === "menu") {
                let menu = `*Roselyne v1 Bot*
1. .autostatus on/off
2. .autobio on/off
3. .antidelete on/off
4. .antiviewonce on/off
5. .antiedit on/off
6. .autoreact on/off
7. .status`;
                await sock.sendMessage(sender, { text: menu });
            }

            if (cmd.startsWith("autostatus")) settings.autostatus = cmd.includes("on");
            if (cmd.startsWith("autobio")) settings.autobio = cmd.includes("on");
            if (cmd.startsWith("antidelete")) settings.antidelete = cmd.includes("on");
            if (cmd.startsWith("antiviewonce")) settings.antiviewonce = cmd.includes("on");
            if (cmd.startsWith("antiedit")) settings.antiedit = cmd.includes("on");
            if (cmd.startsWith("autoreact")) settings.autoreact = cmd.includes("on");

            if (cmd === "status") {
                const statusMsg = Object.entries(settings).map(([k,v]) => `${k}: ${v ? 'ON' : 'OFF'}`).join("\n");
                await sock.sendMessage(sender, { text: `*Bot Status*\n${statusMsg}` });
            }
        }
    });
}

startSock();
app.listen(port, () => console.log(`Web panel running on http://localhost:${port}`));
