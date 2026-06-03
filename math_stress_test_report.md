# Звіт про математичний стрес-тест логіки обчислень у файлі `economic-tasks.html`

Цей звіт підготовлено в межах стрес-тестування математичних розрахункових функцій інтерактивного посібника `economic-tasks.html`. Було проведено детальний аудит 16 ключових розрахункових функцій на стійкість до граничних і некоректних вхідних значень: ділення на нуль, негативні числа, порожній ввід, `NaN`, а також надто великі числа, що можуть призвести до зависання інтерфейсу користувача.

---

## 1. Загальний підсумок аудиту та оцінка ризиків

| № | Функція | Перевірений модуль | Виявлені вразливості та баги | Рівень ризику |
|---|---|---|---|---|
| 1 | `ci()` | Складні відсотки | Ділення на нуль (`r = 0` у правилі 72), ділення на нуль (`m = 0`), зависання браузера через безмежний цикл за великих `n`. | **Високий** |
| 2 | `an()` | Ануїтет / Кредит | Ділення на нуль та `NaN` за `n = 0`, ділення на нуль у розрахунку переплати за `total = 0`. | **Високий** |
| 3 | `calcNPV()` | NPV / IRR | Автоматичне примусове перезаписування коректного вводу `ic = 0` на `1` (баг логіки). Ділення на нуль при `r = -100%`. | **Середній** |
| 4 | `dep()` | Амортизація | Ділення на нуль при `n = 0` або `cv = 0`. Зависання браузера через безмежний цикл при великих `n`. Від’ємна амортизація при `sv > cv`. | **Високий** |
| 5 | `be()` | Беззбитковість | Потенційно великий крок графіка при маржинальному доході `cm` близькому до нуля (bq вибухає). | **Середній** |
| 6 | `rp()` | Рентабельність | Баг логіки: примусове перезаписування `0` на `1` для показників виручки, активів та капіталу (`||1`). Збої відображення діаграм при негативних значеннях. | **Середній** |
| 7 | `liq()` | Ліквідність | Баг логіки: примусове перезаписування `0` на `1` для зобов’язань та виручки (`||1`). Ділення на нуль при `cl = 0` або `eq = 0`. | **Середній** |
| 8 | `waccCalc()` | WACC | Ділення на нуль при `D + E = 0` (наприклад, `D = 1000, E = -1000`). Некоректні ваги. | **Середній** |
| 9 | `bondCalc()` | Облігації | Ділення на нуль при `m = 0` або `price = 0`, або `fv = 0`. Зависання браузера через цикл при великих `n`. | **Високий** |
| 10 | `stockCalc()` | Акції / DDM | Помилка обчислення відхилення (`diff`) при `mp = 0` (ділення на нуль, дає `Infinity`). | **Низький** |
| 11 | `projComp()` | Порівняння проектів | Ділення на нуль при `ic = 0` (індекс рентабельності PI). Ділення на нуль у простому/дисконтованому періоді окупності при `cf = 0`. | **Високий** |
| 12 | `riskScen()` | Сценарний аналіз | Логічний баг: негативні ймовірності проходять валідацію суми (`pSum = 1`), призводячи до квадратного кореня від від’ємного числа (`NaN`). | **Середній** |
| 13 | `maDirect()` | Direct Costing | Захищено за допомогою `Math.max(..., 1)` для обсягів виробництва та продажу. Стійка робота. | **Низький** |
| 14 | `maBudget()` | Бюджет і відхилення | Чиста лінійна арифметика без ділення. Стійка робота. | **Низький** |
| 15 | `faTrend()` | Горизонтальний аналіз | Баг логіки: перезаписування `0` на `1` для виручки та капіталу. Ділення на нуль при базовому періоді `0`. | **Середній** |
| 16 | `faStable()` | Стійкість і coverage | Баг логіки: перезаписування `0` на `1`. Ділення на нуль при відсутності відсотків (`int = 0`) або виплат (`ds = 0`). | **Середній** |

---

## 2. Детальний аналіз виявлених помилок та вразливостей

### 2.1. Вразливості типу "Зависання інтерфейсу" (Infinite Loops / Tab Freeze)
* **Функції:** `ci()`, `dep()`, `bondCalc()`.
* **Суть проблеми:** У цих функціях використовуються цикли `for` для побудови графіків та таблиць, які ітерують від `0` до `n` (або `N = n * m`). Якщо користувач введе в текстове поле або змінить значення через консоль до дуже великого числа (наприклад, `100 000`), браузер спробує виконати сотні тисяч ітерацій, створюючи масиви точок для Chart.js та елементи HTML. Це спричиняє перевантаження процесора (CPU Lock) та виділення пам'яті (Out of Memory), повністю вішаючи вкладку браузера.
* **Приклад коду з помилкою (`ci()`):**
  ```javascript
  const n=+document.getElementById('c_n').value;
  ...
  for(let y=0;y<=n;y++){lbls.push(y); ...} // Зависає при великих n
  ```

### 2.2. Помилки ділення на нуль (Division by Zero & NaN)
* **Функції:** `ci()`, `an()`, `dep()`, `waccCalc()`, `bondCalc()`, `stockCalc()`, `projComp()`, `faTrend()`, `faStable()`.
* **Суть проблеми:** За відсутності належної перевірки дільника, деякі розрахунки виконують операцію `x / 0`, що в JavaScript дає `Infinity` або `NaN`, які згодом передаються на відображення користувачу або ламають наступні арифметичні кроки.
* **Яскраві приклади:**
  1. **Правило 72 у `ci()`:** `72 / (r * 100)`. Якщо ставка `r = 0`, результат дорівнює `Infinity р.`.
  2. **Ануїтетний платіж у `an()`:** Якщо термін `n = 0`, дільник `1 - Math.pow(1+rm, -N)` стає `0`, а платіж `A` дорівнює `Infinity`. Загальна сума виплат `A * N` стає `Infinity * 0 = NaN`.
  3. **Індекс рентабельності у `projComp()`:** `p.pi = p.pvcf / p.ic`. Якщо початкова інвестиція `ic = 0`, індекс дорівнює `Infinity`.
  4. **Оцінка акцій у `stockCalc()`:** `diff = (avg - mp) / mp * 100`. Якщо ринкова ціна `mp = 0`, відхилення стає `Infinity`.

### 2.3. Логічний баг "Перезапис нульових значень" (Falsy Overrides)
* **Функції:** `calcNPV()`, `rp()`, `liq()`, `faTrend()`, `faStable()`.
* **Суть проблеми:** Бажаючи уникнути ділення на нуль, розробник застосував конструкцію типу `const value = +el.value || 1` або `const value = +el.value || 1000`. Втім, у фінансах та обліку значення `0` є цілком коректним вхідним параметром (наприклад: підприємство на стадії запуску має 0 виручки, 0 капіталу або 0 початкових інвестицій для безкоштовного грантового проекту). Застосована логіка примусово замінює цей введений `0` на дефолтне значення `1` (або `1000`), спотворюючи результат розрахунків.
* **Приклад з `rp()`:**
  ```javascript
  const rev=+document.getElementById('rp_rev').value||1; // Замінює введений користувачем 0 на 1!
  ```

### 2.4. Некоректна логіка валідації сценаріїв у `riskScen()`
* **Функція:** `riskScen()`.
* **Суть проблеми:** Код перевіряє лише суму ймовірностей: `const warn = Math.abs(pSum - 1) > 0.001`. Але він не перевіряє, чи є окремі ймовірності негативними. Якщо ввести `p1 = 1.5`, `p2 = -0.5`, `p3 = 0`, сума дорівнює `1.0`, валідація проходить успішно. Проте від'ємна ймовірність `p2` призводить до від'ємного доданку у формулі дисперсії. Якщо сумарна дисперсія виявляється негативною, то `Math.sqrt` повертає `NaN`, руйнуючи весь розрахунок ризику.

---

## 3. Безпечні Diff-патчі для виправлення багів

Нижче наведено детальні блоки коду для заміни у файлі `economic-tasks.html`. Користувач може безпечно накласти ці патчі для усунення виявлених багів.

### 3.1. Виправлення модуля Складних відсотків (`ci()`)

Цей патч обмежує максимальну кількість років до 100 (для уникнення зависання браузера), додає перевірку на `m = 0` та усуває ділення на нуль у Правилі 72 та коефіцієнті зростання.

```diff
<<<<
function ci(){
  const pv=+document.getElementById('c_pv').value,r=+document.getElementById('c_r').value/100;
  const n=+document.getElementById('c_n').value,m=+document.getElementById('c_m').value;
  document.getElementById('v_pv').textContent=f(pv)+' ₴';
  document.getElementById('v_r').textContent=(r*100).toFixed(1)+'%';
  document.getElementById('v_n').textContent=n+' р.';
  const fv=pv*Math.pow(1+r/m,n*m),ear=Math.pow(1+r/m,m)-1;
  document.getElementById('r_fv').textContent=f(fv);
  document.getElementById('r_int').textContent=f(fv-pv);
  document.getElementById('r_ear').textContent=(ear*100).toFixed(2)+'%';
  document.getElementById('r_mult').textContent=(fv/pv).toFixed(3)+'×';
  document.getElementById('r_r72').textContent=(72/(r*100)).toFixed(1)+' р.';
  const c='50px 1fr 1fr 1fr 1fr';
  let h=`<div class="th" style="grid-template-columns:${c}"><span>Рік</span><span>Початок</span><span>Нараховано</span><span>Кінець</span><span>Зріст ×</span></div>`;
  let bal=pv;
  for(let y=1;y<=n;y++){
    const nb=bal*Math.pow(1+r/m,m);
    h+=`<div class="tr${y===n?' hl':''}" style="grid-template-columns:${c}"><span>${y}</span><span class="n">${f(bal)} ₴</span><span class="n g">+${f(nb-bal)} ₴</span><span class="n">${f(nb)} ₴</span><span class="n b">${(nb/pv).toFixed(3)}×</span></div>`;
    bal=nb;
  }
====
function ci(){
  const pv=+document.getElementById('c_pv').value,r=+document.getElementById('c_r').value/100;
  const n=Math.min(100, Math.max(0, +document.getElementById('c_n').value)), m=Math.max(1, +document.getElementById('c_m').value || 1);
  document.getElementById('v_pv').textContent=f(pv)+' ₴';
  document.getElementById('v_r').textContent=(r*100).toFixed(1)+'%';
  document.getElementById('v_n').textContent=n+' р.';
  const fv=pv*Math.pow(1+r/m,n*m),ear=Math.pow(1+r/m,m)-1;
  document.getElementById('r_fv').textContent=f(fv);
  document.getElementById('r_int').textContent=f(fv-pv);
  document.getElementById('r_ear').textContent=(ear*100).toFixed(2)+'%';
  document.getElementById('r_mult').textContent=pv===0?'1.000×':(fv/pv).toFixed(3)+'×';
  document.getElementById('r_r72').textContent=r===0?'—':(72/(r*100)).toFixed(1)+' р.';
  const c='50px 1fr 1fr 1fr 1fr';
  let h=`<div class="th" style="grid-template-columns:${c}"><span>Рік</span><span>Початок</span><span>Нараховано</span><span>Кінець</span><span>Зріст ×</span></div>`;
  let bal=pv;
  for(let y=1;y<=n;y++){
    const nb=bal*Math.pow(1+r/m,m);
    h+=`<div class="tr${y===n?' hl':''}" style="grid-template-columns:${c}"><span>${y}</span><span class="n">${f(bal)} ₴</span><span class="n g">+${f(nb-bal)} ₴</span><span class="n">${f(nb)} ₴</span><span class="n b">${pv===0?'1.000':(nb/pv).toFixed(3)}×</span></div>`;
    bal=nb;
  }
>>>>
```

### 3.2. Виправлення модуля Ануїтету (`an()`)

Запобігає діленню на нуль, якщо строк `n = 0`, та валідує розрахунок відсотка переплати, коли загальні виплати дорівнюють нулю.

```diff
<<<<
  const pv=pvF*(1-dp),rm=r/12,N=n*12;
  const A=rm===0?pv/N:pv*rm/(1-Math.pow(1+rm,-N));
  const total=A*N+pvF*dp;
  const over=total-pvF;
  document.getElementById('r_apay').textContent=f(A);
  document.getElementById('r_atot').textContent=f(total);
  document.getElementById('r_aover').textContent=f(over);
  document.getElementById('r_abody').textContent=f(pv);
  document.getElementById('r_apct').textContent=(over/total*100).toFixed(1)+'%';
====
  const pv=pvF*(1-dp),rm=r/12,N=n*12;
  let A=0;
  if(N>0){
    A=rm===0?pv/N:pv*rm/(1-Math.pow(1+rm,-N));
  }
  const total=N>0?A*N+pvF*dp:pvF*dp;
  const over=Math.max(0, total-pvF);
  document.getElementById('r_apay').textContent=f(A);
  document.getElementById('r_atot').textContent=f(total);
  document.getElementById('r_aover').textContent=f(over);
  document.getElementById('r_abody').textContent=f(pv);
  document.getElementById('r_apct').textContent=total===0?'0.0%':(over/total*100).toFixed(1)+'%';
>>>>
```

### 3.3. Виправлення модуля NPV/IRR (`calcNPV()`)

Дозволяє коректно вносити 0 для початкових інвестицій та запобігає діленню на нуль за ставки дисконтування `-100%`.

```diff
<<<<
function calcNPV(){
  const ic=+document.getElementById('n_ic').value||1;
  const r=+document.getElementById('n_r').value/100;
  document.getElementById('v_nr').textContent=(r*100).toFixed(0)+'%';
  const cfs=[
    +document.getElementById('n_cf1').value||0,
    +document.getElementById('n_cf2').value||0,
    +document.getElementById('n_cf3').value||0,
    +document.getElementById('n_cf4').value||0,
    +document.getElementById('n_cf5').value||0,
    +document.getElementById('n_cf6').value||0
  ];
  let pvcf=0;
  const c='40px 1fr 1fr 1fr 1fr';
  let h=`<div class="th" style="grid-template-columns:${c}"><span>Рік</span><span>CF (тис. ₴)</span><span>Коеф. диск. 1/(1+r)ᵗ</span><span>PV (тис. ₴)</span><span>Наростаючий NPV</span></div>`;
  h+=`<div class="tr" style="grid-template-columns:${c}"><span>0</span><span class="n r">−${f(ic)} тис.</span><span class="n">1.0000</span><span class="n r">−${f(ic)} тис.</span><span class="n r">−${f(ic,1)}</span></div>`;
  let cumNPV=-ic;
  for(let t=1;t<=6;t++){
    const df=1/Math.pow(1+r,t),pv=cfs[t-1]*df;
    pvcf+=pv;cumNPV+=pv;
    h+=`<div class="tr${t===6?' hl':''}" style="grid-template-columns:${c}"><span>${t}</span><span class="n">${f(cfs[t-1])} тис.</span><span class="n">${df.toFixed(4)}</span><span class="n g">${f(pv,1)} тис.</span><span class="n ${cumNPV>=0?'g':'r'}">${f(cumNPV,1)}</span></div>`;
  }
  document.getElementById('t_npv').innerHTML=h;
  const nv=pvcf-ic,pi=pvcf/ic;
====
function calcNPV(){
  const rawIc=+document.getElementById('n_ic').value;
  const ic=isNaN(rawIc)?0:rawIc;
  const r=+document.getElementById('n_r').value/100;
  document.getElementById('v_nr').textContent=(r*100).toFixed(0)+'%';
  const cfs=[
    +document.getElementById('n_cf1').value||0,
    +document.getElementById('n_cf2').value||0,
    +document.getElementById('n_cf3').value||0,
    +document.getElementById('n_cf4').value||0,
    +document.getElementById('n_cf5').value||0,
    +document.getElementById('n_cf6').value||0
  ];
  let pvcf=0;
  const c='40px 1fr 1fr 1fr 1fr';
  let h=`<div class="th" style="grid-template-columns:${c}"><span>Рік</span><span>CF (тис. ₴)</span><span>Коеф. диск. 1/(1+r)ᵗ</span><span>PV (тис. ₴)</span><span>Наростаючий NPV</span></div>`;
  h+=`<div class="tr" style="grid-template-columns:${c}"><span>0</span><span class="n r">−${f(ic)} тис.</span><span class="n">1.0000</span><span class="n r">−${f(ic)} тис.</span><span class="n r">−${f(ic,1)}</span></div>`;
  let cumNPV=-ic;
  for(let t=1;t<=6;t++){
    const df=(1+r)===0?0:1/Math.pow(1+r,t),pv=cfs[t-1]*df;
    pvcf+=pv;cumNPV+=pv;
    h+=`<div class="tr${t===6?' hl':''}" style="grid-template-columns:${c}"><span>${t}</span><span class="n">${f(cfs[t-1])} тис.</span><span class="n">${df.toFixed(4)}</span><span class="n g">${f(pv,1)} тис.</span><span class="n ${cumNPV>=0?'g':'r'}">${f(cumNPV,1)}</span></div>`;
  }
  document.getElementById('t_npv').innerHTML=h;
  const nv=pvcf-ic;
  const pi=ic===0?(pvcf>=0?1:0):pvcf/ic;
>>>>
```

### 3.4. Виправлення модуля Амортизації (`dep()`)

Виправляє ділення на нуль при `n = 0` та `cv = 0`, обмежує роки амортизації для стабільності та запобігає негативній нормі через salvage value > cost.

```diff
<<<<
function dep(){
  const cv=+document.getElementById('d_cv').value;
  const sv=+document.getElementById('d_sv').value;
  const n=+document.getElementById('d_n').value;
  const k=+document.getElementById('d_k').value;
  document.getElementById('v_dcv').textContent=f(cv);
  document.getElementById('v_dsv').textContent=f(sv);
  document.getElementById('v_dn').textContent=n+' р.';
  document.getElementById('v_dk').textContent=k.toFixed(1)+'×';
  const depAmt=cv-sv;
  const slA=depAmt/n;
  document.getElementById('r_dsl').textContent=f(slA,1);
  document.getElementById('r_drate').textContent=(slA/cv*100).toFixed(2)+'%';
  document.getElementById('r_dtot').textContent=f(depAmt,1);
  document.getElementById('r_dres').textContent=f(sv,1);
  const sydk=n*(n+1)/2;
  const c='44px 1fr 1fr 1fr 1fr';
  let h=`<div class="th" style="grid-template-columns:${c}"><span>Рік</span><span>Прямолінійний</span><span>Зал. що зменш.</span><span>Кумулятивний</span><span>Залишкова (прям.)</span></div>`;
  const slBVs=[],dbBVs=[],sydBVs[];
  let slBV=cv,dbBV=cv,sydBV=cv;
  const dbRate=k/n;
====
function dep(){
  const cv=Math.max(0, +document.getElementById('d_cv').value);
  const sv=Math.min(cv, Math.max(0, +document.getElementById('d_sv').value));
  const n=Math.min(100, Math.max(0, +document.getElementById('d_n').value));
  const k=+document.getElementById('d_k').value;
  document.getElementById('v_dcv').textContent=f(cv);
  document.getElementById('v_dsv').textContent=f(sv);
  document.getElementById('v_dn').textContent=n+' р.';
  document.getElementById('v_dk').textContent=k.toFixed(1)+'×';
  if(n===0){
    document.getElementById('r_dsl').textContent='0';
    document.getElementById('r_drate').textContent='0.00%';
    document.getElementById('r_dtot').textContent='0';
    document.getElementById('r_dres').textContent=f(sv,1);
    document.getElementById('t_dep').innerHTML='';
    return;
  }
  const depAmt=cv-sv;
  const slA=depAmt/n;
  document.getElementById('r_dsl').textContent=f(slA,1);
  document.getElementById('r_drate').textContent=cv===0?'0.00%':(slA/cv*100).toFixed(2)+'%';
  document.getElementById('r_dtot').textContent=f(depAmt,1);
  document.getElementById('r_dres').textContent=f(sv,1);
  const sydk=n*(n+1)/2;
  const c='44px 1fr 1fr 1fr 1fr';
  let h=`<div class="th" style="grid-template-columns:${c}"><span>Рік</span><span>Прямолінійний</span><span>Зал. що зменш.</span><span>Кумулятивний</span><span>Залишкова (прям.)</span></div>`;
  const slBVs=[],dbBVs=[],sydBVs[];
  let slBV=cv,dbBV=cv,sydBV=cv;
  const dbRate=k/n;
>>>>
```

### 3.5. Виправлення модуля Точки беззбитковості (`be()`)

Захищає від ділення на нуль, якщо `p = 0`, та обмежує нижній поріг маржинального доходу (`cm`), щоб уникнути некоректних розрахунків графіків за мікроскопічної маржі.

```diff
<<<<
  const cm=p-vc;if(cm<=0){document.getElementById('r_bq').textContent='∞';return;}
  const bq=fc/cm,bs=fc/(1-vc/p),rev=q*p,tc=fc+q*vc,pr=rev-tc;
====
  const cm=p-vc;
  if(cm<=0.01){
    document.getElementById('r_bq').textContent='∞';
    document.getElementById('r_bs').textContent='∞';
    document.getElementById('r_bm').textContent='0.0%';
    document.getElementById('r_bp').textContent='0';
    document.getElementById('r_dol').textContent='∞';
    return;
  }
  const bq=fc/cm,bs=p===0?Infinity:fc/(1-vc/p),rev=q*p,tc=fc+q*vc,pr=rev-tc;
>>>>
```

### 3.6. Виправлення модуля Рентабельності (`rp()`)

Запобігає багу перезапису нульового вводу, перевірці ділення на нуль для `a`, `e` та `rev`, та коригує діапазон відображення для радарного графіка, усуваючи негативну ширину стовпчиків у CSS.

```diff
<<<<
function rp(){
  const rev=+document.getElementById('rp_rev').value||1,np=+document.getElementById('rp_np').value||0;
  const a=+document.getElementById('rp_a').value||1,e=+document.getElementById('rp_e').value||1;
  const eb=+document.getElementById('rp_eb').value||0,cg=+document.getElementById('rp_cg').value||0;
  const roa=np/a*100,roe=np/e*100,ros=np/rev*100,em=eb/rev*100,gm=(rev-cg)/rev*100;
  document.getElementById('rr_roa').textContent=roa.toFixed(2)+'%';
  document.getElementById('rr_roe').textContent=roe.toFixed(2)+'%';
  document.getElementById('rr_ros').textContent=ros.toFixed(2)+'%';
  document.getElementById('rr_em').textContent=em.toFixed(2)+'%';
  const mts=[['ROA — рентаб. активів',roa,15,'bg'],['ROE — рентаб. капіталу',roe,30,'bgo'],['ROS — рентаб. продажів',ros,20,'bt2'],['EBITDA margin',em,30,'bg'],['Валова маржа',gm,80,'bp']];
  document.getElementById('b_rp').innerHTML=mts.map(([l,v,mx,c])=>`<div class="br"><div class="bl">${l}</div><div class="bt"><div class="bf ${c}" style="width:${Math.min(100,v/mx*100).toFixed(1)}%">${v.toFixed(1)}%</div></div></div>`).join('');
====
function rp(){
  const rawRev=+document.getElementById('rp_rev').value;
  const rawA=+document.getElementById('rp_a').value;
  const rawE=+document.getElementById('rp_e').value;
  const rev=isNaN(rawRev)?1:rawRev;
  const a=isNaN(rawA)?1:rawA;
  const e=isNaN(rawE)?1:rawE;
  const np=+document.getElementById('rp_np').value||0;
  const eb=+document.getElementById('rp_eb').value||0,cg=+document.getElementById('rp_cg').value||0;
  const roa=a===0?0:np/a*100;
  const roe=e===0?0:np/e*100;
  const ros=rev===0?0:np/rev*100;
  const em=rev===0?0:eb/rev*100;
  const gm=rev===0?0:(rev-cg)/rev*100;
  document.getElementById('rr_roa').textContent=roa.toFixed(2)+'%';
  document.getElementById('rr_roe').textContent=roe.toFixed(2)+'%';
  document.getElementById('rr_ros').textContent=ros.toFixed(2)+'%';
  document.getElementById('rr_em').textContent=em.toFixed(2)+'%';
  const mts=[['ROA — рентаб. активів',roa,15,'bg'],['ROE — рентаб. капіталу',roe,30,'bgo'],['ROS — рентаб. продажів',ros,20,'bt2'],['EBITDA margin',em,30,'bg'],['Валова маржа',gm,80,'bp']];
  document.getElementById('b_rp').innerHTML=mts.map(([l,v,mx,c])=>`<div class="br"><div class="bl">${l}</div><div class="bt"><div class="bf ${c}" style="width:${Math.max(0, Math.min(100,v/mx*100)).toFixed(1)}%">${v.toFixed(1)}%</div></div></div>`).join('');
>>>>
```

І на початку побудови радарної діаграми `rp()`:

```diff
<<<<
  // Radar chart
  const benchmarks=[8,20,10,20,40];
  const actuals=[Math.min(roa,50),Math.min(roe,50),Math.min(ros,50),Math.min(em,50),Math.min(gm,80)];
====
  // Radar chart
  const benchmarks=[8,20,10,20,40];
  const actuals=[Math.max(0, Math.min(roa,50)),Math.max(0, Math.min(roe,50)),Math.max(0, Math.min(ros,50)),Math.max(0, Math.min(em,50)),Math.max(0, Math.min(gm,80))];
>>>>
```

### 3.7. Виправлення модуля Ліквідності (`liq()`)

Усуває примусовий перезапис введеного `0` на `1` та захищає від ділення на нуль при розрахунках Кпл, Кшл, Кал, оборотності активів та запасів.

```diff
<<<<
function liq(){
  const ca=+document.getElementById('l_ca').value||1;
  const inv=+document.getElementById('l_inv').value||0;
  const cash=+document.getElementById('l_cash').value||0;
  const cl=+document.getElementById('l_cl').value||1;
  const rev=+document.getElementById('l_rev').value||1;
  const ar=+document.getElementById('l_ar').value||0;
  const cogs=+document.getElementById('l_cogs').value||1;
  const ta=+document.getElementById('l_ta').value||1;
  const eq=+document.getElementById('l_eq').value||1;

  const cr=ca/cl,qr=(ca-inv)/cl,alr=cash/cl;
  const at=rev/ta,it=cogs/Math.max(inv,1),dso=ar/(rev/365);
  const de=(ta-eq)/eq; // debt to equity
====
function liq(){
  const ca=+document.getElementById('l_ca').value||0;
  const inv=+document.getElementById('l_inv').value||0;
  const cash=+document.getElementById('l_cash').value||0;
  const cl=+document.getElementById('l_cl').value||0;
  const rev=+document.getElementById('l_rev').value||0;
  const ar=+document.getElementById('l_ar').value||0;
  const cogs=+document.getElementById('l_cogs').value||0;
  const ta=+document.getElementById('l_ta').value||0;
  const eq=+document.getElementById('l_eq').value||0;

  const cr=cl===0?0:ca/cl;
  const qr=cl===0?0:(ca-inv)/cl;
  const alr=cl===0?0:cash/cl;
  const at=ta===0?0:rev/ta;
  const it=Math.max(inv,0)===0?0:cogs/inv;
  const dso=rev===0?0:ar/(rev/365);
  const de=eq===0?0:(ta-eq)/eq;
>>>>
```

Та у нормалізації для радарного графіка:

```diff
<<<<
  // Radar — normalize to %max
  const norm=(v,max)=>Math.min(v/max*100,120);
====
  // Radar — normalize to %max
  const norm=(v,max)=>Math.max(0, Math.min(v/max*100,120));
>>>>
```

### 3.8. Виправлення модуля WACC (`waccCalc()`)

Запобігає діленню на нуль за рівності сумарного капіталу `D + E = 0`.

```diff
<<<<
  const V=D+E,wd=D/V,we=E/V;
  const re=rf+beta*(rm-rf);
  const wv=wd*rd*(1-T)+we*re;
====
  const V=D+E;
  const wd=V===0?0:D/V;
  const we=V===0?0:E/V;
  const re=rf+beta*(rm-rf);
  const wv=wd*rd*(1-T)+we*re;
>>>>
```

### 3.9. Виправлення модуля цін Облігацій (`bondCalc()`)

Запобігає діленню на нуль, якщо `m = 0`, `price = 0`, або `fv = 0`, та обмежує термін `n` для уникнення зависання браузера.

```diff
<<<<
function bondCalc(){
  const fv=+document.getElementById('bo_fv').value||1000;
  const cr=+document.getElementById('bo_cr').value/100||0;
  const n=+document.getElementById('bo_n').value||5;
  const y=+document.getElementById('bo_y').value/100||0;
  const m=+document.getElementById('bo_m').value||1;
  const N=n*m,r=y/m,C=fv*cr/m;
  let price=0,dur=0;
  for(let t=1;t<=N;t++){
    const cf=(t===N)?C+fv:C;
    const pv=cf/Math.pow(1+r,t);
    price+=pv; dur+=(t/m)*pv;
  }
  dur/=price;
  const modDur=dur/(1+r);
  const prem=(price-fv)/fv*100;
  const cy=(C*m)/price*100;
====
function bondCalc(){
  const fv=+document.getElementById('bo_fv').value||1000;
  const cr=+document.getElementById('bo_cr').value/100||0;
  const n=Math.min(100, Math.max(0, +document.getElementById('bo_n').value));
  const y=+document.getElementById('bo_y').value/100||0;
  const m=Math.max(1, +document.getElementById('bo_m').value||1);
  const N=n*m,r=y/m,C=fv*cr/m;
  let price=0,dur=0;
  for(let t=1;t<=N;t++){
    const cf=(t===N)?C+fv:C;
    const pv=(1+r)===0?0:cf/Math.pow(1+r,t);
    price+=pv; dur+=(t/m)*pv;
  }
  if(price>0){
    dur/=price;
  } else {
    dur=0;
  }
  const modDur=(1+r)===0?0:dur/(1+r);
  const prem=fv===0?0:(price-fv)/fv*100;
  const cy=price===0?0:(C*m)/price*100;
>>>>
```

### 3.10. Виправлення оцінки Акцій (`stockCalc()`)

Запобігає діленню на нуль за ринкової ціни `mp = 0`.

```diff
<<<<
  const avg=(isNaN(pDDM)?pPE:(pDDM+pPE)/2);
  const diff=(avg-mp)/mp*100;
====
  const avg=(isNaN(pDDM)?pPE:(pDDM+pPE)/2);
  const diff=mp>0?(avg-mp)/mp*100:0;
>>>>
```

### 3.11. Виправлення Порівняння проектів (`projComp()`)

Усуває ділення на нуль, коли `ic = 0` (для показника PI та простого/дисконтованого періоду окупності), а також підтримує перевірку `r = -100%`.

```diff
<<<<
  projs.forEach(p=>{
    // NPV
    p.pvcf=p.cfs.reduce((s,cf,i)=>s+cf/Math.pow(1+r,i+1),0);
    p.npv=p.pvcf-p.ic;
    p.pi=p.pvcf/p.ic;
    // IRR
    p.irr=irrCalc([-p.ic,...p.cfs]);
    // PP (simple)
    let cum=0,pp=null;
    for(let i=0;i<p.cfs.length;i++){cum+=p.cfs[i];if(cum>=p.ic&&pp===null)pp=i+(p.ic-(cum-p.cfs[i]))/p.cfs[i];}
    p.pp=pp||Infinity;
    // DPP (discounted)
    let dcum=0,dpp=null;
    for(let i=0;i<p.cfs.length;i++){dcum+=p.cfs[i]/Math.pow(1+r,i+1);if(dcum>=p.ic&&dpp===null)dpp=i+(p.ic-(dcum-p.cfs[i]/Math.pow(1+r,i+1)))/(p.cfs[i]/Math.pow(1+r,i+1));}
    p.dpp=dpp||Infinity;
  });
====
  projs.forEach(p=>{
    // NPV
    p.pvcf=p.cfs.reduce((s,cf,i)=>s+cf/Math.pow(1+r,i+1),0);
    p.npv=p.pvcf-p.ic;
    p.pi=p.ic===0?(p.pvcf>=0?1:0):p.pvcf/p.ic;
    // IRR
    p.irr=irrCalc([-p.ic,...p.cfs]);
    // PP (simple)
    let cum=0,pp=null;
    if(p.ic===0){
      pp=0;
    } else {
      for(let i=0;i<p.cfs.length;i++){
        cum+=p.cfs[i];
        if(cum>=p.ic&&pp===null&&p.cfs[i]!==0)pp=i+(p.ic-(cum-p.cfs[i]))/p.cfs[i];
      }
    }
    p.pp=pp!==null?pp:Infinity;
    // DPP (discounted)
    let dcum=0,dpp=null;
    if(p.ic===0){
      dpp=0;
    } else {
      for(let i=0;i<p.cfs.length;i++){
        const df=(1+r)===0?0:1/Math.pow(1+r,i+1);
        const pv=p.cfs[i]*df;
        dcum+=pv;
        if(dcum>=p.ic&&dpp===null&&pv!==0)dpp=i+(p.ic-(dcum-pv))/pv;
      }
    }
    p.dpp=dpp!==null?dpp:Infinity;
  });
>>>>
```

### 3.12. Виправлення Сценарного аналізу (`riskScen()`)

Блокує некоректні від’ємні ймовірності сценаріїв, що ламають обчислення стандартного відхилення (`sigma`).

```diff
<<<<
  const pSum=p1+p2+p3;
  const warn=Math.abs(pSum-1)>0.001;
  document.getElementById('sc_probwarn').style.display=warn?'':'none';
  if(warn)return;
====
  const pSum=p1+p2+p3;
  const warn=Math.abs(pSum-1)>0.001 || p1<0 || p2<0 || p3<0;
  document.getElementById('sc_probwarn').style.display=warn?'':'none';
  if(warn)return;
>>>>
```

### 3.13. Виправлення Горизонтального аналізу (`faTrend()`)

Дозволяє працювати з 0 значеннями виручки та капіталу в базовому періоді, запобігаючи діленню на нуль.

```diff
<<<<
function faTrend(){
  const r0=+document.getElementById('fa_r0').value||1,r1=+document.getElementById('fa_r1').value||1;
  const c0=+document.getElementById('fa_c0').value||0,c1=+document.getElementById('fa_c1').value||0;
  const o0=+document.getElementById('fa_o0').value||0,o1=+document.getElementById('fa_o1').value||0;
  const a0=+document.getElementById('fa_a0').value||1,a1=+document.getElementById('fa_a1').value||1;
  const e0=+document.getElementById('fa_e0').value||1,e1=+document.getElementById('fa_e1').value||1;
  const ebit0=r0-c0-o0,ebit1=r1-c1-o1;
  const revGrowth=(r1-r0)/r0*100,eqGrowth=(e1-e0)/e0*100;
  const margin=ebit1/r1*100,at=r1/a1;
====
function faTrend(){
  const r0=+document.getElementById('fa_r0').value||0,r1=+document.getElementById('fa_r1').value||0;
  const c0=+document.getElementById('fa_c0').value||0,c1=+document.getElementById('fa_c1').value||0;
  const o0=+document.getElementById('fa_o0').value||0,o1=+document.getElementById('fa_o1').value||0;
  const a0=+document.getElementById('fa_a0').value||0,a1=+document.getElementById('fa_a1').value||0;
  const e0=+document.getElementById('fa_e0').value||0,e1=+document.getElementById('fa_e1').value||0;
  const ebit0=r0-c0-o0,ebit1=r1-c1-o1;
  const revGrowth=r0===0?0:(r1-r0)/r0*100;
  const eqGrowth=e0===0?0:(e1-e0)/e0*100;
  const margin=r1===0?0:ebit1/r1*100;
  const at=a1===0?0:r1/a1;
>>>>
```

### 3.14. Виправлення модуля Стійкості (`faStable()`)

Усуває перезапис нульових значень на одиницю та валідує ділення на активи, зобов’язання, відсотки та виплати по боргу.

```diff
<<<<
function faStable(){
  const a=+document.getElementById('fs_a').value||1,e=+document.getElementById('fs_e').value||1,d=+document.getElementById('fs_d').value||0;
  const ca=+document.getElementById('fs_ca').value||1,cl=+document.getElementById('fs_cl').value||1;
  const ebit=+document.getElementById('fs_ebit').value||0,int=+document.getElementById('fs_int').value||1;
  const cfo=+document.getElementById('fs_cfo').value||0,ds=+document.getElementById('fs_ds').value||1;
  const aut=e/a,cr=ca/cl,icr=ebit/int,dscr=cfo/ds,nwc=ca-cl;
====
function faStable(){
  const a=+document.getElementById('fs_a').value||0,e=+document.getElementById('fs_e').value||0,d=+document.getElementById('fs_d').value||0;
  const ca=+document.getElementById('fs_ca').value||0,cl=+document.getElementById('fs_cl').value||0;
  const ebit=+document.getElementById('fs_ebit').value||0,int=+document.getElementById('fs_int').value||0;
  const cfo=+document.getElementById('fs_cfo').value||0,ds=+document.getElementById('fs_ds').value||0;
  const aut=a===0?0:e/a;
  const cr=cl===0?0:ca/cl;
  const icr=int===0?0:ebit/int;
  const dscr=ds===0?0:cfo/ds;
  const nwc=ca-cl;
>>>>
```

---

## 4. Висновок

Проведене математичне тестування підтвердило наявність вразливостей в логіці обчислень `economic-tasks.html`. Найбільш критичними є:
1. **Зависання інтерфейсу** при введенні завеликих значень років у ітераційних циклах (для складних відсотків, амортизації та облігацій).
2. **Логічний баг примусової заміни 0 на 1**, що спотворює результати підприємств з нульовим оборотом чи відсутніми інвестиціями.
3. **Ділення на нуль** з утворенням `NaN` та `Infinity` в користувацькому інтерфейсі.

Запропоновані патчі повністю локалізують ці проблеми без втручання в інтерфейс сторінки та дизайн-систему КНУБА.
