# Wiki-English Method

Software Engineering talabalari uchun Wiki asosidagi kasbiy ingliz tili laboratoriyasi. Landing sahifa va ichki darslar GitHub Pages ichida yagona dizaynda ishlaydi.

## Jonli resurslar

- [Kurs sayti](https://nargizaqodirova7277-cmyk.github.io/wiki-english-method/)
- [12 ta o‘quv moduli](https://nargizaqodirova7277-cmyk.github.io/wiki-english-method/lessons/)
- [GitHub Wiki manbalari](https://github.com/nargizaqodirova7277-cmyk/wiki-english-method/wiki)

## Lokal ishga tushirish

    python -m http.server 8000

So‘ng brauzerda `http://localhost:8000` manzilini oching. Ichki darslar `http://localhost:8000/lessons/` manzilida.

## Dars sahifalarini yangilash

Wiki Markdown fayllari o‘zgargach, loyiha asosiy papkasidan quyidagini ishga tushiring:

    python website/scripts/build_lessons.py

## Dizayn tamoyillari

- sodda akademik vizual til;
- o‘tkir burchakli, aniq boshqaruv elementlari;
- yashil, havorang va bordoviy aksentlar;
- mobil va klaviatura navigatsiyasiga mos tuzilma;
- barcha ichki darslarda yagona rang, shrift va navigatsiya.

## Repository tuzilishi

- `index.html` — landing sahifa;
- `lessons/` — 12 modul va yordamchi dars sahifalari;
- `scripts/build_lessons.py` — Wiki Markdown manbalaridan HTML yaratadi;
- `assets/` — umumiy CSS, JavaScript va favicon;
- `.github/workflows/` — avtomatik sifat tekshiruvlari.
