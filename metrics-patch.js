// Regras comerciais: Vendas = 70% do montante informado; Coverage = 3x o montante de vendas.
const originalNormalizeStateMetricsPatch = normalizeState;
normalizeState = function(s){
  const out = originalNormalizeStateMetricsPatch(s);
  out.salesBaseAmount = Number(s?.salesBaseAmount ?? out.salesBaseAmount ?? 0);
  const sales = out.metrics.find(m=>m.id==='sales');
  const coverage = out.metrics.find(m=>m.id==='pipeline');
  if(sales){sales.label='Vendas';sales.target=70;sales.unit='%';sales.direction='gte';sales.description='da meta de vendas atingida';}
  if(coverage){coverage.label='Coverage do gap';coverage.target=3;coverage.unit='x';coverage.direction='gte';coverage.description='cobertura de pipeline sobre o valor da meta de vendas';}
  return out;
};

function salesBaseAmount(){ return Number(state.salesBaseAmount||0); }
function salesAccumulatedBRL(){ return cumulativeMetric('sales'); }
function coverageAccumulatedBRL(){ return cumulativeMetric('pipeline'); }
function salesPercent(){ const b=salesBaseAmount(); return b>0 ? salesAccumulatedBRL()/b*100 : null; }
function coverageMultiple(){ const b=salesBaseAmount(); return b>0 ? coverageAccumulatedBRL()/b : null; }
function coverageTargetBRL(){ return salesBaseAmount()*3; }

const originalGetActualMetricsPatch = getActual;
getActual = function(m){
  if(m.id==='sales') return salesPercent();
  if(m.id==='pipeline') return coverageMultiple();
  return originalGetActualMetricsPatch(m);
};

renderMetrics = function(){
  const el=$('#metricInputs');
  const others=state.metrics.filter(m=>!['sales','pipeline'].includes(m.id));
  el.innerHTML=`
    <div class="metric-box metric-special sales-special">
      <div class="name">01 Vendas</div>
      <div class="special-target"><span class="fixed-pill">Meta fixa: 70%</span></div>
      <label class="metric-label">Montante total da meta de vendas</label>
      <div class="money-input"><span>R$</span><input id="salesBaseAmount" type="number" min="0" step="1000" value="${salesBaseAmount()||''}" placeholder="Ex.: 5000000"></div>
      <div class="metric-help">Você lança o vendido em R$ semana a semana. O painel calcula automaticamente o percentual atingido.</div>
    </div>
    <div class="metric-box metric-special coverage-special">
      <div class="name">02 Coverage do gap</div>
      <div class="special-target"><span class="fixed-pill">Meta fixa: 3x</span></div>
      <label class="metric-label">Coverage necessário</label>
      <div class="computed-value">${fmt(coverageTargetBRL(),'R$')}</div>
      <div class="metric-help">Calculado automaticamente como 3x o montante da meta de vendas.</div>
    </div>
    ${others.map((m,i)=>`<div class="metric-box"><div class="name">${String(i+3).padStart(2,'0')} ${esc(m.label)}</div><div class="metric-row"><input data-metric-target="${m.id}" type="number" step="0.1" value="${m.target}"><input data-metric-unit="${m.id}" value="${esc(m.unit)}" maxlength="8"></div><div class="metric-help">${targetPrefix(m)} meta • ${esc(m.description)}</div></div>`).join('')}`;
};

renderWeeklyInputs = function(){
  const el=$('#weeklyMetricInputs');
  const salesPct=salesPercent(), covX=coverageMultiple();
  const regular=state.metrics.filter(m=>!['sales','pipeline','people'].includes(m.id));
  el.innerHTML=`
    <div class="metric-box metric-special"><div class="name">01 Vendas</div><div class="field"><input data-week-value="sales" type="number" step="1000" placeholder="Vendido na semana (R$)"><span class="metric-help">Acumulado ${fmt(salesAccumulatedBRL(),'R$')} • ${salesPct===null?'—':trim(salesPct)+'%'} / meta 70%</span></div></div>
    <div class="metric-box metric-special"><div class="name">02 Coverage do gap</div><div class="field"><input data-week-value="pipeline" type="number" step="1000" placeholder="Pipeline gerado na semana (R$)"><span class="metric-help">Acumulado ${fmt(coverageAccumulatedBRL(),'R$')} • ${covX===null?'—':trim(covX)+'x'} / meta 3x</span></div></div>
    ${regular.map((m,i)=>`<div class="metric-box"><div class="name">${String(i+3).padStart(2,'0')} ${esc(m.label)}</div><div class="field"><input data-week-value="${m.id}" type="number" step="0.1" placeholder="Realizado (${esc(m.unit)})"><span class="metric-help">Meta ${targetPrefix(m)} ${fmt(m.target,m.unit)}</span></div></div>`).join('')}`;
};

const originalRenderHomeMetricsPatch = renderHome;
renderHome = function(){ originalRenderHomeMetricsPatch(); };

$('#saveMetrics').onclick=async()=>{
  const base=$('#salesBaseAmount');
  if(base) state.salesBaseAmount=Number(base.value||0);
  state.metrics.forEach(m=>{
    if(['sales','pipeline'].includes(m.id)) return;
    const t=document.querySelector(`[data-metric-target="${m.id}"]`),u=document.querySelector(`[data-metric-unit="${m.id}"]`);
    if(t&&t.value!=='')m.target=Number(t.value);
    if(u)m.unit=u.value.trim()||m.unit;
  });
  await save();
};

const originalRenderChartMetricsPatch = renderChart;
renderChart = function(){
  if(typeof Chart==='undefined')return;
  const metric=state.metrics.find(m=>m.id===$('#chartMetric')?.value)||state.metrics[0];
  if(!['sales','pipeline'].includes(metric.id)) return originalRenderChartMetricsPatch();
  const mode=$('#chartMode')?.value||'actual';
  const labels=state.weekly.map(w=>w.name);
  let data,target,yLabel;
  if(metric.id==='sales'){
    data=state.weekly.map((_,i)=>{const b=salesBaseAmount();return b>0?cumulativeUntil(i,'sales')/b*100:null});
    target=state.weekly.map(()=>70);yLabel='%';
    if(mode==='attainment'){data=data.map(v=>v===null?null:v/70*100);target=state.weekly.map(()=>100);}
  }else{
    data=state.weekly.map((_,i)=>{const b=salesBaseAmount();return b>0?cumulativeUntil(i,'pipeline')/b:null});
    target=state.weekly.map(()=>3);yLabel='x';
    if(mode==='attainment'){data=data.map(v=>v===null?null:v/3*100);target=state.weekly.map(()=>100);yLabel='%';}
  }
  const ctx=$('#weeklyChart');if(!ctx)return;if(chart)chart.destroy();
  chart=new Chart(ctx,{type:'line',data:{labels,datasets:[{label:mode==='actual'?`${metric.label} realizado`:`${metric.label} — atingimento`,data,borderWidth:3,tension:.25,pointRadius:5,pointHoverRadius:7},{label:mode==='actual'?(metric.id==='sales'?'Meta 70%':'Meta 3x'):'Meta 100%',data:target,borderWidth:2,borderDash:[6,6],pointRadius:0}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true,title:{display:true,text:yLabel}},x:{grid:{display:false}}}}});
};
