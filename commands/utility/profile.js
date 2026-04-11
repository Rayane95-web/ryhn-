// ============================================================
//  commands/utility/profile.js — بروفايل العضو
//  Shows a rich profile card with level, XP, balance, points,
//  and action buttons (balance / stats / leaderboard).
// ============================================================

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const config = require('../../config.js');
const db     = require('../../utils/db.js');

module.exports = {
  name: 'profile',
  aliases: ['بروفايل', 'prof', 'ملفي', 'ملف'],
  description: 'عرض بروفايلك الكامل في السيرفر',
  usage: '!profile [@عضو]',
  category: '🔧 عام',
  cooldown: 5,

  async execute(message, args, client) {
    const target = message.mentions.members.first() || message.member;

    const [
      balance,
      xp,
      level,
      msgPoints,
      invPoints,
      tktPoints,
      invCount,
      tktCount,
    ] = await Promise.all([
      db.getBalance(message.guild.id, target.id),
      db.getXP(message.guild.id, target.id),
      db.getLevel(message.guild.id, target.id),
      db.getMessagePoints(message.guild.id, target.id),
      db.getInvitePoints(message.guild.id, target.id),
      db.getTicketPoints(message.guild.id, target.id),
      db.getInviteCount(message.guild.id, target.id),
      db.getTicketClaimCount(message.guild.id, target.id),
    ]);

    const totalPoints = msgPoints + invPoints + tktPoints;

    // XP needed for next level: level formula is level = floor(0.1 * sqrt(xp))
    // Inverse: xp_for_level = (level / 0.1)^2 = (level * 10)^2
    const xpForCurrentLevel = Math.pow(level * 10, 2);
    const xpForNextLevel    = Math.pow((level + 1) * 10, 2);
    const xpProgress        = xp - xpForCurrentLevel;
    const xpNeeded          = xpForNextLevel - xpForCurrentLevel;
    const progressPct       = Math.min(Math.floor((xpProgress / xpNeeded) * 100), 100);

    // Simple ASCII progress bar
    const filled  = Math.floor(progressPct / 10);
    const empty   = 10 - filled;
    const bar     = '█'.repeat(filled) + '░'.repeat(empty);

    // Leaderboard rank
    const allPoints = await db.getAllPoints(message.guild.id);
    const rank = allPoints.findIndex(e => e.userId === target.id) + 1;

    // Roles (top 3 non-@everyone)
    const topRoles = target.roles.cache
      .filter(r => r.id !== message.guild.id)
      .sort((a, b) => b.position - a.position)
      .first(3)
      .map(r => `${r}`)
      .join(' ') || 'لا توجد رتب';

    const joinedAt = Math.floor(target.joinedTimestamp / 1000);

    const embed = new EmbedBuilder()
      .setColor(target.displayHexColor !== '#000000' ? target.displayHexColor : config.colors.primary)
      .setTitle(`👤 بروفايل ${target.user.username}`)
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setDescription(
        `**${target.user.tag}**\n` +
        `انضم: <t:${joinedAt}:R>\n\n` +
        `**تقدم المستوى ${level} ← ${level + 1}**\n` +
        `\`${bar}\` ${progressPct}%\n` +
        `${xpProgress.toLocaleString()} / ${xpNeeded.toLocaleString()} XP`
      )
      .addFields(
        { name: '🎖️ المستوى', value: `**${level}**`, inline: true },
        { name: '⭐ XP', value: `**${xp.toLocaleString()}**`, inline: true },
        { name: '💰 الرصيد', value: `**${balance.toLocaleString()}** عملة`, inline: true },
        { name: '🏆 إجمالي النقاط', value: `**${totalPoints.toLocaleString()}**`, inline: true },
        { name: '📈 الترتيب', value: rank > 0 ? `**#${rank}**` : '—', inline: true },
        { name: '✉️ الدعوات', value: `**${invCount}**`, inline: true },
        { name: '🎫 التذاكر المُستلمة', value: `**${tktCount}**`, inline: true },
        { name: '🏅 الرتب', value: topRoles, inline: false },
      )
      .setFooter({ text: 'مجتمع A7MED | استمر في النشاط!' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`profile_stats_${target.id}`)
        .setLabel('📊 الإحصائيات')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`profile_balance_${target.id}`)
        .setLabel('💰 الرصيد')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`profile_invites_${target.id}`)
        .setLabel('✉️ الدعوات')
        .setStyle(ButtonStyle.Secondary),
    );

    const msg = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time: 60_000,
    });

    collector.on('collect', async interaction => {
      if (interaction.customId === `profile_stats_${target.id}`) {
        const statsCmd = client.commands.get('stats');
        if (statsCmd) {
          await interaction.deferUpdate();
          await statsCmd.execute(message, target.id !== message.author.id ? [`<@${target.id}>`] : [], client);
        }
      } else if (interaction.customId === `profile_balance_${target.id}`) {
        const balCmd = client.commands.get('balance');
        if (balCmd) {
          await interaction.deferUpdate();
          await balCmd.execute(message, target.id !== message.author.id ? [`<@${target.id}>`] : [], client);
        }
      } else if (interaction.customId === `profile_invites_${target.id}`) {
        const invCmd = client.commands.get('invite');
        if (invCmd) {
          await interaction.deferUpdate();
          await invCmd.execute(message, target.id !== message.author.id ? [`<@${target.id}>`] : [], client);
        }
      }
    });

    collector.on('end', () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`profile_stats_${target.id}`).setLabel('📊 الإحصائيات').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId(`profile_balance_${target.id}`).setLabel('💰 الرصيد').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId(`profile_invites_${target.id}`).setLabel('✉️ الدعوات').setStyle(ButtonStyle.Secondary).setDisabled(true),
      );
      msg.edit({ components: [disabledRow] }).catch(() => {});
    });
  },
};
