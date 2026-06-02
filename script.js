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