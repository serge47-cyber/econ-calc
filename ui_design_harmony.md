# Звіт про візуальну гармонію та UX-інтеграцію навігації

Цей звіт містить глибокий аналіз уніфікації верхнього меню навігації (`.site-main-nav`) на трьох головних сторінках проєкту:
1. [Головна (`index.html`)](file:///Users/serhiikhudolii/econ-calc/index.html)
2. [Учбові матеріали (`materials.html`)](file:///Users/serhiikhudolii/econ-calc/materials.html)
3. [Лабораторія розрахунків (`economic-tasks.html`)](file:///Users/serhiikhudolii/econ-calc/economic-tasks.html)

Згідно з інструкціями користувача, цей аудит проводився у режимі інспекції. Усі виявлені мікро-помилки, розбіжності та готові точкові Diff-патчі для їх усунення наведені нижче.

---

## 1. Синхронність шапки (CSS-метрики та стилізація)

### 🔍 Виявлені невідповідності та «стрибки» меню:
1. **Різні шрифтові сімейства (Font-Family Shift):**
   - На `index.html` елементи меню успадковують шрифт `body` (`'Inter', system-ui, sans-serif`).
   - На `materials.html` та `economic-tasks.html` меню явно перевизначає `font-family: var(--fb)` (`'DM Sans', sans-serif`).
   - Це призводить до зміни накреслення символів при переході між сторінками.
2. **Невідповідність розміру шрифту (Font-Size shift):**
   - На `index.html` контейнер `.site-main-nav` не має власного розміру шрифту (успадковує `15px` від `body`), але самі посилання `.nav-links a` мають жорстко прописаний `font-size: 14px`.
   - На `materials.html` та `economic-tasks.html` весь контейнер `.site-main-nav` має `font-size: 14px`, а посилання успадковують цей розмір. Це створює мікро-зсуви в навігаційному блоці праворуч.
3. **Кардинальна розбіжність логотипу (`.nav-brand`):**
   - На `index.html`: `.nav-brand` має розмір `15px`, товщину `600`, колір `var(--accent)` (`#896312` у світлій темі) та рендериться шрифтом `Inter` (sans-serif).
   - На `materials.html` та `economic-tasks.html`: `.nav-brand` має розмір `16px`, товщину `700`, колір `var(--gold)` (`#5C4308` у світлій темі), шрифт `var(--fd)` (`'Fraunces', serif`) та від'ємний трекінг (`letter-spacing: -0.3px`).
   - При переході з Головної на будь-яку іншу сторінку логотип візуально «стрибає», змінюючи свій вигляд із сучасного гротеску на класичну антикву.
4. **Різні змінні для рамок та підсвічувань:**
   - На `index.html` нижня лінія має товщину `1px` та колір `var(--border)`, а вертикальна лінія праворуч — `var(--border2)`. На інших сторінках обидві рамки використовують `var(--line2)` (кольори не збігаються).
   - На `index.html` активне посилання підкреслюється кольором `var(--accent)`, на інших сторінках — `var(--gold)`.
5. **Відсутність анімації переходів (Transitions):**
   - На `index.html` навігаційне меню має плавний перехід `transition: background .25s, border-color .25s;` при перемиканні теми.
   - На `materials.html` та `economic-tasks.html` анімація для `.site-main-nav` відсутня, через що меню блимає при зміні теми.

---

## 2. Логіка активних лінків (`.active`)

### 🔍 Виявлені невідповідності:
1. **HTML-структура:** Повністю правильна. На кожній сторінці клас `.active` прописаний саме тій вкладці, на якій перебуває користувач.
2. **Контрастність у світлій темі:**
   - На сторінці `economic-tasks.html` у світлій темі є додатковий глобальний фікс (рядки 331–337):
     ```css
     .active, [class*="active"] { font-weight: 700 !important; letter-spacing: normal; }
     ```
     Це добре виділяє активний пункт. Однак на `materials.html` та `index.html` цього фіксу немає, тому насиченість кольору посилань та товщина шрифту дещо відрізняються.
3. **Колірні невідповідності:**
   - У `index.html` колір тексту активного посилання — `var(--text)` (`#1a1a18` у світлій темі), підкреслення — `var(--accent)` (`#896312`).
   - У `materials.html` та `economic-tasks.html` колір тексту — `var(--white)` (`#0A0B0D`), підкреслення — `var(--gold)` (`#5C4308`).
   - Знову виникає мікро-зсув контрасту.

---

## 3. Поведінка Темної/Світлої теми (Theme Switcher & Variables)

### 🔍 Виявлені невідповідності:

> [!CAUTION]
> **Критична помилка в `script.js`:**
> Файл `script.js` (який підключається в `economic-tasks.html`) містить у перших рядках Node.js-код:
> ```javascript
> require('dotenv').config();
> const { OpenAI } = require('openai');
> ```
> Це викликає помилку `Uncaught ReferenceError: require is not defined` у браузері та **повністю зупиняє виконання скрипта**. Через це весь клієнтський функціонал в `script.js` (зокрема ініціалізація теми та динамічне додавання кнопок перемикання теми) взагалі не працює в браузері!

1. **Різні ідентифікатори (IDs) кнопок:**
   - На `index.html` кнопка має `id="themeBtn"` і обробник подій призначається через `addEventListener`.
   - На `materials.html` та `economic-tasks.html` кнопка має `id="theme-toggle-btn"` та викликає функцію через інлайновий атрибут `onclick="toggleTheme()"`.
2. **Розбіжність логіки JS:**
   - На `index.html` перемикач має локальну логіку з `addEventListener`, яка зберігає стан теми.
   - На `materials.html` та `economic-tasks.html` реалізована інша логіка з глобальними функціями `applySavedTheme()` та `toggleTheme()`.
3. **Різні колірні значення у світлій темі:**
   - На `index.html` фоновий колір меню (`--bg2`) у світлій темі — чистий білий (`#ffffff`).
   - На інших сторінках фоновий колір меню — теплий сіро-пісочний (`#F0EDE6`). При переході з Головної на Матеріали шапка помітно змінює фон.
4. **Різні назви CSS-змінних:**
   - `index.html` використовує назви `--text`, `--text2`, `--text3`, `--accent`, `--border`.
   - `materials.html` та `economic-tasks.html` використовують `--white`, `--mid`, `--muted`, `--gold`, `--line`.

---

## 4. Мобільна адаптивність

### 🔍 Виявлені невідповідності:
1. **Різні брейкпоінти (Breakpoints):**
   - На `materials.html` та `economic-tasks.html` планшетний брейкпоінт налаштований на `700px`.
   - На `index.html` цей же брейкпоінт налаштований на `680px`.
   - Це створює асинхронність поведінки шапки на екранах шириною від 680px до 700px.
2. **Зникнення підпису «КНУБА»:**
   - На `index.html` додатковий текст бренду «КНУБА» (тег `span` у логотипі) зникає на екранах `< 520px`.
   - На інших сторінках він приховується лише на екранах `< 480px`.
3. **Зменшення розмірів шрифту на мобілці:**
   - На `index.html` під час переходу на мобільний режим (екрани `< 480px`) розмір тексту логотипа зменшується до `14px`, а посилань — до `13.5px`.
   - На інших сторінках шрифти не зменшуються, зменшується лише розмір кнопки теми.

---

## Точкові Diff-патчі для усунення розбіжностей

Ці патчі розроблені так, щоб повністю синхронізувати стилі та логіку без зміни загальних колірних палітр сторінок.

### Патч 1: Синхронізація `index.html`
*Додаємо імпорт шрифту `Fraunces` для однакового логотипу, уніфікуємо CSS-метрики меню, брейкпоінти (700px/480px) та логіку роботи теми.*

```diff
<<<< index.html: рядки 8-10
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
====
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,700;1,9..144,300&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
>>>>

<<<< index.html: рядки 73-107
    .site-main-nav {
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px 40px; background: var(--bg2); border-bottom: 1px solid var(--border);
      position: sticky; top: 0; z-index: 9999;
      transition: background .25s, border-color .25s;
    }
    .nav-brand {
      font-size: 15px; font-weight: 600; color: var(--accent);
      white-space: nowrap;
    }
    .nav-brand span { color: var(--text3); font-weight: 400; margin-left: 6px; font-size: 13px; }
    .nav-links { display: flex; align-items: center; gap: 2rem; }
    .nav-links a {
      font-size: 14px; color: var(--text2); font-weight: 500;
      transition: color .2s;
    }
    .nav-links a:hover { color: var(--text); }
    .nav-links a.active {
      color: var(--text) !important; font-weight: 700;
      border-bottom: 2px solid var(--accent); padding-bottom: 4px;
    }
    .nav-right {
      display: flex; align-items: center; gap: 8px;
      margin-left: 1rem; border-left: 1px solid var(--border2); padding-left: 1.5rem;
    }
    .nav-right span { color: var(--text3); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
    .theme-btn {
      background: var(--bg3); color: var(--text);
      border: 1px solid var(--border2); border-radius: 20px;
      padding: 5px 14px; cursor: pointer; font-size: 13px;
      display: flex; align-items: center; gap: 6px; font-weight: 600;
      transition: all .2s; outline: none; font-family: var(--font);
    }
    .theme-btn:hover { border-color: var(--accent); color: var(--accent); }
====
    .site-main-nav {
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px 40px; background: var(--bg2); border-bottom: 1px solid var(--border);
      font-family: var(--font); font-size: 14px; position: sticky; top: 0; z-index: 9999;
      transition: background .25s, border-color .25s;
    }
    .nav-brand {
      font-family: 'Fraunces', Georgia, serif;
      font-size: 16px; font-weight: 700; color: var(--accent);
      letter-spacing: -0.3px; white-space: nowrap;
    }
    .nav-brand span { color: var(--text3); font-family: var(--font); font-weight: 400; margin-left: 6px; font-size: 13px; }
    .nav-links { display: flex; align-items: center; gap: 2rem; }
    .nav-links a {
      font-size: 14px; color: var(--text2); font-weight: 500;
      transition: color .2s;
    }
    .nav-links a:hover { color: var(--text); }
    .nav-links a.active {
      color: var(--text) !important; font-weight: 700;
      border-bottom: 2px solid var(--accent); padding-bottom: 4px;
    }
    .nav-right {
      display: flex; align-items: center; gap: 8px;
      margin-left: 1rem; border-left: 1px solid var(--border2); padding-left: 1.5rem;
    }
    .nav-right span { color: var(--text3); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
    .theme-btn {
      background: var(--bg3); color: var(--text);
      border: 1px solid var(--border2); border-radius: 20px;
      padding: 5px 14px; cursor: pointer; font-size: 13px;
      display: flex; align-items: center; gap: 6px; font-weight: 600;
      transition: all .2s; outline: none; font-family: var(--font);
    }
    .theme-btn:hover { border-color: var(--accent); color: var(--accent); }
>>>>

<<<< index.html: рядки 261-285
    /* ─── RESPONSIVE ─────────────────────────────────────── */
    @media (max-width: 680px) {
      .site-main-nav { padding: 14px 20px; flex-wrap: wrap; gap: 10px; }
      .nav-links { gap: 1rem; }
      .nav-right { margin-left: 0; padding-left: 0; border-left: none; }
      .page { padding: 0 16px 60px; }
      .hero { grid-template-columns: 1fr; gap: 20px; padding: 36px 0 30px; }
      .hero-stats { flex-direction: row; justify-content: space-around; min-width: unset; }
      .roadmap { grid-template-columns: 1fr; }
      .topics-grid { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 520px) {
      .nav-brand span { display: none; }
    }
    @media (max-width: 480px) {
      .site-main-nav {
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
      }
      .nav-brand { margin-right: 0; text-align: center; font-size: 14px; }
      .nav-links { justify-content: center; width: 100%; gap: 14px; }
      .nav-links a { font-size: 13.5px; }
      .nav-right { width: 100%; justify-content: center; margin-top: 4px; }
====
    /* ─── RESPONSIVE ─────────────────────────────────────── */
    @media (max-width: 700px) {
      .site-main-nav { padding: 14px 20px; flex-wrap: wrap; gap: 10px; }
      .nav-links { gap: 1rem; }
      .nav-right { margin-left: 0; padding-left: 0; border-left: none; }
    }
    @media (max-width: 680px) {
      .page { padding: 0 16px 60px; }
      .hero { grid-template-columns: 1fr; gap: 20px; padding: 36px 0 30px; }
      .hero-stats { flex-direction: row; justify-content: space-around; min-width: unset; }
      .roadmap { grid-template-columns: 1fr; }
      .topics-grid { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 480px) {
      .site-main-nav {
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
      }
      .nav-brand span { display: none; }
      .nav-brand { margin-right: 0; text-align: center; font-size: 14px; }
      .nav-links { justify-content: center; width: 100%; gap: 14px; }
      .nav-links a { font-size: 13.5px; }
      .nav-right { width: 100%; justify-content: center; margin-top: 4px; }
      .theme-btn { padding: 4px 12px; font-size: 12px; }
>>>>

<<<< index.html: рядки 335-337
      <button class="theme-btn" id="themeBtn" title="Перемкнути тему" aria-label="Перемкнути тему">
        <span id="theme-text">Світлий</span> <span id="theme-emoji">🌙</span>
      </button>
====
      <button class="theme-btn" id="theme-toggle-btn" onclick="toggleTheme()" title="Перемкнути тему" aria-label="Перемкнути тему">
        <span id="theme-text">Світлий</span> <span id="theme-emoji">🌙</span>
      </button>
>>>>

<<<< index.html: рядки 591-621
    // ─── THEME TOGGLE ───────────────────────────────────────
    const btn = document.getElementById('themeBtn');
    const textSpan = document.getElementById('theme-text');
    const emojiSpan = document.getElementById('theme-emoji');

    function applySavedTheme() {
      const currentTheme = localStorage.getItem('theme');
      if (currentTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (textSpan) textSpan.textContent = 'Темний';
        if (emojiSpan) emojiSpan.textContent = '☀️';
      } else {
        document.body.classList.remove('dark-theme');
        if (textSpan) textSpan.textContent = 'Світлий';
        if (emojiSpan) emojiSpan.textContent = '🌙';
      }
    }

    if (btn) {
      btn.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        if (textSpan) textSpan.textContent = isDark ? 'Темний' : 'Світлий';
        if (emojiSpan) emojiSpan.textContent = isDark ? '☀️' : '🌙';
      });
    }

    // Ініціалізація при відкритті сторінки
    applySavedTheme();
====
    // ─── THEME TOGGLE ───────────────────────────────────────
    function applySavedTheme() {
      const currentTheme = localStorage.getItem('theme');
      const textSpan = document.getElementById('theme-text');
      const emojiSpan = document.getElementById('theme-emoji');
      if (currentTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (textSpan) textSpan.textContent = 'Темний';
        if (emojiSpan) emojiSpan.textContent = '☀️';
      }
    }

    function toggleTheme() {
      document.body.classList.toggle('dark-theme');
      const isDark = document.body.classList.contains('dark-theme');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      const textSpan = document.getElementById('theme-text');
      const emojiSpan = document.getElementById('theme-emoji');
      if (isDark) {
        if (textSpan) textSpan.textContent = 'Темний';
        if (emojiSpan) emojiSpan.textContent = '☀️';
      } else {
        if (textSpan) textSpan.textContent = 'Світлий';
        if (emojiSpan) emojiSpan.textContent = '🌙';
      }
    }

    // Ініціалізація при відкритті сторінки
    applySavedTheme();
>>>>
```

---

### Патч 2: Синхронізація `materials.html`
*Додаємо CSS-анімацію переходу для шапки та забезпечуємо мобільне масштабування елементів навігації на екранах менше 480px.*

```diff
<<<< materials.html: рядки 59
.site-main-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 40px;background:var(--bg2);border-bottom:1px solid var(--line2);font-family:var(--fb);font-size:14px;position:sticky;top:0;z-index:9999}
====
.site-main-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 40px;background:var(--bg2);border-bottom:1px solid var(--line2);font-family:var(--fb);font-size:14px;position:sticky;top:0;z-index:9999;transition:background .25s,border-color .25s}
>>>>

<<<< materials.html: рядки 175-201
@media(max-width:480px){
  .site-main-nav {
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
  }
  .nav-brand span {
    display: none;
  }
  .nav-links {
    justify-content: center;
    width: 100%;
    gap: 14px;
  }
  .nav-right {
    border-left: none;
    padding-left: 0;
    margin-left: 0;
    width: 100%;
    justify-content: center;
    margin-top: 4px;
  }
  .theme-btn {
    padding: 4px 12px;
    font-size: 12px;
  }
====
@media(max-width:480px){
  .site-main-nav {
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
  }
  .nav-brand span {
    display: none;
  }
  .nav-brand {
    margin-right: 0;
    text-align: center;
    font-size: 14px;
  }
  .nav-links {
    justify-content: center;
    width: 100%;
    gap: 14px;
  }
  .nav-links a {
    font-size: 13.5px;
  }
  .nav-right {
    border-left: none;
    padding-left: 0;
    margin-left: 0;
    width: 100%;
    justify-content: center;
    margin-top: 4px;
  }
  .theme-btn {
    padding: 4px 12px;
    font-size: 12px;
  }
>>>>
```

---

### Патч 3: Синхронізація `economic-tasks.html`
*Додаємо CSS-анімацію переходу та мобільне масштабування елементів навігації.*

```diff
<<<< economic-tasks.html: рядки 316
.site-main-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 40px;background:var(--bg2);border-bottom:1px solid var(--line2);font-family:var(--fb);font-size:14px;position:sticky;top:0;z-index:9999}
====
.site-main-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 40px;background:var(--bg2);border-bottom:1px solid var(--line2);font-family:var(--fb);font-size:14px;position:sticky;top:0;z-index:9999;transition:background .25s,border-color .25s}
>>>>

<<<< economic-tasks.html: рядки 328
@media(max-width:480px){.site-main-nav{flex-direction:column;align-items:center;gap:12px;padding:14px 16px}.nav-brand span{display:none}.nav-links{justify-content:center;width:100%;gap:14px}.nav-right{border-left:none;padding-left:0;margin-left:0;width:100%;justify-content:center;margin-top:4px}.theme-btn{padding:4px 12px;font-size:12px}}
====
@media(max-width:480px){.site-main-nav{flex-direction:column;align-items:center;gap:12px;padding:14px 16px}.nav-brand span{display:none}.nav-brand{margin-right:0;text-align:center;font-size:14px}.nav-links{justify-content:center;width:100%;gap:14px}.nav-links a{font-size:13.5px}.nav-right{border-left:none;padding-left:0;margin-left:0;width:100%;justify-content:center;margin-top:4px}.theme-btn{padding:4px 12px;font-size:12px}}
>>>>
```

---

### Патч 4: Виправлення критичної помилки у `script.js`
*Видаляємо Node.js код з верхньої частини клієнтського файлу та запобігаємо потенційному дублюванню кнопок перемикання теми.*

```diff
<<<< script.js: рядки 1-22
require('dotenv').config();
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: "Придумай одну нову цікаву функцію для калькулятора маржинальності." }],
      model: "gpt-3.5-turbo",
    });

    console.log("Відповідь ШІ:");
    console.log(completion.choices[0].message.content);
  } catch (error) {
    console.error("Помилка:", error.message);
  }
}

main();
====
// Клієнтська логіка калькуляторів та сумісності тем КНУБА
>>>>
```

> [!NOTE]
> Також рекомендуємо закоментувати або видалити частину самовикличної функції у `script.js` (рядки 161–199), яка динамічно створює кнопку `#global-theme-toggle`, оскільки на всіх трьох сторінках сайту тепер є вбудована кнопка `#theme-toggle-btn` (або `#themeBtn`) у верхньому меню навігації. Це запобігає дублюванню кнопок перемикання на екрані.
