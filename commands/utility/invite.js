// ============================================================
//  commands/utility/invite.js — إحصائيات الدعوات
//  Shows a user's invite count and invite points.
//  25 points are awarded per successful invite (tracked in index.js).
// ============================================================

const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');
const db     = require('../../utils/db.js');

module.exports = {
  name: 'invite',
  aliases: ['دعوات', 'invites', 'دعوتي'],
  description: 'عرض عدد دعواتك ونقاط الدعوات',
  usage: '!invite [@عضو]',
  category: '🔧 عام',
  cooldown: 5,

  async execute(message, args, client) {
    const target = message.mentions.members.first() || message.member;

    const [inviteCount, invitePoints, totalPoints] = await Promise.all([
      db.getInviteCount(message.guild.id, target.id),
      db.getInvitePoints(message.guild.id, target.id),
      db.getTotalPoints(message.guild.id, target.id),
    ]);

    // Also fetch Discord's native invite data for accuracy
    let nativeInvites = 0;
    try {
      const guildInvites = await message.guild.invites.fetch();
      nativeInvites = guildInvites
        .filter(inv => inv.inviter?.id === target.id)
        .reduce((sum, inv) => sum + (inv.uses ?? 0), 0);
    } catch {
      // Missing MANAGE_GUILD permission — fall back to tracked count
      nativeInvites = inviteCount;
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`✉️ دعوات ${target.user.username}`)
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '✉️ إجمالي الدعوات', value: `**${nativeInvites}** دعوة`, inline: true },
        { name: '🏆 نقاط الدعوات', value: `**${invitePoints}** نقطة`, inline: true },
        { name: '📊 إجمالي النقاط', value: `**${totalPoints}** نقطة`, inline: true },
      )
      .setDescription(`كل دعوة ناجحة = **${config.points.perInvite} نقطة** 🎁`)
      .setFooter({ text: 'مجتمع A7MED | ادعُ أصدقاءك واكسب نقاطاً!' })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  },
};
