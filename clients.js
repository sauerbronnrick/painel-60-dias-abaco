let editingClientIndex=null;

function resetClientForm(){
  editingClientIndex=null;
  $('#clientCompany').value='';
  $('#clientContact').value='';
  $('#clientGenerated').value='';
  $('#clientDate').value=new Date().toISOString().slice(0,10);
  $('#addClient').textContent='Adicionar touch CRO';
  const cancel=$('#cancelClientEdit');
  if(cancel) cancel.remove();
}

function startClientEdit(idx){
  const c=state.croClients[idx];
  if(!c) return;
  editingClientIndex=idx;
  $('#clientCompany').value=c.company||c.name||'';
  $('#clientContact').value=c.contact||'';
  $('#clientGenerated').value=c.generated||'';
  $('#clientDate').value=c.date||new Date().toISOString().slice(0,10);
  $('#addClient').textContent='Salvar alterações';
  if(!$('#cancelClientEdit')){
    const btn=document.createElement('button');
    btn.id='cancelClientEdit';
    btn.className='btn ghost';
    btn.textContent='Cancelar edição';
    btn.onclick=resetClientForm;
    $('#addClient').parentElement.appendChild(btn);
  }
  $('#clientCompany').focus();
}

function renderClients(){
  const rows=$('#clientRows');
  rows.innerHTML=state.croClients.length
    ? state.croClients.slice().reverse().map((c,ri)=>{
        const idx=state.croClients.length-1-ri;
        const company=c.company||c.name||'';
        const contact=c.contact||'';
        return `<tr><td><strong>${esc(company)}</strong></td><td>${esc(contact)||'—'}</td><td>${esc(c.generated)}</td><td>${formatDate(c.date)}</td><td><div style="display:flex;gap:7px;flex-wrap:wrap"><button class="btn ghost" data-edit-client="${idx}">Editar</button><button class="btn danger" data-del-client="${idx}">Excluir</button></div></td></tr>`;
      }).join('')
    : `<tr><td colspan="5" style="color:#73808d">Nenhum touch CRO registrado.</td></tr>`;

  $$('[data-edit-client]').forEach(b=>b.onclick=()=>startClientEdit(+b.dataset.editClient));
  $$('[data-del-client]').forEach(b=>b.onclick=async()=>{
    const idx=+b.dataset.delClient;
    if(!confirm('Excluir este touch CRO?')) return;
    state.croClients.splice(idx,1);
    if(editingClientIndex===idx) resetClientForm();
    else if(editingClientIndex!==null && idx<editingClientIndex) editingClientIndex--;
    await save();
  });
}

$('#addClient').onclick=async()=>{
  const company=$('#clientCompany').value.trim();
  const contact=$('#clientContact').value.trim();
  const generated=$('#clientGenerated').value.trim();
  const date=$('#clientDate').value;
  if(!company||!contact||!generated)return toast('Preencha empresa, contato e o que foi gerado');

  if(editingClientIndex!==null){
    const old=state.croClients[editingClientIndex]||{};
    state.croClients[editingClientIndex]={...old,company,contact,generated,date:date||new Date().toISOString().slice(0,10),updatedAt:new Date().toISOString()};
  }else{
    state.croClients.push({company,contact,generated,date:date||new Date().toISOString().slice(0,10),createdAt:new Date().toISOString()});
  }

  resetClientForm();
  await save();
};

renderClients();
