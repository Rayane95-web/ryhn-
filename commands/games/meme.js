const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');

const memes = [
  'https://i.imgur.com/Aw4SFGI.jpeg',
  'https://i.imgur.com/3x6XJQZ.jpeg',
  'https://i.imgur.com/5e5Iuq4.jpeg',
  'https://i.imgur.com/jb0ZQFQ.jpeg',
  'https://i.imgur.com/Q5f2V3Q.jpeg',
];

module.exports = {
  name: 'meme', aliases: ['ميم', 'نكتة'],
  description: 'احصل على ميم عشوائي',
  usage: '!meme',
  category: '🎮 الألعاب',
  cooldown: 5,
  async execute(message) {
    try {
      const res = await fetch('https://meme-api.com/gimme');
      const data = await res.json();
      const embed = new EmbedBuilder().setColor(config.colors.primary)
        .setTitle(data.title || '😂 ميم عشوائي')
        .setImage(data.url)
        .setFooter({ text: `👍 ${data.ups ?? 0} | r/${data.subreddit ?? 'memes'}` })
        .setTimestamp();
      return message.channel.send({ embeds: [embed] });
    } catch {
      const embed = new EmbedBuilder().setColor(config.colors.primary)
        .setTitle('😂 ميم عشوائي')
        .setImage(memes[Math.floor(Math.random() * memes.length)])
        .setTimestamp();
      message.channel.send({ embeds: [embed] });
    }
  },
};
