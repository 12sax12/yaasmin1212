require("dotenv").config();

const { Client, GatewayIntentBits, EmbedBuilder, Events } = require("discord.js");
const laws = require("./laws.json");

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID || "1183860758069641397";
const channelId = process.env.CHANNEL_ID || "1575596978602115204";
const color = process.env.BOT_COLOR || "#2ECC71";

if (!token || token === "PUT_YOUR_BOT_TOKEN_HERE") {
  console.error("ضع توكن البوت الجديد في ملف .env ثم أعد التشغيل.");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

function normalize(value) {
  return value.toLowerCase().trim()
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[؟?!.,،؛:()[\\]{}"'`]/g, " ")
    .replace(/\\s+/g, " ")
    .trim();
}

const aliasMap = new Map();
for (const law of laws) {
  for (const alias of law.aliases) aliasMap.set(normalize(alias), law);
}

function findLaw(content) {
  const cleaned = normalize(content);
  if (aliasMap.has(cleaned)) return aliasMap.get(cleaned);

  // Exact word matching for short abbreviations avoids accidental matches inside other words.
  const tokens = cleaned.split(" ");
  for (const token of tokens) {
    if (aliasMap.has(token)) return aliasMap.get(token);
  }

  // Multi-word aliases are checked after exact aliases.
  const aliases = [...aliasMap.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [alias, law] of aliases) {
    if (alias.length > 2 && (` ${cleaned} `).includes(` ${alias} `)) return law;
  }
  return null;
}

client.once(Events.ClientReady, readyClient => {
  console.log(`تم تشغيل البوت: ${readyClient.user.tag}`);
  console.log(`السيرفر المسموح: ${guildId}`);
  console.log(`الروم المسموح: ${channelId}`);
  console.log(`عدد القوانين المحملة: ${laws.length}`);
});

client.on(Events.MessageCreate, async message => {
  if (message.author.bot || !message.guild) return;
  if (message.guild.id !== guildId || message.channel.id !== channelId) return;

  const law = findLaw(message.content);
  if (!law) return;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${law.code} | ${law.name}`)
    .setDescription(law.description)
    .addFields(
      { name: "📖 شرح القانون", value: law.details || "يرجى الالتزام بتعليمات الإدارة.", inline: false },
      { name: "🧾 مثال على المخالفة", value: law.examples || "تحدد الحالة حسب الموقف.", inline: false },
      { name: "⚖️ العقوبة", value: law.punishment || "تحدد الإدارة العقوبة حسب الحالة.", inline: false }
    )
    .setFooter({ text: "MTA:SA • موسوعة قوانين السيرفر" })
    .setTimestamp();

  try {
    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  } catch (err) {
    console.error("تعذر إرسال الرد. تحقق من صلاحيات الروم:", err.message);
  }
});

client.login(token).catch(err => {
  console.error("فشل تسجيل الدخول. تحقق من التوكن الجديد:", err.message);
  process.exit(1);
});
