# WIKI ENGLISH

Software Engineering yo‘nalishi talabalari uchun **Wiki texnologiyasiga asoslangan
kasbiy ingliz tili o‘quv yo‘li**. `index.html` — bosqichma-bosqich guided learning
path; `lessons/` — Wiki Markdown manbalaridan generatsiya qilingan dars sahifalari.
Ikkalasi bitta dizayn tizimida ishlaydi va GitHub Pages’da joylashadi.

Metodik o‘zak har bir modulda o‘zgarmaydi:

> tayyorgarlik → o‘z Wiki sahifangizni yaratish → sherik fikri → qayta tahrir →
> Wiki History orqali o‘sishni ko‘rish → og‘zaki taqdimot → modul nazorati

Gamifikatsiya (XP, faol kunlar, nishonlar) — faqat **qo‘llab-quvvatlovchi qatlam**.
Wiki faoliyati har modulning markaziy va majburiy natijasi bo‘lib qoladi.

## Jonli resurslar

- [Kurs sayti](https://nargizaqodirova7277-cmyk.github.io/wiki-english-method/)
- [12 ta dars sahifasi katalogi](https://nargizaqodirova7277-cmyk.github.io/wiki-english-method/lessons/)
- [GitHub Wiki manbalari](https://github.com/nargizaqodirova7277-cmyk/wiki-english-method/wiki)

## Lokal ishga tushirish

    python -m http.server 8000

So‘ng brauzerda `http://localhost:8000` manzilini oching. O‘quv yo‘li ES
modullardan foydalanadi, shuning uchun sahifani `file://` orqali emas, HTTP
server orqali oching.

## Progressni saqlash

Backend yo‘q. O‘quvchi progressi **faqat shu brauzerda** (`localStorage`,
kalit `wikienglish.progress.v1`) saqlanadi va hech qayerga yuborilmaydi.
Interfeys buni ochiq ko‘rsatadi; "Natijani yuklab olish (JSON)" tugmasi
zaxira nusxa beradi, "Natijani tozalash" esa qurilmadagi progressni o‘chiradi.

Kelajakda server-tomon saqlashga o‘tish uchun `assets/storage.js` ichida
`RemoteAdapter` uchun aniq seam qoldirilgan: `createStore(adapter)` bir xil
`load / save / clear / subscribe` interfeysidagi istalgan adapter bilan
ishlaydi, `app.js` da bitta qatorni almashtirish kifoya.

## Dars sahifalarini yangilash

Wiki Markdown fayllari o‘zgargach, loyiha asosiy papkasidan:

    python website/scripts/build_lessons.py

`build_lessons.py` va `lessons/*.html` bayt-ba-bayt bir xil qoladi — o‘quv yo‘li
ularga faqat `assets/course.css` palitrasi va `assets/course.js` dagi qo‘shimcha
orqali ta’sir qiladi.

## Testlar

    node --test website/assets/state.test.mjs      # sof mantiq: holat, XP, streak, nishonlar
    node website/scripts/check-anchors.mjs         # course-data havolalari va #anchor’lar

`.github/workflows/quality-check.yml` bu tekshiruvlarni hamda HTML tuzilishi,
havolalar va Wiki strukturasini har push va PR’da avtomatik bajaradi.

## Repository tuzilishi

- `index.html` — WIKI ENGLISH o‘quv yo‘li (uch ustunli interfeys);
- `assets/course-data.js` — 12 modul va ularning qadamlari uchun yagona konfiguratsiya;
- `assets/state.js` — sof progress mantiqi (holat mashinasi, XP, streak, nishon);
- `assets/storage.js` — `localStorage` adapteri va `RemoteAdapter` seam;
- `assets/render.js` / `assets/app.js` — DOM render va foydalanuvchi bilan aloqa;
- `assets/app.css` — o‘quv yo‘li dizayni (ko‘k-binafsha tizim, 4 breakpoint);
- `assets/course.css` / `assets/course.js` — dars sahifalari uchun umumiy uslub va skript;
- `lessons/` — 12 modul va yordamchi dars sahifalari (generatsiya qilingan);
- `scripts/build_lessons.py` — Wiki Markdown’dan HTML yaratadi;
- `scripts/check-anchors.mjs` — havola va anchor yaxlitligini tekshiradi;
- `.github/workflows/` — avtomatik sifat tekshiruvlari.
