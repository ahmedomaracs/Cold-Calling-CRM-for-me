const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const leads = JSON.parse(fs.readFileSync(path.join(__dirname, 'leads.json'), 'utf8'));

// Create a new workbook
const wb = xlsx.utils.book_new();

// Helper to format lead row for Excel
function mapLeadToRow(lead) {
  return {
    'Lead ID': lead.id,
    'Company Name': lead.name,
    'Category': lead.category,
    'Location': lead.location,
    'Phone': lead.phone,
    'Dial Link': lead.cleanPhone ? `tel:${lead.cleanPhone}` : '',
    'WhatsApp Link': lead.waPhone ? `https://wa.me/${lead.waPhone}` : '',
    'Website': lead.website || 'NONE (Golden Opportunity)',
    'Opportunity Status': lead.opportunity,
    'Call Status': lead.status,
    'Call Attempts': lead.callCount,
    'Caller Notes': lead.notes,
    'Last Contacted': lead.lastContactDate || ''
  };
}

// 1. All Leads Sheet
const allData = leads.map(mapLeadToRow);
const wsAll = xlsx.utils.json_to_sheet(allData);

// Set column widths
const colWidths = [
  { wch: 8 },  // ID
  { wch: 38 }, // Company Name
  { wch: 28 }, // Category
  { wch: 45 }, // Location
  { wch: 16 }, // Phone
  { wch: 18 }, // Dial Link
  { wch: 28 }, // WhatsApp Link
  { wch: 38 }, // Website
  { wch: 28 }, // Opportunity Status
  { wch: 16 }, // Call Status
  { wch: 14 }, // Call Attempts
  { wch: 35 }, // Caller Notes
  { wch: 16 }, // Last Contacted
];
wsAll['!cols'] = colWidths;
xlsx.utils.book_append_sheet(wb, wsAll, '📋 All 120 Leads');

// 2. High Priority (No Website) Sheet
const noWebsiteData = leads.filter(l => !l.website).map(mapLeadToRow);
const wsNoWebsite = xlsx.utils.json_to_sheet(noWebsiteData);
wsNoWebsite['!cols'] = colWidths;
xlsx.utils.book_append_sheet(wb, wsNoWebsite, '🎯 No Website (68 Leads)');

// 3. Outdated HTTP Sheet
const httpData = leads.filter(l => l.website && l.website.startsWith('http://')).map(mapLeadToRow);
const wsHttp = xlsx.utils.json_to_sheet(httpData);
wsHttp['!cols'] = colWidths;
xlsx.utils.book_append_sheet(wb, wsHttp, '⚠️ Outdated HTTP (30 Leads)');

// 4. Modern Sites / Redesign Sheet
const httpsData = leads.filter(l => l.website && !l.website.startsWith('http://')).map(mapLeadToRow);
const wsHttps = xlsx.utils.json_to_sheet(httpsData);
wsHttps['!cols'] = colWidths;
xlsx.utils.book_append_sheet(wb, wsHttps, '🌐 Upgrade & SEO (22 Leads)');

// 5. Cold Calling Scripts & Objection Handling Guide Sheet
const scriptRows = [
  {
    'Topic': '🎯 Pitch #1: For Companies WITHOUT Website (68 Leads)',
    'Egyptian Arabic (اللهجة المصرية)': 'صباح الخير / مساء الخير، يا فندم، مع حضرتك [اسمك] من [اسم شركتك] لخدمات وحلول المواقع الإلكترونية. بكلم حضرتك بخصوص [اسم شركة السياحة]... لاحظنا إن شركتكم ممتازة ولها سمعة قوية على جوجل، بس مالكوش موقع إلكتروني رسمي خاص بيكم. وده بيخلي السائح أو العميل اللي بيبحث على جوجل يروح للمنافسين اللي عندهم موقع وحجز مباشر. إحنا بنصمم مواقع سياحية متكاملة وسريعة بتعرض البرامج والرحلات ومرتبطة بحجز واتساب فوري وبأسعار خاصة جداً لشركات السياحة في مصر. ممكن أبعت لحضرتك على الواتساب سابقة أعمالنا في دقيقة؟',
    'English Pitch': 'Good day! This is [Your Name] from [Agency Name]. I noticed your tourism company has great local presence, but currently lacks an official website. Tourists searching on Google are booking directly with competitors who have websites. We build dedicated, high-converting tourism websites with tour packages and instant WhatsApp booking. Can I send you a 1-minute demo portfolio on WhatsApp?'
  },
  {
    'Topic': '⚠️ Pitch #2: For Companies with HTTP / Outdated Website (30 Leads)',
    'Egyptian Arabic (اللهجة المصرية)': 'أهلاً بحضرتك يا فندم، أنا بكلم حضرتك بخصوص موقع شركة [اسم الشركة]. لاحظنا إن الموقع الحالي لسه شغال بنظام قديم ومش محمي بشهادة أمان SSL (بيظهر للزائر "غير آمن / Not Secure" في جوجل كروم)، وغير متوافق مع الموبايلات الحديثة وده بيقلل ثقة السائح الأجنبي. إحنا بنعمل ترقية وتجديد كامل للموقع ليكون فائق السرعة، مؤمن 100%، وبيظهر في أول نتائج بحث جوجل. إيه رأي حضرتك نبعت لحضرتك تقرير فحص مجاني للموقع على الواتساب؟',
    'English Pitch': 'Hello! I am reaching out regarding your website. We noticed it is currently unencrypted (showing "Not Secure" warning to foreign visitors) and not optimized for modern mobile booking. We help travel agencies revamp their sites with modern UX, SSL security, and top SEO ranking. Would you like a free quick audit sent to your WhatsApp?'
  },
  {
    'Topic': '🛡️ Objection #1: "We only rely on Facebook / Instagram"',
    'Egyptian Arabic (اللهجة المصرية)': 'تمام جداً يا فندم، السوشيال ميديا ممتازة للتفاعل، بس السائح الأجنبي أو العميل اللي عاوز يدفع فلوس في رحلة بيدور أول حاجة على جوجل على موقع رسمي للشركة علشان يثق فيها ويتأكد من مصداقيتها وترخيصها. بالإضافة إن الموقع بيشتغل 24 ساعة بدون ما تحتاج ترد يدوياً على كل تفصيلة.',
    'English Pitch': 'Social media is great for social proof, but high-ticket travelers and foreign tourists search Google first to verify legitimacy and official credibility. A website works as your 24/7 automated salesman.'
  },
  {
    'Topic': '🛡️ Objection #2: "Send details on WhatsApp and I will see"',
    'Egyptian Arabic (اللهجة المصرية)': 'من عينيا يا فندم، هبعت لحضرتك حالاً على الواتساب [رقم الموبايل] فيديو دقيقة فيه نماذج لمواقع سياحة نفذناها، وهتابع مع حضرتك بكرة الساعة 2 ظهراً بحيث أجاوب على أي استفسار لحضرتك. شكراً لوقتك!',
    'English Pitch': 'Certainly! I will send a 1-minute video showcase to your WhatsApp right now, and follow up tomorrow at 2 PM to answer your questions. Thank you for your time!'
  },
  {
    'Topic': '🛡️ Objection #3: "The Manager is not here right now"',
    'Egyptian Arabic (اللهجة المصرية)': 'مفيش أي مشكلة يا فندم، ممكن أعرف اسم المدير المسؤول والميعاد الأنسب اللي ممكن أكلمه فيه؟ وممكن أبعت البروفايل على رقم الواتساب الخاص بالشركة يطّلع عليه لحين اتصالي؟',
    'English Pitch': 'No problem at all! May I have the manager\'s name and the best time to reach them? I can also send our agency portfolio to this WhatsApp for them to review in the meantime.'
  }
];
const wsScript = xlsx.utils.json_to_sheet(scriptRows);
wsScript['!cols'] = [{ wch: 32 }, { wch: 80 }, { wch: 60 }];
xlsx.utils.book_append_sheet(wb, wsScript, '📖 Pitch & Scripts Guide');

const outPath = path.join(__dirname, 'Tourism_Companies_Cold_Calling_Action_Sheet.xlsx');
xlsx.writeFile(wb, outPath);
console.log('Saved action sheet to:', outPath);
