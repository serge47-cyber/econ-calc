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
function calculateFutureValue() {
  var pv = parseFloat(document.getElementById('fv-pv').value) || 0;
  var r = parseFloat(document.getElementById('fv-r').value) || 0;
  var n = parseInt(document.getElementById('fv-n').value) || 0;
  
  // Формула: FV = PV * (1 + r/100)^n
  var fv = pv * Math.pow((1 + (r / 100)), n);
  
  var resultDiv = document.getElementById('fv-result');
  if (resultDiv) {
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = 'Майбутня вартість (FV) = ' + fv.toLocaleString('uk-UA', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  }
}
// тут буде функція розрахунку
function calculateInvestmentMetrics() {
  var ic = parseFloat(document.getElementById('npv-ic').value) || 0;
  var cf = parseFloat(document.getElementById('npv-cf').value) || 0;
  var r = parseFloat(document.getElementById('npv-r').value) / 100 || 0;
  var n = parseInt(document.getElementById('npv-n').value) || 0;

  // Розрахунок суми дисконтованих потоків (аннуїтет)
  var dcf_sum = 0;
  if (r > 0) {
    dcf_sum = cf * (1 - Math.pow(1 + r, -n)) / r;
  } else {
    dcf_sum = cf * n;
  }

  var npv = dcf_sum - ic;
  var pi = ic !== 0 ? dcf_sum / ic : 0;

  var resultDiv = document.getElementById('npv-result');
  if (resultDiv) {
    resultDiv.style.display = 'block';
    
    // Висновок на основі NPV
    var status = npv >= 0 
      ? '<b style="color: #22c55e;">Проєкт доцільний</b>' 
      : '<b style="color: #ef4444;">Проєкт недоцільний</b>';

    resultDiv.innerHTML = 
      'Результати аналізу:<br>' +
      '• NPV = ' + npv.toLocaleString('uk-UA', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' грн<br>' +
      '• PI = ' + pi.toFixed(2) + '<br>' +
      '• Висновок: ' + status;
  }
}
function calculateConstructionProject() {
  var direct = parseFloat(document.getElementById('const-direct').value) || 0;
  var overhead = parseFloat(document.getElementById('const-overhead').value) || 0;
  var price = parseFloat(document.getElementById('const-price').value) || 0;

  // Розрахунок повної собівартості будівельних робіт
  var totalCost = direct + overhead;
  
  // Розрахунок кошторисного прибутку
  var profit = price - totalCost;
  
  // Розрахунок рентабельності витрат
  var profitability = totalCost !== 0 ? (profit / totalCost) * 100 : 0;

  var resultDiv = document.getElementById('const-result');
  if (resultDiv) {
    resultDiv.style.display = 'block';
    
    // Аналіз рентабельності підряду
    var evaluation = '';
    if (profit < 0) {
      evaluation = '<b style="color: #ef4444;">Збитковий проєкт! Договірна ціна нижча за собівартість.</b>';
    } else if (profitability < 10) {
      evaluation = '<b style="color: #eab308;">Низькорентабельний проєкт (ризикований для будівництва).</b>';
    } else {
      evaluation = '<b style="color: #22c55e;">Високорентабельний проєкт (економічно привабливий).</b>';
    }

    resultDiv.innerHTML = 
      'Аналіз кошторисної структури:<br>' +
      '• Повна собівартість = ' + totalCost.toLocaleString('uk-UA') + ' грн<br>' +
      '• Кошторисний прибуток = ' + profit.toLocaleString('uk-UA') + ' грн<br>' +
      '• Рентабельність витрат = ' + profitability.toFixed(2) + '%<br>' +
      '• Оцінка аналітика: ' + evaluation;
  }
}

(function() {
  // 1. Інжектуємо глобальні CSS-змінні темної теми для ВСІХ сторінок сайту (і лекцій, і лабораторії)
  var styleTag = document.createElement("style");
  styleTag.innerHTML = `
    /* Глобальні змінні темної теми для всього сайту */
    body.dark-theme {
      --bg: #0A0D14 !important;
      --bg2: #111520 !important;
      --bg3: #181D2C !important;
      --bg4: #1E2436 !important;
      --line: rgba(255, 255, 255, 0.08) !important;
      --line2: rgba(255, 255, 255, 0.15) !important;
      
      /* Для лекцій та конспекту */
      --ink: #F4F1EC !important;
      --ink2: #9A95A8 !important;
      --accent: #D4A843 !important;
      
      /* Для лабораторії розрахунків */
      --gold: #D4A843 !important;
      --gold2: #F0C96A !important;
      --gold-dim: rgba(212, 168, 67, 0.12) !important;
      --teal: #3ECFAA !important;
      --red: #E05252 !important;
      --blue: #5B9CF6 !important;
      --purple: #A78BFA !important;
      --white: #F4F1EC !important;
      --white-f: #F4F1EC !important;
      --mid: #9A95A8 !important;
      --muted: #5A5669 !important;
    }
    
    /* Коригування для тексту та специфічних блоків у темній темі */
    body.dark-theme .mini-calc-card, 
    body.dark-theme div[style*="background: var(--bg2)"] {
      background: var(--bg2) !important;
      border-color: var(--line2) !important;
    }
    body.dark-theme input {
      background: var(--bg3) !important;
      color: var(--white) !important;
      border-color: var(--line) !important;
    }
    body.dark-theme [style*="color: rgb(0, 77, 61)"],
    body.dark-theme [style*="color: #004D3D"] {
      color: var(--teal) !important;
    }
    body.dark-theme .hdr-kick {
      color: var(--gold) !important;
    }
  `;
  document.head.appendChild(styleTag);

  // 2. Функція ініціалізації перемикача після завантаження DOM
  function initThemeToggle() {
    if (document.getElementById("global-theme-toggle")) return;

    var currentTheme = localStorage.getItem("theme");
    if (currentTheme === "dark") {
      document.body.classList.add("dark-theme");
    }

    // Створюємо кнопку
    var toggleBtn = document.createElement("button");
    toggleBtn.id = "global-theme-toggle";
    toggleBtn.innerHTML = currentTheme === "dark" ? "☀️" : "🌙";
    
    // Стилізуємо кнопку (фіксована у верхньому правому кутку, акуратна й помітна)
    toggleBtn.setAttribute("style", "position: fixed; top: 16px; right: 24px; z-index: 99999; width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--line2); background: var(--bg2); color: var(--white); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.2s ease; outline: none;");
    
    document.body.appendChild(toggleBtn);

    // Логіка перемикання за кліком
    toggleBtn.addEventListener("click", function() {
      document.body.classList.toggle("dark-theme");
      var theme = "light";
      if (document.body.classList.contains("dark-theme")) {
        theme = "dark";
        toggleBtn.innerHTML = "☀️";
      } else {
        toggleBtn.innerHTML = "🌙";
      }
      localStorage.setItem("theme", theme);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initThemeToggle);
  } else {
    initThemeToggle();
  }
})();

// Глобальна автоматична темна тема для index.html та materials.html
document.addEventListener("DOMContentLoaded", function() {
  var currentTheme = localStorage.getItem("theme");
  if (currentTheme === "dark") {
    document.body.classList.add("dark-theme");
  }
  
  // Якщо стилі темної теми ще не додані на світлу сторінку — інжектуємо їх
  if (!document.getElementById("global-dark-overrides")) {
    var styleNode = document.createElement("style");
    styleNode.id = "global-dark-overrides";
    styleNode.innerHTML = `
      body.dark-theme {
        background-color: #0A0D14 !important;
        color: #F4F1EC !important;
        --bg: #0A0D14 !important;
        --bg2: #111520 !important;
        --bg3: #181D2C !important;
        --line: rgba(255, 255, 255, 0.08) !important;
        --line2: rgba(255, 255, 255, 0.15) !important;
        --ink: #F4F1EC !important;
        --ink2: #9A95A8 !important;
        --accent: #D4A843 !important;
      }
      body.dark-theme .mini-calc-card,
      body.dark-theme div[style*="background: var(--bg2)"],
      body.dark-theme .site-main-nav {
        background: #111520 !important;
        border-color: rgba(255, 255, 255, 0.15) !important;
      }
      body.dark-theme input {
        background: #181D2C !important;
        color: #F4F1EC !important;
        border-color: rgba(255, 255, 255, 0.08) !important;
      }
      body.dark-theme h1, body.dark-theme h2, body.dark-theme h3, body.dark-theme h4 {
        color: #F4F1EC !important;
      }
    `;
    document.head.appendChild(styleNode);
  }
});
