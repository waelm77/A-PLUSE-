# Cloud Functions — تحقق آمن لبيانات الطلاب

نقل التحقق من كلمات مرور الطلاب وتسجيل الأجهزة من المتصفح إلى خادم Firebase،
وحلّ مؤخرّة التجارب التي فرضتها حماية القواعد.

## ما هذا؟
- **login**: Callable يتحقق من اسم المستخدم وكلمة السر على الخادم، ويعيد بيانات الطالب **بدون كلمة السر**.
- **registerDevice**: Callable يسجل جهازاً جديداً ويفرض حدّ **الجهازين** على الخادم (لا يمكن تجاوزه بالكتابة المباشرة).
- بعد التفعيل يمكن قفل `students` في القواعد بالكامل للمدير فقط، لأن التحقق لم يعد في المتصفح.

## خطوات التثبيت (مرة واحدة)

> يتطلب خطة **Blaze** (لأن Cloud Functions لا تعمل على الخطة المجانية Spark تماماً؛
> Firebase تم منح حدّ استعمال مجاني أوسعت مع بطاقة مرفوعة، لكنها لا تُخصم إلا فوق الحد المجاني).

### 1. تسجيل الدخول للمشروع (مرة واحدة)
```bash
cd "D:\anti new 2\app"
firebase login
```

### 2. تفعيل خطة Blaze من لوحة Firebase
`https://console.firebase.google.com/project/wael-educatinal-website/billing`
- أرفق وسيلة دفع (لا يُخصم إلا فوق حدود الاستعمال المجاني).

### 3. تثبيت الحزمة وتجهيز النشر
```bash
cd "D:\anti new 2\app\functions"
npm install
```

### 4. نشر الوظائف
```bash
cd "D:\anti new 2\app"
firebase deploy --only functions
```

### 5. بعد نجاح النشر — قفل قواعد `students`
عدّل `firestore.rules` استبدال قسّم `students` الحالي المؤقت بـ:
```firestore
match /students/{student} {
  allow read:  if isAdmin();
  allow write: if isAdmin();
}
```
ثم انشر القواعد:
```bash
firebase deploy --only firestore:rules
```

### 6. ربط تطبيق الويب بالوظائف
في `src/services/firestore.ts`، استبدل `verifyStudentCredentials` و`registerDevice`
باستدعاءات `httpsCallable` (انظر `src/services/firebaseAuth.ts` بعد ما يُضاف).

---

## ملاحظات أمنية
- **لا تكشف أبداً** كلمة السر النصية. الوظيفة تقارنها فقط، ولا تعيدها.
- الحد الأقصى للأجهزة (2) محدد في `functions/index.js` — عدّله ثم أعد النشر.
- حتى تُفعَّل هذه الوظائف، `students` تبقى مقروءة/مكتوبة بحرية مؤقتاً في القواعد (لأن تسجيل الدخول يعتمد عليها).