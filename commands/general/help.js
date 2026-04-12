const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');

const categories = {
  '🛡️ الإشراف': [
    { name: '!ban @عضو [سبب]', desc: 'حظر عضو من السيرفر' },
    { name: '!kick @عضو [سبب]', desc: 'طرد عضو من السيرفر' },
    { name: '!mute @عضو [مدة] [سبب]', desc: 'كتم عضو مؤقتاً (مثال: 10m, 1h, 1d)' },
    { name: '!unmute @عضو', desc: 'فك الكتم عن عضو' },
    { name: '!warn @عضو [سبب]', desc: 'تحذير عضو وحفظ التحذير' },
    { name: '!warns @عضو', desc: 'عرض تحذيرات عضو' },
    { name: '!clear [عدد]', desc: 'حذف عدد من الرسائل (حد أقصى 100)' },
  ],
  '🎭 الرتب': [
    { name: '!giverole @عضو @رتبة', desc: 'إعطاء رتبة لعضو' },
    { name: '!removerole @عضو @رتبة', desc: 'سحب رتبة من عضو' },
    { name: '!removeallroles @عضو', desc: 'إزالة كل الرتب من عضو' },
    { name: '!listroles @عضو', desc: 'عرض رتب عضو معين' },
  ],
  '💰 الاقتصاد': [
    { name: '!balance [@عضو]', desc: 'عرض رصيدك أو رصيد عضو آخر' },
    { name: '!daily', desc: 'احصل على مكافأتك اليومية' },
    { name: '!pay @عضو [مبلغ]', desc: 'تحويل عملات لعضو آخر' },
    { name: '!richest', desc: 'قائمة أغنى الأعضاء في السيرفر' },
  ],
  '🎮 الألعاب': [
    { name: '!qst', desc: 'سؤال عشوائي واربح عملات' },
    { name: '!marathon', desc: 'ماراثون 5 أسئلة متتالية' },
    { name: '!rps [rock/paper/scissors] [رهان]', desc: 'حجر ورقة مقص مع رهان العملات' },
    { name: '!8ball [سؤال]', desc: 'اسأل الكرة السحرية' },
    { name: '!coinflip [heads/tails] [رهان]', desc: 'رمي عملة مع رهان اختياري' },
    { name: '!meme', desc: 'احصل على ميم عشوائي' },
  ],
  '🎫 التذاكر': [
    { name: '!ticketsetup', desc: 'إعداد نظام التذاكر في القناة الحالية (أدمن)' },
    { name: '!ticket close', desc: 'إغلاق التذكرة الحالية' },
    { name: '!ticket claim', desc: 'استلام التذكرة (+5 نقاط)' },
    { name: '!ticket add @عضو', desc: 'إضافة عضو للتذكرة' },
  ],
  '🏆 النقاط والمتصدرين': [
    { name: '!leaderboard', desc: 'لوحة المتصدرين بالنقاط (أدمن)' },
    { name: '!stats [@عضو]', desc: 'إحصائيات العضو الكاملة' },
    { name: '!invite [@عضو]', desc: 'عدد الدعوات ونقاط الدعوات' },
    { name: '!profile [@عضو]', desc: 'بروفايل العضو الكامل' },
  ],
  '⚙️ الإدارة': [
    { name: '!admin', desc: 'لوحة تحكم الأدمن الكاملة' },
    { name: '!admin addmoney @عضو [مبلغ]', desc: 'إضافة عملات لعضو' },
    { name: '!admin removemoney @عضو [مبلغ]', desc: 'خصم عملات من عضو' },
    { name: '!admin setmoney @عضو [مبلغ]', desc: 'تعيين رصيد عضو' },
    { name: '!admin resetmoney @عضو', desc: 'إعادة تعيين رصيد عضو' },
    { name: '!admin announce #قناة [رسالة]', desc: 'إرسال إعلان رسمي' },
    { name: '!admin dm @عضو [رسالة]', desc: 'إرسال رسالة خاصة عبر البوت' },
    { name: '!admin clearwarns @عضو', desc: 'مسح تحذيرات عضو' },
    { name: '!admin botinfo', desc: 'معلومات البوت ووقت التشغيل' },
  ],
  '🔧 عام': [
    { name: '!ping', desc: 'فحص سرعة وتأخير البوت' },
    { name: '!serverinfo', desc: 'معلومات السيرفر' },
    { name: '!help [أمر]', desc: 'عرض جميع الأوامر' },
  ],
  '👤 معلومات': [
    { name: '!userinfo [@عضو]', desc: 'معلومات شاملة عن عضو (نقاط، رصيد، مستوى، تحذيرات...)' },
  ],
};

module.exports = {
  name: 'help', aliases: ['مساعدة', 'اوامر', 'أوامر'],
  description: 'عرض جميع الأوامر مع الشرح',
  usage: '!help [اسم-الأمر]',
  category: '🔧 عام',
  execute(message, args, client) {
    // مساعدة بأمر محدد
    if (args[0]) {
      const cmd = client.commands.get(args[0].toLowerCase()) ||
                  client.commands.get(client.aliases.get(args[0].toLowerCase()));
      if (!cmd) return message.reply(`❌ الأمر \`${args[0]}\` غير موجود.`);
      const embed = new EmbedBuilder().setColor(config.colors.primary)
        .setTitle(`📖 مساعدة: ${cmd.name}`)
        .addFields(
          { name: '📝 الشرح', value: cmd.description || 'لا يوجد شرح' },
          { name: '💡 الاستخدام', value: `\`${cmd.usage || `!${cmd.name}`}\`` },
          { name: '🏷️ الفئة', value: cmd.category || 'عام' },
          { name: '⏱️ الكولداون', value: `${cmd.cooldown || 3} ثواني` },
        );
      if (cmd.aliases?.length) {
        embed.addFields({ name: '🔀 اختصارات', value: cmd.aliases.map(a => `\`${a}\``).join(', ') });
      }
      return message.channel.send({ embeds: [embed] });
    }

    // القائمة الكاملة — صفحتان لتجنب الحد
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('📚 قائمة أوامر بوت مجتمع A7MED')
      .setDescription(`البادئة: \`${config.prefix}\` | اكتب \`!help [اسم-الأمر]\` لمزيد من التفاصيل`)
      .setThumbnail(client.user.displayAvatarURL());

    for (const [cat, cmds] of Object.entries(categories)) {
      embed.addFields({
        name: cat,
        value: cmds.map(c => `\`${c.name}\` — ${c.desc}`).join('\n'),
      });
    }

    embed.addFields(
      { name: '👑 المالك', value: 'A7MED', inline: true },
      { name: '🛠️ المطور', value: '9ATTOS', inline: true },
      { name: '📊 الأوامر', value: `${client.commands.size} أمر`, inline: true },
    ).setFooter({ text: 'بوت مجتمع A7MED | جميع الأوامر بالعربي' }).setTimestamp();

    message.channel.send({ embeds: [embed] });
  },
};
