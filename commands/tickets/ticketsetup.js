// ============================================================
//  commands/tickets/ticketsetup.js — إعداد نظام التذاكر
//  Admin command: posts the "Create Ticket" button embed in the
//  current channel. Members click it to open a private ticket.
// ============================================================

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require('discord.js');
const config = require('../../config.js');

function isAdmin(message) {
  return message.member.permissions.has(PermissionFlagsBits.Administrator) ||
    message.author.id === config.devId;
}

module.exports = {
  name: 'ticketsetup',
  aliases: ['setup-ticket', 'إعداد-تذاكر', 'تذاكر-إعداد'],
  description: 'إعداد نظام التذاكر في القناة الحالية (للأدمن)',
  usage: '!ticketsetup',
  category: '🎫 التذاكر',
  cooldown: 10,

  async execute(message, args, client) {
    if (!isAdmin(message)) {
      return message.reply('❌ هذا الأمر للأدمن فقط.');
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🎫 نظام التذاكر — مجتمع A7MED')
      .setDescription(
        '**هل تحتاج مساعدة أو لديك استفسار؟**\n\n' +
        '📌 اضغط على زر **إنشاء تذكرة** أدناه لفتح قناة خاصة مع فريق الدعم.\n\n' +
        '**📋 تعليمات:**\n' +
        '• اشرح مشكلتك بوضوح بعد فتح التذكرة\n' +
        '• سيرد عليك أحد أعضاء الفريق في أقرب وقت\n' +
        '• لا تفتح أكثر من تذكرة واحدة في نفس الوقت\n\n' +
        '⏰ أوقات الدعم: متاح على مدار الساعة'
      )
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .setFooter({ text: 'مجتمع A7MED | فريق الدعم 💙' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_create')
        .setLabel('📩 إنشاء تذكرة')
        .setStyle(ButtonStyle.Success),
    );

    await message.channel.send({ embeds: [embed], components: [row] });
    await message.reply('✅ تم إعداد نظام التذاكر بنجاح في هذه القناة!').then(m => {
      setTimeout(() => m.delete().catch(() => {}), 5000);
    });
  },
};
