# Modex — موقع ألعاب ثابت وقابل للتوسعة

تمت إعادة تنظيم الموقع حتى تأتي بيانات الألعاب من ملف واحد هو `games.json`. يعتمد الموقع على HTML وCSS وJavaScript وPython القياسي، ولا يحتاج إلى قاعدة بيانات مدفوعة.

## ما الذي أصبح آليًا؟

- الصفحة الرئيسية، البحث، التصنيفات، قائمة الألعاب الحديثة، والألعاب المشابهة تُبنى من `games.json`.
- ينشئ `build.py` صفحة مستقلة لكل لعبة داخل `dist/games/<slug>/index.html`، مع عنوان ووصف وبيانات SEO وروابط ألعاب مشابهة.
- سير عمل GitHub Actions في `.github/workflows/deploy.yml` يبني الموقع وينشره إلى GitHub Pages بعد كل `push` مناسب إلى `main` أو `master`.
- يمكن تزويد اللعبة بحقل `screenshots` لعرض معرض صور تلقائيًا، كما يمكن تعيين `featured: true` لتحديد لعبة واجهة الموقع.

## تجربة الموقع على الكمبيوتر

من داخل مجلد المشروع شغّل:

```bash
python build.py
python -m http.server 8000 --directory dist
```

ثم افتح `http://localhost:8000`. لا تفتح `index.html` مباشرةً عبر `file://`، لأن المتصفح يمنع عادةً جلب `games.json` بهذه الطريقة.

## إضافة لعبة أو حذفها

1. افتح `admin.html` على نسخة الموقع التي تعمل عبر خادم محلي أو مستضافة على الويب.
2. أضف اللعبة أو عدّلها أو احذفها من قائمة العمل.
3. اضغط **Export games.json**.
4. استبدل ملف `games.json` في المشروع بالملف الذي تم تنزيله.
5. أضف صورة الغلاف وأي لقطات شاشة إلى `images/`، أو استخدم روابط صور مستقرة.
6. ارفع التغييرات إلى GitHub؛ سيُنشَر الموقع تلقائيًا بواسطة GitHub Actions.

**مهم:** أداة الإدارة داخل المتصفح تعدّل نسخة العمل وتصدّر JSON فقط؛ لا تحفظ ملفات GitHub مباشرة. لا يتيح GitHub Pages كتابة الملفات من واجهة الموقع وحدها. تجنّب وضع رموز الوصول (tokens) أو الأسرار في JavaScript الأمامي.

## بنية بيانات اللعبة

```json
{
  "id": 12,
  "slug": "example-game",
  "title": "Example Game",
  "category": "Arcade",
  "image": "images/Example Game.png",
  "screenshots": ["images/Example Game Screenshot 1.jpg"],
  "size": "150 MB",
  "rating": "4.5",
  "downloadUrl": "https://example.com/game",
  "featured": false,
  "description": {
    "genre": "Arcade",
    "platform": "Android",
    "modFeatures": "Feature summary",
    "overview": "A concise and accurate game overview.",
    "keyFeatures": ["Feature one", "Feature two"],
    "whyChooseMod": []
  }
}
```

## نشر GitHub Pages لأول مرة

1. ارفع محتويات هذا المجلد إلى مستودع GitHub.
2. افتح **Settings → Pages** في المستودع.
3. اختر **GitHub Actions** كمصدر للنشر.
4. تأكد أن فرع العمل اسمه `main` أو `master`؛ ثم ادفع التغييرات أو شغّل workflow يدويًا من تبويب **Actions**.

لا يملك المشروع صور لقطات لعب منفصلة للألعاب الـ11 الحالية؛ لذلك يعرض الغلاف المتوفر. عند إضافة صور حقيقية إلى `screenshots` سيظهر معرض الصور تلقائيًا.
