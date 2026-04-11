const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../utils/db.js');

module.exports = {
  name: 'daily', aliases: ['يومي', 'مكافأة-يومية'],
  description: 'احصل على مكافأتك اليومية',
  usage: '!daily',
  category: '💰 الاقتصاد',
  cooldown: 5,
  async execute(message, args) {
    const last = await db.getLastDaily(message.guild.id, message.author.id);
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;

    if (last && now - last < cooldown) {
      const remaining = cooldown - (now - last);
      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      return message.reply(`⏳ لقد أخذت مكافأتك اليومية بالفعل! عُد بعد **${hours}h ${minutes}m**.`);
    }

    await db.setLastDaily(message.guild.id, message.author.id);
    await db.addBalance(message.guild.id, message.author.id, config.economy.dailyReward);
    const bal = await db.getBalance(message.guild.id, message.author.id);

    const embed = new EmbedBuilder().setColor(config.colors.gold).setTitle('🎁 مكافأة يومية!')
      .setDescription(`حصلت على **${config.economy.dailyReward.toLocaleString()} عملة**! 🎉`)
      .addFields(
        { name: '💰 رصيدك الآن', value: `${bal.toLocaleString()} عملة`, inline: true },
        { name: '⏰ عُد بعد', value: '24 ساعة', inline: true },
      )
      .setFooter({ text: 'مجتمع A7MED | لا تنسى مكافأتك يومياً!' }).setTimestamp();
    message.channel.send({ embeds: [embed] });
  },
};
