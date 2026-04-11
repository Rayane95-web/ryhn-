const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../utils/db.js');

const choices = { rock: '🪨', paper: '📄', scissors: '✂️', حجر: '🪨', ورقة: '📄', مقص: '✂️' };
const map = { rock: 'rock', paper: 'paper', scissors: 'scissors', حجر: 'rock', ورقة: 'paper', مقص: 'scissors' };
const wins = { rock: 'scissors', paper: 'rock', scissors: 'paper' };

module.exports = {
  name: 'rps', aliases: ['حجر-ورقة-مقص', 'hrm'],
  description: 'حجر ورقة مقص مع رهان عملات',
  usage: '!rps [rock/paper/scissors] [رهان]',
  category: '🎮 الألعاب',
  cooldown: 5,
  async execute(message, args) {
    const userChoice = map[args[0]?.toLowerCase()];
    if (!userChoice) return message.reply('❌ اختر: `rock` `paper` `scissors` (أو `حجر` `ورقة` `مقص`)');

    const bet = parseInt(args[1]) || 0;
    if (bet > 0) {
      const bal = await db.getBalance(message.guild.id, message.author.id);
      if (bal < bet) return message.reply(`❌ رصيدك غير كافٍ! رصيدك: **${bal.toLocaleString()}** عملة.`);
    }

    const botChoices = ['rock', 'paper', 'scissors'];
    const botChoice = botChoices[Math.floor(Math.random() * 3)];

    let result, color;
    if (userChoice === botChoice) { result = '🤝 تعادل!'; color = config.colors.warning; }
    else if (wins[userChoice] === botChoice) {
      result = '🎉 فزت!';
      color = config.colors.success;
      if (bet > 0) await db.addBalance(message.guild.id, message.author.id, bet);
    } else {
      result = '😢 خسرت!';
      color = config.colors.danger;
      if (bet > 0) await db.removeBalance(message.guild.id, message.author.id, bet);
    }

    const embed = new EmbedBuilder().setColor(color).setTitle(`🎮 حجر ورقة مقص — ${result}`)
      .addFields(
        { name: 'اختيارك', value: `${choices[userChoice]} ${userChoice}`, inline: true },
        { name: 'اختياري', value: `${choices[botChoice]} ${botChoice}`, inline: true },
      );
    if (bet > 0) embed.addFields({ name: '💰 الرهان', value: `${bet.toLocaleString()} عملة`, inline: true });
    embed.setTimestamp();
    message.channel.send({ embeds: [embed] });
  },
};
