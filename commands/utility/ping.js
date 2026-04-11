const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');

module.exports = {
  name: 'ping', aliases: ['بينج', 'تأخير'],
  description: 'فحص سرعة البوت',
  usage: '!ping',
  category: '🔧 عام',
  async execute(message, args, client) {
    const msg = await message.channel.send('⏳ جاري القياس...');
    const latency = msg.createdTimestamp - message.createdTimestamp;
    const apiLatency = Math.round(client.ws.ping);
    await msg.edit({
      content: '',
      embeds: [new EmbedBuilder().setColor(config.colors.success).setTitle('🏓 Pong!')
        .addFields(
          { name: '⚡ تأخير الرسائل', value: `${latency}ms`, inline: true },
          { name: '📡 تأخير API', value: `${apiLatency}ms`, inline: true },
        ).setTimestamp()]
    });
  },
};
