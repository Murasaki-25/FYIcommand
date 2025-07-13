const fs = require('fs');
const path = require('path');
require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

// ====== EXPRESS UNTUK KEEP-ALIVE ======
const app = express();
app.get('/', (req, res) => {
  res.send('Bot aktif!');
});
app.listen(3000, () => {
  console.log('🌐 Web server aktif di port 3000');
});

// ====== FILE PATH ======
const serverFile = path.join(__dirname, 'server.json');
const homesFile = path.join(__dirname, 'homes.json');
const loginFile = path.join(__dirname, 'login.json');

// ====== FUNGSI UMUM ======
function loadHomes() {
  try {
    const data = fs.readFileSync(homesFile, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function saveHome(player, coords) {
  const homes = loadHomes();
  homes[player.toLowerCase()] = coords;
  fs.writeFileSync(homesFile, JSON.stringify(homes, null, 2));
}

function loadAddress() {
  try {
    const data = fs.readFileSync(serverFile, 'utf-8');
    return JSON.parse(data).address || null;
  } catch {
    return null;
  }
}

function saveAddress(newAddress) {
  fs.writeFileSync(serverFile, JSON.stringify({ address: newAddress }, null, 2));
}

function loadLogin() {
  try {
    const data = fs.readFileSync(loginFile, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { id: '', pass: '' };
  }
}

function saveLogin(id, pass) {
  fs.writeFileSync(loginFile, JSON.stringify({ id, pass }, null, 2));
}

// ====== DISCORD CLIENT ======
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.GuildMember],
});

client.once('ready', () => {
  console.log(`✅ Bot aktif sebagai ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const content = message.content.trim().toLowerCase();
  const args = message.content.trim().split(/\s+/);

  if (content === '!link') {
    return message.channel.send('🔗 Link Aternos: https://aternos.org/server/');
  }

  if (content === '!members') {
    const members = await message.guild.members.fetch();
    const list = members.map(m => `• ${m.user.tag}`).join('\n');
    return message.channel.send(`👥 **Daftar Member:**\n${list}`);
  }

  if (content === '!info') {
    const { name, memberCount, ownerId } = message.guild;
    return message.channel.send(`ℹ️ **Info Server**\nNama: ${name}\nJumlah Member: ${memberCount}\nOwner ID: ${ownerId}`);
  }

  if (args[0] === '!name') {
    if (args[1]) {
      saveAddress(args[1]);
      return message.channel.send(`✅ Alamat server disimpan: \`${args[1]}\``);
    }
    const saved = loadAddress();
    return saved
      ? message.channel.send(`🌐 Alamat server: \`${saved}\``)
      : message.channel.send(`⚠️ Belum ada alamat server disimpan. Ketik: \`!name alamat:port\``);
  }

  if (args[0] === '!home') {
    const homes = loadHomes();
    if (args.length === 5) {
      const [_, player, x, y, z] = args;
      const coords = `${x} ${y} ${z}`;
      saveHome(player, coords);
      return message.channel.send(`✅ Koordinat untuk **${player}** disimpan: \`${coords}\``);
    }

    if (args.length === 2) {
      const player = args[1];
      const coords = homes[player.toLowerCase()];
      return coords
        ? message.channel.send(`📍 Koordinat **${player}**: \`${coords}\``)
        : message.channel.send(`❌ Tidak ditemukan koordinat untuk **${player}**.`);
    }

    return message.channel.send('❓ Format salah.\nSimpan: `!home <nama> <x> <y> <z>`\nLihat: `!home <nama>`');
  }

  if (content === '!listhome') {
    const homes = loadHomes();
    const players = Object.keys(homes);
    return players.length === 0
      ? message.channel.send('📭 Belum ada koordinat player disimpan.')
      : message.channel.send(
          `📋 **Daftar Koordinat Player:**\n` +
          players.map(name => `• ${name} ➜ \`${homes[name]}\``).join('\n')
        );
  }

  if (args[0] === '!delhome' && args.length === 2) {
    const player = args[1].toLowerCase();
    const homes = loadHomes();
    if (homes[player]) {
      delete homes[player];
      fs.writeFileSync(homesFile, JSON.stringify(homes, null, 2));
      return message.channel.send(`🗑️ Koordinat untuk **${player}** telah dihapus.`);
    }
    return message.channel.send(`❌ Tidak ditemukan koordinat untuk **${player}**.`);
  }

  if (args[0] === '!login' && args.length === 3) {
    const [_, id, pass] = args;
    saveLogin(id, pass);
    return message.channel.send('🔐 Info login berhasil disimpan.');
  }

  if (content === '!showlogin') {
    const login = loadLogin();
    return login.id && login.pass
      ? message.channel.send(`🔐 **Informasi Login Aternos:**\n🆔 ID: \`${login.id}\`\n🔑 Password: \`${login.pass}\``)
      : message.channel.send('❌ Belum ada data login yang disimpan.');
  }

  if (content === '!help') {
    return message.channel.send(`
📘 **Daftar Command Bot:**

🔧 **Server**
• \`!name alamat:port\` — Simpan alamat server
• \`!name\` — Lihat alamat server yang tersimpan

🏠 **Koordinat Player**
• \`!home <nama> <x> <y> <z>\` — Simpan koordinat player
• \`!home <nama>\` — Lihat koordinat player
• \`!listhome\` — Lihat semua player
• \`!delhome <nama>\` — Hapus koordinat player

🔐 **Login Aternos**
• \`!login <id> <pass>\` — Simpan akun Aternos
• \`!showlogin\` — Lihat ID dan password Aternos

ℹ️ **Info**
• \`!link\`, \`!info\`, \`!members\`, \`!help\`
    `);
  }
});

// ====== JALANKAN BOT DISCORD ======
client.login(process.env.DISCORD_TOKEN);







