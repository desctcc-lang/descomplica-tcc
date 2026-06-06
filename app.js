// ============================================================
// SISTEMA DESCOMPLICA TCC - LOGICA DA APLICACAO
// ============================================================

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Lista padrão de colaboradores (será expandida com base nos dados)
let COLABORADORES = ['THAYSE', 'ESTHER', 'RAY', 'JOABS', 'MICHELE', 'DAYANE', 'BINA', 'ELENICE', 'MARLUCIA'];

// Cache de dados
let cacheAgendamentos = [];
let cacheDespesas = [];
let cacheHistorico = [];

const MESES = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];

// ============================================================
// AUTENTICACAO
// ============================================================

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');
  const errBox = document.getElementById('loginError');
  
  btn.disabled = true;
  btn.innerHTML = '<div class="loading"></div> Entrando...';
  errBox.style.display = 'none';
  
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  
  btn.disabled = false;
  btn.textContent = 'Entrar';
  
  if (error) {
    errBox.textContent = 'E-mail ou senha incorretos. Verifique e tente de novo.';
    errBox.style.display = 'block';
    return;
  }
  
  iniciarApp(data.user);
});

async function logout() {
  if (!confirm('Deseja realmente sair do sistema?')) return;
  await supabase.auth.signOut();
  document.getElementById('app').classList.remove('active');
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginPassword').value = '';
}

// Verificar se já está logado ao abrir a página
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    iniciarApp(session.user);
  }
})();

function iniciarApp(user) {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').classList.add('active');
  document.getElementById('userEmail').textContent = user.email;
  
  // Setar data atual na folha
  document.getElementById('folhaDataPagamento').valueAsDate = new Date();
  
  // Preparar selects de mês
  preencherSelectsMes();
  
  // Carregar dados
  carregarTudo();
}

// ============================================================
// NAVEGACAO ENTRE PAGINAS
// ============================================================

document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const page = tab.dataset.page;
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('page-' + page).classList.add('active');
    
    // Carregar dados específicos da página
    if (page === 'folha') carregarFolha();
    if (page === 'dashboard') atualizarDashboard();
    if (page === 'agendamentos') renderizarAgendamentos();
    if (page === 'despesas') renderizarDespesas();
    if (page === 'historico') carregarHistorico();
    if (page === 'colaboradores') renderizarPaginaColaboradores();
  });
});

// ============================================================
// CARREGAMENTO DE DADOS
// ============================================================

async function carregarTudo() {
  mostrarLoading(true);
  await Promise.all([
    carregarAgendamentos(),
    carregarDespesas(),
    carregarHistorico()
  ]);
  
  detectarColaboradores();
  preencherSelectsColaborador();
  preencherSelectsMes();
  atualizarDashboard();
  mostrarLoading(false);
}

async function carregarAgendamentos() {
  const { data, error } = await supabase
    .from('agendamentos')
    .select('*')
    .order('data', { ascending: false })
    .limit(5000);
  
  if (error) {
    toast('Erro ao carregar agendamentos: ' + error.message, 'error');
    return;
  }
  cacheAgendamentos = data || [];
  renderizarAgendamentos();
}

async function carregarDespesas() {
  const { data, error } = await supabase
    .from('despesas')
    .select('*')
    .order('data', { ascending: false });
  
  if (error) {
    toast('Erro ao carregar despesas: ' + error.message, 'error');
    return;
  }
  cacheDespesas = data || [];
}

async function carregarHistorico() {
  const { data, error } = await supabase
    .from('folha_pagamento')
    .select('*')
    .order('data_pagamento', { ascending: false })
    .limit(500);
  
  if (error) return;
  cacheHistorico = data || [];
  renderizarHistorico();
}

function detectarColaboradores() {
  const set = new Set(COLABORADORES);
  cacheAgendamentos.forEach(a => {
    if (a.gestor) set.add(a.gestor);
    if (a.produtor) set.add(a.produtor);
    if (a.atendente) set.add(a.atendente);
  });
  COLABORADORES = Array.from(set).filter(c => c && c !== 'NOVO' && c !== 'DESC').sort();
}

function preencherSelectsColaborador() {
  document.querySelectorAll('.colaborador-select').forEach(sel => {
    const valorAtual = sel.value;
    sel.innerHTML = '<option value="">Selecione...</option>' + 
      COLABORADORES.map(c => `<option value="${c}">${c}</option>`).join('');
    sel.value = valorAtual;
  });
  
  const filtroColab = document.getElementById('filtroColaborador');
  filtroColab.innerHTML = '<option value="">Todos</option>' + 
    COLABORADORES.map(c => `<option value="${c}">${c}</option>`).join('');
  
  const folhaFiltro = document.getElementById('folhaFiltroColaborador');
  folhaFiltro.innerHTML = '<option value="">Todos</option>' + 
    COLABORADORES.map(c => `<option value="${c}">${c}</option>`).join('');
  
  const colabSel = document.getElementById('colabSelector');
  colabSel.innerHTML = '<option value="">Selecione um colaborador...</option>' + 
    COLABORADORES.map(c => `<option value="${c}">${c}</option>`).join('');
}

function preencherSelectsMes() {
  const opcoes = '<option value="">Todos os meses</option>' + 
    MESES.map(m => `<option value="${m}">${m}</option>`).join('');
  
  ['filtroMes', 'dashFiltroMes', 'despFiltroMes'].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) {
      const valorAtual = sel.value;
      sel.innerHTML = opcoes;
      sel.value = valorAtual;
    }
  });
}

// ============================================================
// FILTROS E EVENTOS
// ============================================================

['filtroCliente', 'filtroMes', 'filtroColaborador', 'filtroStatus'].forEach(id => {
  document.getElementById(id).addEventListener('input', renderizarAgendamentos);
  document.getElementById(id).addEventListener('change', renderizarAgendamentos);
});

document.getElementById('dashFiltroMes').addEventListener('change', atualizarDashboard);
document.getElementById('folhaFiltroColaborador').addEventListener('change', () => renderizarFolha());
['despFiltroMes', 'despFiltroCategoria'].forEach(id => {
  document.getElementById(id).addEventListener('change', renderizarDespesas);
});

// ============================================================
// AGENDAMENTOS - LISTAGEM
// ============================================================

function renderizarAgendamentos() {
  const filtroCliente = document.getElementById('filtroCliente').value.toLowerCase();
  const filtroMes = document.getElementById('filtroMes').value;
  const filtroColab = document.getElementById('filtroColaborador').value;
  const filtroStatus = document.getElementById('filtroStatus').value;
  
  let dados = cacheAgendamentos.filter(a => {
    if (filtroCliente && !(a.cliente || '').toLowerCase().includes(filtroCliente)) return false;
    if (filtroMes && a.mes !== filtroMes) return false;
    if (filtroColab && a.gestor !== filtroColab && a.produtor !== filtroColab && a.atendente !== filtroColab) return false;
    if (filtroStatus === 'pago' && !a.cliente_pagou) return false;
    if (filtroStatus === 'pendente' && a.cliente_pagou) return false;
    return true;
  });
  
  const tbody = document.getElementById('agendamentosBody');
  
  if (dados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted" style="padding:40px">Nenhum agendamento encontrado</td></tr>';
    document.getElementById('ageQtd').textContent = '0';
    document.getElementById('ageTotal').textContent = formatarMoeda(0);
    return;
  }
  
  // Limitar exibição para performance
  const limite = 500;
  const dadosExibir = dados.slice(0, limite);
  
  tbody.innerHTML = dadosExibir.map(a => {
    const statusCliente = a.cliente_pagou
      ? '<span class="badge badge-success">✓ PAGO</span>'
      : '<span class="badge badge-warning">⏳ PENDENTE</span>';
    
    let statusComissoes = '';
    if (a.cliente_pagou) {
      const g = a.pago_gestor ? '<span class="status-dot pago">G ✓</span>' : '<span class="status-dot pendente">G</span>';
      const p = a.pago_produtor ? '<span class="status-dot pago">P ✓</span>' : '<span class="status-dot pendente">P</span>';
      const at = a.pago_atendente ? '<span class="status-dot pago">A ✓</span>' : '<span class="status-dot pendente">A</span>';
      statusComissoes = `<div class="status-pagamento">${g}${p}${at}</div>`;
    } else {
      statusComissoes = '<span class="text-muted" style="font-size:11px">Aguardando cliente</span>';
    }
    
    return `
      <tr class="${a.cliente_pagou ? 'cliente-pagou' : ''}">
        <td>${formatarData(a.data)}</td>
        <td><strong>${escapeHtml(a.cliente)}</strong></td>
        <td>${escapeHtml(a.tipo || '')}</td>
        <td class="text-right text-bold">${formatarMoeda(a.valor)}</td>
        <td>${escapeHtml(a.gestor || '')}</td>
        <td>${escapeHtml(a.produtor || '')}</td>
        <td>${escapeHtml(a.atendente || '')}</td>
        <td>${statusCliente}</td>
        <td>${statusComissoes}</td>
        <td><button class="btn btn-outline btn-sm" onclick="abrirEditarAgendamento(${a.id})">Abrir</button></td>
      </tr>
    `;
  }).join('');
  
  document.getElementById('ageQtd').textContent = dados.length + (dados.length > limite ? ` (exibindo ${limite})` : '');
  document.getElementById('ageTotal').textContent = formatarMoeda(dados.reduce((s, a) => s + (a.valor || 0), 0));
}

// ============================================================
// AGENDAMENTOS - MODAL DE EDICAO
// ============================================================

function abrirNovoAgendamento() {
  document.getElementById('modalAgendamentoTitulo').textContent = 'Novo Agendamento';
  document.getElementById('ageId').value = '';
  document.getElementById('ageData').valueAsDate = new Date();
  
  const mesAtual = MESES[new Date().getMonth()];
  document.getElementById('ageMes').value = mesAtual;
  
  ['ageCliente','ageTipo','ageTelefone','agePaginas','ageValor','ageObservacoes',
   'ageComissaoGestor','ageComissaoProdutor','ageComissaoAtendente'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('ageDesconto').value = '';
  document.getElementById('ageGestor').value = '';
  document.getElementById('ageProdutor').value = '';
  document.getElementById('ageAtendente').value = '';
  
  document.getElementById('ageStatusCliente').style.display = 'none';
  document.getElementById('btnExcluirAgendamento').style.display = 'none';
  document.getElementById('ageDataPagamentoCliente').value = new Date().toISOString().split('T')[0];

  document.getElementById('modalAgendamento').classList.add('active');
}

function abrirEditarAgendamento(id) {
  const a = cacheAgendamentos.find(x => x.id === id);
  if (!a) return;
  
  document.getElementById('modalAgendamentoTitulo').textContent = 'Editar Agendamento #' + id;
  document.getElementById('ageId').value = a.id;
  document.getElementById('ageData').value = a.data;
  document.getElementById('ageMes').value = a.mes || '';
  document.getElementById('ageCliente').value = a.cliente || '';
  document.getElementById('ageTipo').value = a.tipo || '';
  document.getElementById('ageTelefone').value = a.telefone || '';
  document.getElementById('agePaginas').value = a.paginas || '';
  document.getElementById('ageValor').value = a.valor || 0;
  document.getElementById('ageDesconto').value = a.desconto || '';
  document.getElementById('ageGestor').value = a.gestor || '';
  document.getElementById('ageProdutor').value = a.produtor || '';
  document.getElementById('ageAtendente').value = a.atendente || '';
  document.getElementById('ageComissaoGestor').value = a.comissao_gestor || 0;
  document.getElementById('ageComissaoProdutor').value = a.comissao_produtor || 0;
  document.getElementById('ageComissaoAtendente').value = a.comissao_atendente || 0;
  document.getElementById('ageObservacoes').value = a.observacoes || '';
  
  document.getElementById('ageStatusCliente').style.display = 'block';
  document.getElementById('btnExcluirAgendamento').style.display = 'inline-flex';
  document.getElementById('ageDataPagamentoCliente').value = a.data_pagamento_cliente || new Date().toISOString().split('T')[0];

  atualizarStatusClienteUI(a);
  
  document.getElementById('modalAgendamento').classList.add('active');
}

function atualizarStatusClienteUI(a) {
  const status = document.getElementById('ageStatusClientePagou');
  const btnMarcar = document.getElementById('btnMarcarClientePagou');
  const btnDesmarcar = document.getElementById('btnDesmarcarClientePagou');
  const statusComissoes = document.getElementById('ageStatusComissoes');
  
  if (a.cliente_pagou) {
    status.innerHTML = `<span class="badge badge-success">✓ PAGO em ${formatarData(a.data_pagamento_cliente)}</span>`;
    btnMarcar.style.display = 'none';
    btnDesmarcar.style.display = 'inline-flex';
    statusComissoes.style.display = 'block';
    renderizarBaixaIndividual(a);
  } else {
    status.innerHTML = '<span class="badge badge-warning">⏳ AGUARDANDO PAGAMENTO</span>';
    btnMarcar.style.display = 'inline-flex';
    btnDesmarcar.style.display = 'none';
    statusComissoes.style.display = 'none';
  }
}

function renderizarBaixaIndividual(a) {
  const cont = document.getElementById('ageBaixaIndividual');
  const linhas = [];
  
  if (a.gestor && a.comissao_gestor > 0) {
    linhas.push(`
      <div class="card" style="background:var(--gray-50); margin-bottom:8px">
        <div class="flex-between">
          <div>
            <strong>${a.gestor}</strong> <span class="badge badge-info">GESTOR</span>
            <div class="text-muted" style="font-size:12px">Comissão: ${formatarMoeda(a.comissao_gestor)}</div>
          </div>
          <div>
            ${a.pago_gestor 
              ? `<span class="badge badge-success">✓ PAGO em ${formatarData(a.data_pagamento_gestor)}</span>
                 <button class="btn btn-outline btn-sm" onclick="reverterBaixa('gestor')">Reverter</button>`
              : `<button class="btn btn-success btn-sm" onclick="baixarComissao('gestor')">Pagar ${formatarMoeda(a.comissao_gestor)}</button>`}
          </div>
        </div>
      </div>
    `);
  }
  
  if (a.produtor && a.comissao_produtor > 0) {
    linhas.push(`
      <div class="card" style="background:var(--gray-50); margin-bottom:8px">
        <div class="flex-between">
          <div>
            <strong>${a.produtor}</strong> <span class="badge badge-info">PRODUTOR</span>
            <div class="text-muted" style="font-size:12px">Comissão: ${formatarMoeda(a.comissao_produtor)}</div>
          </div>
          <div>
            ${a.pago_produtor 
              ? `<span class="badge badge-success">✓ PAGO em ${formatarData(a.data_pagamento_produtor)}</span>
                 <button class="btn btn-outline btn-sm" onclick="reverterBaixa('produtor')">Reverter</button>`
              : `<button class="btn btn-success btn-sm" onclick="baixarComissao('produtor')">Pagar ${formatarMoeda(a.comissao_produtor)}</button>`}
          </div>
        </div>
      </div>
    `);
  }
  
  if (a.atendente && a.comissao_atendente > 0) {
    linhas.push(`
      <div class="card" style="background:var(--gray-50); margin-bottom:8px">
        <div class="flex-between">
          <div>
            <strong>${a.atendente}</strong> <span class="badge badge-info">ATENDENTE</span>
            <div class="text-muted" style="font-size:12px">Comissão: ${formatarMoeda(a.comissao_atendente)}</div>
          </div>
          <div>
            ${a.pago_atendente 
              ? `<span class="badge badge-success">✓ PAGO em ${formatarData(a.data_pagamento_atendente)}</span>
                 <button class="btn btn-outline btn-sm" onclick="reverterBaixa('atendente')">Reverter</button>`
              : `<button class="btn btn-success btn-sm" onclick="baixarComissao('atendente')">Pagar ${formatarMoeda(a.comissao_atendente)}</button>`}
          </div>
        </div>
      </div>
    `);
  }
  
  cont.innerHTML = linhas.join('') || '<p class="text-muted">Sem comissões cadastradas</p>';
}

function calcularComissoes() {
  const valor = parseFloat(document.getElementById('ageValor').value) || 0;
  document.getElementById('ageComissaoGestor').value = (valor * 0.20).toFixed(2);
  document.getElementById('ageComissaoProdutor').value = (valor * 0.15).toFixed(2);
  document.getElementById('ageComissaoAtendente').value = (valor * 0.05).toFixed(2);
}

function atualizarMesDoAgendamento() {
  const dataVal = document.getElementById('ageData').value;
  if (!dataVal) return;
  const mes = MESES[new Date(dataVal + 'T00:00:00').getMonth()];
  if (mes) document.getElementById('ageMes').value = mes;
}

async function salvarAgendamento() {
  const id = document.getElementById('ageId').value;
  const dados = {
    data: document.getElementById('ageData').value,
    mes: document.getElementById('ageMes').value,
    cliente: document.getElementById('ageCliente').value.trim(),
    tipo: document.getElementById('ageTipo').value.trim(),
    telefone: document.getElementById('ageTelefone').value.trim(),
    paginas: document.getElementById('agePaginas').value.trim(),
    valor: parseFloat(document.getElementById('ageValor').value) || 0,
    desconto: document.getElementById('ageDesconto').value,
    gestor: document.getElementById('ageGestor').value,
    produtor: document.getElementById('ageProdutor').value,
    atendente: document.getElementById('ageAtendente').value,
    comissao_gestor: parseFloat(document.getElementById('ageComissaoGestor').value) || 0,
    comissao_produtor: parseFloat(document.getElementById('ageComissaoProdutor').value) || 0,
    comissao_atendente: parseFloat(document.getElementById('ageComissaoAtendente').value) || 0,
    observacoes: document.getElementById('ageObservacoes').value.trim(),
  };
  
  if (!dados.cliente || !dados.data) {
    toast('Preencha cliente e data', 'warning');
    return;
  }
  
  mostrarLoading(true);
  
  let result;
  if (id) {
    result = await supabase.from('agendamentos').update(dados).eq('id', id).select();
  } else {
    result = await supabase.from('agendamentos').insert([dados]).select();
  }
  
  mostrarLoading(false);
  
  if (result.error) {
    toast('Erro ao salvar: ' + result.error.message, 'error');
    return;
  }
  
  toast(id ? 'Agendamento atualizado!' : 'Agendamento criado!', 'success');
  fecharModal('modalAgendamento');
  await carregarAgendamentos();
  atualizarDashboard();
}

async function excluirAgendamento() {
  const id = document.getElementById('ageId').value;
  if (!id) return;
  
  if (!confirm('Tem certeza que quer excluir este agendamento? Esta ação não pode ser desfeita.')) return;
  
  mostrarLoading(true);
  const { error } = await supabase.from('agendamentos').delete().eq('id', id);
  mostrarLoading(false);
  
  if (error) {
    toast('Erro ao excluir: ' + error.message, 'error');
    return;
  }
  
  toast('Agendamento excluído', 'success');
  fecharModal('modalAgendamento');
  await carregarAgendamentos();
  atualizarDashboard();
}

async function marcarClientePagou() {
  const id = document.getElementById('ageId').value;
  if (!id) return;
  
  const dataPag = document.getElementById('ageDataPagamentoCliente').value || new Date().toISOString().split('T')[0];

  mostrarLoading(true);
  const { data, error } = await supabase
    .from('agendamentos')
    .update({ cliente_pagou: true, data_pagamento_cliente: dataPag })
    .eq('id', id)
    .select()
    .single();
  mostrarLoading(false);
  
  if (error) {
    toast('Erro: ' + error.message, 'error');
    return;
  }
  
  toast('Cliente marcado como pago!', 'success');
  
  // Atualiza cache
  const idx = cacheAgendamentos.findIndex(x => x.id === parseInt(id));
  if (idx >= 0) cacheAgendamentos[idx] = data;
  
  atualizarStatusClienteUI(data);
  renderizarAgendamentos();
  atualizarDashboard();
}

async function desmarcarClientePagou() {
  const id = document.getElementById('ageId').value;
  if (!id) return;
  
  if (!confirm('Desmarcar o pagamento do cliente? Isso só funciona se nenhuma comissão tiver sido paga ainda.')) return;
  
  const a = cacheAgendamentos.find(x => x.id === parseInt(id));
  if (a.pago_gestor || a.pago_produtor || a.pago_atendente) {
    toast('Não é possível desmarcar. Já existem comissões pagas para este trabalho. Reverta as comissões primeiro.', 'error');
    return;
  }
  
  mostrarLoading(true);
  const { data, error } = await supabase
    .from('agendamentos')
    .update({ cliente_pagou: false, data_pagamento_cliente: null })
    .eq('id', id)
    .select()
    .single();
  mostrarLoading(false);
  
  if (error) {
    toast('Erro: ' + error.message, 'error');
    return;
  }
  
  toast('Pagamento do cliente desmarcado', 'success');
  const idx = cacheAgendamentos.findIndex(x => x.id === parseInt(id));
  if (idx >= 0) cacheAgendamentos[idx] = data;
  atualizarStatusClienteUI(data);
  renderizarAgendamentos();
  atualizarDashboard();
}

async function baixarComissao(tipo) {
  const id = document.getElementById('ageId').value;
  if (!id) return;
  
  const dataPag = document.getElementById('folhaDataPagamento').value || new Date().toISOString().split('T')[0];
  const update = {};
  update[`pago_${tipo}`] = true;
  update[`data_pagamento_${tipo}`] = dataPag;
  
  mostrarLoading(true);
  const { data, error } = await supabase
    .from('agendamentos')
    .update(update)
    .eq('id', id)
    .select()
    .single();
  mostrarLoading(false);
  
  if (error) {
    toast('Erro: ' + error.message, 'error');
    return;
  }
  
  toast(`Comissão de ${tipo} baixada!`, 'success');
  const idx = cacheAgendamentos.findIndex(x => x.id === parseInt(id));
  if (idx >= 0) cacheAgendamentos[idx] = data;
  atualizarStatusClienteUI(data);
  renderizarAgendamentos();
  atualizarDashboard();
}

async function reverterBaixa(tipo) {
  const id = document.getElementById('ageId').value;
  if (!id) return;
  
  if (!confirm(`Reverter a baixa da comissão de ${tipo}?`)) return;
  
  const update = {};
  update[`pago_${tipo}`] = false;
  update[`data_pagamento_${tipo}`] = null;
  
  mostrarLoading(true);
  const { data, error } = await supabase
    .from('agendamentos')
    .update(update)
    .eq('id', id)
    .select()
    .single();
  mostrarLoading(false);
  
  if (error) {
    toast('Erro: ' + error.message, 'error');
    return;
  }
  
  toast('Baixa revertida', 'success');
  const idx = cacheAgendamentos.findIndex(x => x.id === parseInt(id));
  if (idx >= 0) cacheAgendamentos[idx] = data;
  atualizarStatusClienteUI(data);
  renderizarAgendamentos();
  atualizarDashboard();
}

// ============================================================
// FOLHA DE PAGAMENTO SEMANAL
// ============================================================

let folhaSelecionados = new Set();

function carregarFolha() {
  folhaSelecionados = new Set();
  renderizarFolha();
}

function renderizarFolha() {
  const filtroColab = document.getElementById('folhaFiltroColaborador').value;
  
  // Calcular comissoes pendentes a partir do cache
  const pendentes = [];
  cacheAgendamentos.forEach(a => {
    if (!a.cliente_pagou) return;
    
    if (a.gestor && a.gestor !== 'NOVO' && a.gestor !== 'DESC' && a.comissao_gestor > 0 && !a.pago_gestor) {
      pendentes.push({
        chave: `${a.id}-gestor`,
        agendamento_id: a.id,
        data: a.data,
        cliente: a.cliente,
        tipo: a.tipo,
        colaborador: a.gestor,
        funcao: 'GESTOR',
        valor_comissao: a.comissao_gestor,
        valor_trabalho: a.valor,
        data_pagamento_cliente: a.data_pagamento_cliente,
      });
    }
    if (a.produtor && a.produtor !== 'NOVO' && a.produtor !== 'DESC' && a.comissao_produtor > 0 && !a.pago_produtor) {
      pendentes.push({
        chave: `${a.id}-produtor`,
        agendamento_id: a.id,
        data: a.data,
        cliente: a.cliente,
        tipo: a.tipo,
        colaborador: a.produtor,
        funcao: 'PRODUTOR',
        valor_comissao: a.comissao_produtor,
        valor_trabalho: a.valor,
        data_pagamento_cliente: a.data_pagamento_cliente,
      });
    }
    if (a.atendente && a.atendente !== 'NOVO' && a.atendente !== 'DESC' && a.comissao_atendente > 0 && !a.pago_atendente) {
      pendentes.push({
        chave: `${a.id}-atendente`,
        agendamento_id: a.id,
        data: a.data,
        cliente: a.cliente,
        tipo: a.tipo,
        colaborador: a.atendente,
        funcao: 'ATENDENTE',
        valor_comissao: a.comissao_atendente,
        valor_trabalho: a.valor,
        data_pagamento_cliente: a.data_pagamento_cliente,
      });
    }
  });
  
  // Filtrar por colaborador
  let filtrados = pendentes;
  if (filtroColab) filtrados = pendentes.filter(p => p.colaborador === filtroColab);
  
  // Agrupar por colaborador
  const grupos = {};
  filtrados.forEach(p => {
    if (!grupos[p.colaborador]) grupos[p.colaborador] = [];
    grupos[p.colaborador].push(p);
  });
  
  // Calcular totais
  const totalAPagar = filtrados.reduce((s, p) => s + p.valor_comissao, 0);
  const qtdColabs = Object.keys(grupos).length;
  
  document.getElementById('folhaTotalAPagar').textContent = formatarMoeda(totalAPagar);
  document.getElementById('folhaQtdColabs').textContent = qtdColabs;
  
  // Renderizar
  const cont = document.getElementById('folhaContent');
  
  if (qtdColabs === 0) {
    cont.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎉</div>
        <h3>Nenhuma comissão pendente!</h3>
        <p>Todas as comissões dos trabalhos pagos já foram baixadas.</p>
      </div>
    `;
    document.getElementById('folhaSelecionado').textContent = formatarMoeda(0);
    return;
  }
  
  // Ordenar colaboradores por nome
  const nomes = Object.keys(grupos).sort();
  
  cont.innerHTML = nomes.map(nome => {
    const comissoes = grupos[nome].sort((a, b) => new Date(a.data) - new Date(b.data));
    const total = comissoes.reduce((s, c) => s + c.valor_comissao, 0);
    const safeId = nome.replace(/[^a-zA-Z0-9]/g, '_');
    
    return `
      <div class="folha-colaborador">
        <div class="folha-colaborador-header" onclick="toggleColab('${safeId}')">
          <div>
            <div class="folha-colaborador-nome">👤 ${escapeHtml(nome)}</div>
            <div class="text-muted" style="font-size:12px">${comissoes.length} comissão(ões) pendente(s)</div>
          </div>
          <div class="flex gap-12" style="align-items:center">
            <div class="folha-colaborador-total">${formatarMoeda(total)}</div>
            <span id="caret-${safeId}">▼</span>
          </div>
        </div>
        <div class="folha-colaborador-body expanded" id="body-${safeId}">
          <div class="table-wrapper" style="border:none; border-radius:0; box-shadow:none">
            <table>
              <thead>
                <tr>
                  <th class="checkbox-cell">
                    <input type="checkbox" onchange="selecionarTodosColab('${safeId}', this.checked)">
                  </th>
                  <th>Data Trabalho</th>
                  <th>Cliente</th>
                  <th>Função</th>
                  <th>Cliente Pagou</th>
                  <th class="text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                ${comissoes.map(c => `
                  <tr>
                    <td class="checkbox-cell">
                      <input type="checkbox" class="check-${safeId}" 
                        data-chave="${c.chave}"
                        data-valor="${c.valor_comissao}"
                        data-ageid="${c.agendamento_id}"
                        data-tipo="${c.funcao.toLowerCase()}"
                        data-colab="${escapeHtml(c.colaborador)}"
                        onchange="onCheckChange()">
                    </td>
                    <td>${formatarData(c.data)}</td>
                    <td><strong>${escapeHtml(c.cliente)}</strong><div class="text-muted" style="font-size:11px">${escapeHtml(c.tipo || '')}</div></td>
                    <td><span class="badge badge-info">${c.funcao}</span></td>
                    <td>${formatarData(c.data_pagamento_cliente)}</td>
                    <td class="text-right text-bold text-success">${formatarMoeda(c.valor_comissao)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="background:var(--gray-50); font-weight:700">
                  <td colspan="5" class="text-right">Total ${escapeHtml(nome)}:</td>
                  <td class="text-right text-success">${formatarMoeda(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div class="folha-colaborador-actions">
            <button class="btn btn-success" onclick="pagarTudoColab('${escapeHtml(nome).replace(/'/g, "\\'")}', '${safeId}')">
              ✓ Pagar TUDO de ${escapeHtml(nome)} (${formatarMoeda(total)})
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  onCheckChange();
}

function toggleColab(safeId) {
  const body = document.getElementById('body-' + safeId);
  const caret = document.getElementById('caret-' + safeId);
  if (body.classList.contains('expanded')) {
    body.classList.remove('expanded');
    caret.textContent = '▶';
  } else {
    body.classList.add('expanded');
    caret.textContent = '▼';
  }
}

function selecionarTodosColab(safeId, checked) {
  document.querySelectorAll('.check-' + safeId).forEach(c => {
    c.checked = checked;
  });
  onCheckChange();
}

function onCheckChange() {
  let total = 0;
  document.querySelectorAll('[class*="check-"]:checked').forEach(c => {
    total += parseFloat(c.dataset.valor) || 0;
  });
  document.getElementById('folhaSelecionado').textContent = formatarMoeda(total);
}

async function pagarSelecionados() {
  const checks = Array.from(document.querySelectorAll('[class*="check-"]:checked'));
  if (checks.length === 0) {
    toast('Nenhuma comissão selecionada', 'warning');
    return;
  }
  
  const dataPag = document.getElementById('folhaDataPagamento').value;
  if (!dataPag) {
    toast('Informe a data do pagamento', 'warning');
    return;
  }
  
  // Agrupar por colaborador para criar registros no histórico
  const porColab = {};
  const updates = []; // {ageId, tipo}
  
  checks.forEach(c => {
    const colab = c.dataset.colab;
    const ageId = parseInt(c.dataset.ageid);
    const tipo = c.dataset.tipo;
    const valor = parseFloat(c.dataset.valor);
    
    if (!porColab[colab]) porColab[colab] = { total: 0, qtd: 0, ageIds: [] };
    porColab[colab].total += valor;
    porColab[colab].qtd++;
    porColab[colab].ageIds.push(ageId);
    
    updates.push({ ageId, tipo, valor, colab });
  });
  
  const total = Object.values(porColab).reduce((s, c) => s + c.total, 0);
  
  if (!confirm(`Confirmar pagamento de ${formatarMoeda(total)} para ${Object.keys(porColab).length} colaborador(es) na data de ${formatarData(dataPag)}?\n\n${checks.length} comissão(ões) serão marcadas como pagas.`)) return;
  
  mostrarLoading(true);
  
  try {
    // Atualizar cada agendamento
    for (const u of updates) {
      const update = {};
      update[`pago_${u.tipo}`] = true;
      update[`data_pagamento_${u.tipo}`] = dataPag;
      const { error } = await supabase.from('agendamentos').update(update).eq('id', u.ageId);
      if (error) throw error;
    }
    
    // Criar registros no histórico por colaborador
    const registros = Object.entries(porColab).map(([colab, info]) => ({
      data_pagamento: dataPag,
      colaborador: colab,
      total_pago: info.total,
      qtd_trabalhos: info.qtd,
      agendamento_ids: info.ageIds,
      observacoes: 'Pagamento via folha semanal',
    }));
    
    const { error: errHist } = await supabase.from('folha_pagamento').insert(registros);
    if (errHist) console.warn('Aviso ao salvar histórico:', errHist);
    
    toast(`Pagamento de ${formatarMoeda(total)} registrado!`, 'success');
    
    await carregarAgendamentos();
    await carregarHistorico();
    folhaSelecionados.clear();
    renderizarFolha();
    atualizarDashboard();
  } catch (error) {
    toast('Erro: ' + error.message, 'error');
  } finally {
    mostrarLoading(false);
  }
}

async function pagarTudoColab(nome, safeId) {
  const checks = Array.from(document.querySelectorAll('.check-' + safeId));
  checks.forEach(c => c.checked = true);
  onCheckChange();
  
  const dataPag = document.getElementById('folhaDataPagamento').value;
  if (!dataPag) {
    toast('Informe a data do pagamento', 'warning');
    return;
  }
  
  const total = checks.reduce((s, c) => s + parseFloat(c.dataset.valor), 0);
  const ageIds = checks.map(c => parseInt(c.dataset.ageid));
  
  if (!confirm(`Pagar TUDO de ${nome}?\n\nValor total: ${formatarMoeda(total)}\nQuantidade: ${checks.length} comissão(ões)\nData: ${formatarData(dataPag)}`)) return;
  
  mostrarLoading(true);
  
  try {
    for (const c of checks) {
      const update = {};
      update[`pago_${c.dataset.tipo}`] = true;
      update[`data_pagamento_${c.dataset.tipo}`] = dataPag;
      const { error } = await supabase.from('agendamentos').update(update).eq('id', parseInt(c.dataset.ageid));
      if (error) throw error;
    }
    
    await supabase.from('folha_pagamento').insert([{
      data_pagamento: dataPag,
      colaborador: nome,
      total_pago: total,
      qtd_trabalhos: checks.length,
      agendamento_ids: ageIds,
      observacoes: 'Pagamento total via folha semanal',
    }]);
    
    toast(`${nome} pago: ${formatarMoeda(total)}`, 'success');
    
    await carregarAgendamentos();
    await carregarHistorico();
    renderizarFolha();
    atualizarDashboard();
  } catch (error) {
    toast('Erro: ' + error.message, 'error');
  } finally {
    mostrarLoading(false);
  }
}

// ============================================================
// DASHBOARD
// ============================================================

function atualizarDashboard() {
  const mesFiltro = document.getElementById('dashFiltroMes').value;
  
  let dados = cacheAgendamentos;
  if (mesFiltro) dados = dados.filter(a => a.mes === mesFiltro);
  
  const totalFaturado = dados.reduce((s, a) => s + (a.valor || 0), 0);
  const recebido = dados.filter(a => a.cliente_pagou).reduce((s, a) => s + (a.valor || 0), 0);
  const aReceber = totalFaturado - recebido;
  
  // Comissões a pagar (cliente já pagou, comissão pendente)
  let comissoesAPagar = 0;
  let comissoesPagas = 0;
  dados.forEach(a => {
    if (a.cliente_pagou) {
      if (a.gestor && a.gestor !== 'NOVO' && a.gestor !== 'DESC' && a.comissao_gestor > 0) {
        if (a.pago_gestor) comissoesPagas += a.comissao_gestor;
        else comissoesAPagar += a.comissao_gestor;
      }
      if (a.produtor && a.produtor !== 'NOVO' && a.produtor !== 'DESC' && a.comissao_produtor > 0) {
        if (a.pago_produtor) comissoesPagas += a.comissao_produtor;
        else comissoesAPagar += a.comissao_produtor;
      }
      if (a.atendente && a.atendente !== 'NOVO' && a.atendente !== 'DESC' && a.comissao_atendente > 0) {
        if (a.pago_atendente) comissoesPagas += a.comissao_atendente;
        else comissoesAPagar += a.comissao_atendente;
      }
    }
  });
  
  // Despesas do periodo
  let despesasDados = cacheDespesas;
  if (mesFiltro) despesasDados = despesasDados.filter(d => d.mes === mesFiltro);
  const totalDespesas = despesasDados.reduce((s, d) => s + (d.valor || 0), 0);
  
  const lucroBruto = recebido - totalDespesas - comissoesPagas;
  
  document.getElementById('statFaturado').textContent = formatarMoeda(totalFaturado);
  document.getElementById('statRecebido').textContent = formatarMoeda(recebido);
  document.getElementById('statAReceber').textContent = formatarMoeda(aReceber);
  document.getElementById('statComissoesAPagar').textContent = formatarMoeda(comissoesAPagar);
  document.getElementById('statTrabalhos').textContent = dados.length;
  document.getElementById('statDespesas').textContent = formatarMoeda(totalDespesas);
  document.getElementById('statComissoesPagas').textContent = formatarMoeda(comissoesPagas);
  document.getElementById('statLucro').textContent = formatarMoeda(lucroBruto);
  
  // Tabela de colaboradores
  const porColab = {};
  dados.forEach(a => {
    if (a.cliente_pagou) {
      [['gestor', a.gestor, a.comissao_gestor, a.pago_gestor],
       ['produtor', a.produtor, a.comissao_produtor, a.pago_produtor],
       ['atendente', a.atendente, a.comissao_atendente, a.pago_atendente]
      ].forEach(([func, nome, val, pago]) => {
        if (!nome || nome === 'NOVO' || nome === 'DESC' || !val) return;
        if (!porColab[nome]) porColab[nome] = { trabalhos: new Set(), pago: 0, aPagar: 0 };
        porColab[nome].trabalhos.add(a.id);
        if (pago) porColab[nome].pago += val;
        else porColab[nome].aPagar += val;
      });
    }
  });
  
  const tbody = document.getElementById('dashColaboradoresBody');
  const linhas = Object.entries(porColab)
    .sort((a, b) => (b[1].pago + b[1].aPagar) - (a[1].pago + a[1].aPagar))
    .map(([nome, info]) => `
      <tr>
        <td><strong>${escapeHtml(nome)}</strong></td>
        <td>${info.trabalhos.size}</td>
        <td class="text-right text-success">${formatarMoeda(info.pago)}</td>
        <td class="text-right ${info.aPagar > 0 ? 'text-danger text-bold' : 'text-muted'}">${formatarMoeda(info.aPagar)}</td>
        <td class="text-right text-bold">${formatarMoeda(info.pago + info.aPagar)}</td>
      </tr>
    `);
  
  tbody.innerHTML = linhas.join('') || '<tr><td colspan="5" class="text-center text-muted">Nenhum dado</td></tr>';
}

// ============================================================
// COLABORADORES (PAGINA DE DETALHE)
// ============================================================

function renderizarPaginaColaboradores() {
  // Reseta selector se vazio
  if (!document.getElementById('colabSelector').value) {
    document.getElementById('colabContent').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">👤</div>
        <p>Selecione um colaborador acima para ver os detalhes</p>
      </div>
    `;
  }
}

function carregarDetalheColaborador() {
  const nome = document.getElementById('colabSelector').value;
  if (!nome) {
    renderizarPaginaColaboradores();
    return;
  }
  
  // Trabalhos onde o colaborador participa
  const trabalhos = cacheAgendamentos.filter(a => 
    a.gestor === nome || a.produtor === nome || a.atendente === nome
  );
  
  // Calcular totais
  let totalAReceber = 0;
  let totalRecebido = 0;
  const detalhes = [];
  
  trabalhos.forEach(a => {
    const funcoes = [];
    if (a.gestor === nome && a.comissao_gestor > 0) {
      funcoes.push({
        funcao: 'GESTOR',
        valor: a.comissao_gestor,
        cliente_pagou: a.cliente_pagou,
        pago: a.pago_gestor,
        data_pago: a.data_pagamento_gestor,
      });
    }
    if (a.produtor === nome && a.comissao_produtor > 0) {
      funcoes.push({
        funcao: 'PRODUTOR',
        valor: a.comissao_produtor,
        cliente_pagou: a.cliente_pagou,
        pago: a.pago_produtor,
        data_pago: a.data_pagamento_produtor,
      });
    }
    if (a.atendente === nome && a.comissao_atendente > 0) {
      funcoes.push({
        funcao: 'ATENDENTE',
        valor: a.comissao_atendente,
        cliente_pagou: a.cliente_pagou,
        pago: a.pago_atendente,
        data_pago: a.data_pagamento_atendente,
      });
    }
    
    funcoes.forEach(f => {
      detalhes.push({ ...f, agendamento: a });
      if (f.cliente_pagou) {
        if (f.pago) totalRecebido += f.valor;
        else totalAReceber += f.valor;
      }
    });
  });
  
  const totalAguardandoCliente = detalhes
    .filter(d => !d.cliente_pagou)
    .reduce((s, d) => s + d.valor, 0);
  
  const cont = document.getElementById('colabContent');
  cont.innerHTML = `
    <div class="cards-grid">
      <div class="stat-card success">
        <div class="stat-card-label">Já Recebido</div>
        <div class="stat-card-value text-success">${formatarMoeda(totalRecebido)}</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-card-label">A Receber (cliente já pagou)</div>
        <div class="stat-card-value text-warning">${formatarMoeda(totalAReceber)}</div>
      </div>
      <div class="stat-card info">
        <div class="stat-card-label">Aguardando Cliente</div>
        <div class="stat-card-value">${formatarMoeda(totalAguardandoCliente)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">Total de Trabalhos</div>
        <div class="stat-card-value">${trabalhos.length}</div>
      </div>
    </div>

    <div class="card">
      <h3 class="mb-16">Detalhamento de ${escapeHtml(nome)}</h3>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Cliente</th>
              <th>Função</th>
              <th class="text-right">Comissão</th>
              <th>Cliente Pagou?</th>
              <th>Comissão Paga?</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${detalhes.sort((a,b) => new Date(b.agendamento.data) - new Date(a.agendamento.data)).map(d => `
              <tr>
                <td>${formatarData(d.agendamento.data)}</td>
                <td><strong>${escapeHtml(d.agendamento.cliente)}</strong><div class="text-muted" style="font-size:11px">${escapeHtml(d.agendamento.tipo || '')}</div></td>
                <td><span class="badge badge-info">${d.funcao}</span></td>
                <td class="text-right text-bold">${formatarMoeda(d.valor)}</td>
                <td>${d.cliente_pagou 
                  ? `<span class="badge badge-success">✓ ${formatarData(d.agendamento.data_pagamento_cliente)}</span>` 
                  : '<span class="badge badge-warning">⏳</span>'}</td>
                <td>${d.pago 
                  ? `<span class="badge badge-success">✓ ${formatarData(d.data_pago)}</span>` 
                  : (d.cliente_pagou ? '<span class="badge badge-danger">⚠ PENDENTE</span>' : '<span class="badge badge-gray">—</span>')}</td>
                <td><button class="btn btn-outline btn-sm" onclick="abrirEditarAgendamento(${d.agendamento.id})">Abrir</button></td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="text-center text-muted">Sem registros</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ============================================================
// DESPESAS
// ============================================================

function renderizarDespesas() {
  const filtroMes = document.getElementById('despFiltroMes').value;
  const filtroCat = document.getElementById('despFiltroCategoria').value;
  
  let dados = cacheDespesas;
  if (filtroMes) dados = dados.filter(d => d.mes === filtroMes);
  if (filtroCat) dados = dados.filter(d => d.categoria === filtroCat);
  
  // Cards por categoria
  const porCat = {};
  dados.forEach(d => {
    const cat = d.categoria || 'OUTROS';
    porCat[cat] = (porCat[cat] || 0) + d.valor;
  });
  
  const cardsCont = document.getElementById('despesasCards');
  const total = dados.reduce((s, d) => s + d.valor, 0);
  
  cardsCont.innerHTML = `
    <div class="stat-card danger">
      <div class="stat-card-label">Total de Despesas</div>
      <div class="stat-card-value text-danger">${formatarMoeda(total)}</div>
    </div>
  ` + Object.entries(porCat)
    .sort((a,b) => b[1] - a[1])
    .map(([cat, val]) => `
      <div class="stat-card">
        <div class="stat-card-label">${cat}</div>
        <div class="stat-card-value">${formatarMoeda(val)}</div>
      </div>
    `).join('');
  
  // Tabela
  const tbody = document.getElementById('despesasBody');
  tbody.innerHTML = dados.length === 0
    ? '<tr><td colspan="5" class="text-center text-muted">Nenhuma despesa</td></tr>'
    : dados.map(d => `
      <tr>
        <td>${formatarData(d.data)}</td>
        <td>${escapeHtml(d.descricao)}</td>
        <td><span class="badge badge-gray">${escapeHtml(d.categoria || '')}</span></td>
        <td class="text-right text-bold text-danger">${formatarMoeda(d.valor)}</td>
        <td><button class="btn btn-outline btn-sm" onclick="abrirEditarDespesa(${d.id})">Editar</button></td>
      </tr>
    `).join('');
}

function abrirNovaDespesa() {
  document.getElementById('modalDespesaTitulo').textContent = 'Nova Despesa';
  document.getElementById('despId').value = '';
  document.getElementById('despData').valueAsDate = new Date();
  document.getElementById('despMes').value = MESES[new Date().getMonth()];
  document.getElementById('despDescricao').value = '';
  document.getElementById('despCategoria').value = 'DES.PERACIONAIS';
  document.getElementById('despValor').value = '';
  document.getElementById('btnExcluirDespesa').style.display = 'none';
  document.getElementById('modalDespesa').classList.add('active');
}

function abrirEditarDespesa(id) {
  const d = cacheDespesas.find(x => x.id === id);
  if (!d) return;
  
  document.getElementById('modalDespesaTitulo').textContent = 'Editar Despesa';
  document.getElementById('despId').value = d.id;
  document.getElementById('despData').value = d.data;
  document.getElementById('despMes').value = d.mes || '';
  document.getElementById('despDescricao').value = d.descricao || '';
  document.getElementById('despCategoria').value = d.categoria || '';
  document.getElementById('despValor').value = d.valor || 0;
  document.getElementById('btnExcluirDespesa').style.display = 'inline-flex';
  document.getElementById('modalDespesa').classList.add('active');
}

async function salvarDespesa() {
  const id = document.getElementById('despId').value;
  const dados = {
    data: document.getElementById('despData').value,
    mes: document.getElementById('despMes').value,
    descricao: document.getElementById('despDescricao').value.trim(),
    categoria: document.getElementById('despCategoria').value,
    valor: parseFloat(document.getElementById('despValor').value) || 0,
  };
  
  if (!dados.descricao || !dados.data) {
    toast('Preencha descrição e data', 'warning');
    return;
  }
  
  mostrarLoading(true);
  let result;
  if (id) {
    result = await supabase.from('despesas').update(dados).eq('id', id);
  } else {
    result = await supabase.from('despesas').insert([dados]);
  }
  mostrarLoading(false);
  
  if (result.error) {
    toast('Erro: ' + result.error.message, 'error');
    return;
  }
  
  toast(id ? 'Despesa atualizada' : 'Despesa criada', 'success');
  fecharModal('modalDespesa');
  await carregarDespesas();
  renderizarDespesas();
  atualizarDashboard();
}

async function excluirDespesa() {
  const id = document.getElementById('despId').value;
  if (!id) return;
  if (!confirm('Excluir esta despesa?')) return;
  
  mostrarLoading(true);
  const { error } = await supabase.from('despesas').delete().eq('id', id);
  mostrarLoading(false);
  
  if (error) {
    toast('Erro: ' + error.message, 'error');
    return;
  }
  
  toast('Despesa excluída', 'success');
  fecharModal('modalDespesa');
  await carregarDespesas();
  renderizarDespesas();
  atualizarDashboard();
}

// ============================================================
// HISTORICO
// ============================================================

function renderizarHistorico() {
  const tbody = document.getElementById('historicoBody');
  tbody.innerHTML = cacheHistorico.length === 0
    ? '<tr><td colspan="6" class="text-center text-muted">Nenhum pagamento registrado ainda</td></tr>'
    : cacheHistorico.map(h => `
      <tr>
        <td><strong>${formatarData(h.data_pagamento)}</strong></td>
        <td>${escapeHtml(h.colaborador)}</td>
        <td class="text-right">${h.qtd_trabalhos}</td>
        <td class="text-right text-bold text-success">${formatarMoeda(h.total_pago)}</td>
        <td class="text-muted" style="font-size:12px">${escapeHtml(h.observacoes || '')}</td>
        <td><button class="btn btn-outline btn-sm" onclick="verDetalheHistorico(${h.id})">Detalhes</button></td>
      </tr>
    `).join('');
}

function verDetalheHistorico(id) {
  const h = cacheHistorico.find(x => x.id === id);
  if (!h) return;

  const ageIds = h.agendamento_ids || [];
  const trabs = cacheAgendamentos.filter(a => ageIds.includes(a.id));

  document.getElementById('modalHistoricoDetalheTitulo').textContent =
    `Pagamento — ${escapeHtml(h.colaborador)} — ${formatarData(h.data_pagamento)}`;

  document.getElementById('modalHistoricoDetalheBody').innerHTML = `
    <div class="cards-grid mb-16">
      <div class="stat-card success">
        <div class="stat-card-label">Total Pago</div>
        <div class="stat-card-value text-success">${formatarMoeda(h.total_pago)}</div>
      </div>
      <div class="stat-card info">
        <div class="stat-card-label">Trabalhos</div>
        <div class="stat-card-value">${h.qtd_trabalhos}</div>
      </div>
    </div>
    ${trabs.length > 0 ? `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Cliente</th>
            <th>Tipo</th>
            <th class="text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${trabs.map(a => `
            <tr>
              <td>${formatarData(a.data)}</td>
              <td><strong>${escapeHtml(a.cliente)}</strong></td>
              <td>${escapeHtml(a.tipo || '—')}</td>
              <td class="text-right text-bold">${formatarMoeda(a.valor)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : '<p class="text-muted text-center" style="padding:20px">Detalhes dos trabalhos não disponíveis</p>'}
    ${h.observacoes ? `<p class="text-muted mt-16" style="font-size:12px">${escapeHtml(h.observacoes)}</p>` : ''}
  `;

  document.getElementById('modalHistoricoDetalhe').classList.add('active');
}

// ============================================================
// UTILITARIOS
// ============================================================

function formatarMoeda(v) {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('pt-BR');
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fecharModal(id) {
  document.getElementById(id).classList.remove('active');
}

function mostrarLoading(mostrar) {
  document.getElementById('loadingFull').style.display = mostrar ? 'flex' : 'none';
}

function toast(msg, tipo = 'success') {
  const el = document.createElement('div');
  el.className = 'toast ' + tipo;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// Fechar modal ao clicar fora
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => {
    if (e.target === m) m.classList.remove('active');
  });
});
