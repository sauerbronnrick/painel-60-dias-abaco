function renderClients(){
  const rows=$('#clientRows');
  rows.innerHTML=state.croClients.length
    ? state.croClients.slice().reverse().map((c,ri)=>{
        const idx=state.croClients.length-1-ri;
        const company=c.company||c.name||'';
        const contact=c.contact||'';
        return `<tr><td><strong>${esc(company)}</strong></td><td>${esc(contact)||'—'}</td><td>${esc(c.generated)}</td><td>${formatDate(c.date)}</td><td><button class="btn danger" data-del-client="${idx}">Excluir</button></td></tr>`;
      }).join('')
    : `<tr><td colspan="5" style="color:#73808d">Nenhum touch CRO registrado.</td></tr>`;
  $$('[data-del-client]').forEach(b=>b.onclick=async()=>{state.croClients.splice(+b.dataset.delClient,1);await save()});
}

$('#addClient').onclick=async()=>{
  const company=$('#clientCompany').value.trim();
  const contact=$('#clientContact').value.trim();
  const generated=$('#clientGenerated').value.trim();
  const date=$('#clientDate').value;
  if(!company||!contact||!generated)return toast('Preencha empresa, contato e o que foi gerado');
  state.croClients.push({company,contact,generated,date:date||new Date().toISOString().slice(0,10),createdAt:new Date().toISOString()});
  $('#clientCompany').value='';
  $('#clientContact').value='';
  $('#clientGenerated').value='';
  await save();
};

renderClients();
