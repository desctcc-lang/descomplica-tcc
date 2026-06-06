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

const STATUS_OP = ['CADASTRADO','PENDENTE','PRONTO','RECEBIDO','CANCELADO'];

const CATEGORIAS_DESPESA = ['ATENDIMENTO','DEP. OPERACIONAL','INDICAÇÃO','MARKETING','PRODUÇÃO','SALÁRIO','TRIBUTO'];

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
  document.getElementById('folhaDataPagamento').value = getCurrentDateString();

  // Preparar selects de mês
  preencherSelectsMes();

  // Carregar dados
  carregarTudo();
}

// ============================================================
// UTILITÁRIO DE DATA
// ============================================================

function getCurrentDateString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

    if (page === 'comissoes') carregarFolha();
    if (page === 'dashboard') atualizarDashboard();
    if (page === 'operacoes') renderizarAgendamentos();
    if (page === 'pendentes') renderizarPendentes();
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
  preencherSelectsAno();
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
    toast('Erro ao carregar operações: ' + error.message, 'error');
    return;
  }
  cacheAgendamentos = data || [];
  renderizarAgendamentos();
  renderizarPendentes();
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

  ['filtroColaborador', 'pendFiltroColaborador'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const va = el.value;
      el.innerHTML = '<option value="">Todos</option>' +
        COLABORADORES.map(c => `<option value="${c}">${c}</option>`).join('');
      el.value = va;
    }
  });

  const folhaFiltro = document.getElementById('folhaFiltroColaborador');
  if (folhaFiltro) {
    folhaFiltro.innerHTML = '<option value="">Todos</option>' +
      COLABORADORES.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  const colabSel = document.getElementById('colabSelector');
  if (colabSel) {
    colabSel.innerHTML = '<option value="">Selecione um colaborador...</option>' +
      COLABORADORES.map(c => `<option value="${c}">${c}</option>`).join('');
  }
}

function preencherSelectsMes() {
  const opcoes = '<option value="">Todos os meses</option>' +
    MESES.map(m => `<option value="${m}">${m}</option>`).join('');

  ['filtroMes', 'dashFiltroMes', 'despFiltroMes', 'pendFiltroMes'].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) {
      const valorAtual = sel.value;
      sel.innerHTML = opcoes;
      sel.value = valorAtual;
    }
  });
}

function preencherSelectsAno() {
  // Coletar anos únicos dos agendamentos
  const anosAge = new Set();
  cacheAgendamentos.forEach(a => {
    if (a.data) {
      const ano = a.data.substring(0, 4);
      if (ano) anosAge.add(ano);
    }
  });

  // Coletar anos únicos das despesas
  const anosDes = new Set();
  cacheDespesas.forEach(d => {
    if (d.data) {
      const ano = d.data.substring(0, 4);
      if (ano) anosDes.add(ano);
    }
  });

  const todosAnosAge = Array.from(anosAge).sort().reverse();
  const todosAnosDes = Array.from(anosDes).sort().reverse();

  const opcoesAge = '<option value="">Todos os anos</option>' +
    todosAnosAge.map(a => `<option value="${a}">${a}</option>`).join('');

  const opcoesDes = '<option value="">Todos os anos</option>' +
    todosAnosDes.map(a => `<option value="${a}">${a}</option>`).join('');

  ['filtroAno', 'dashFiltroAno', 'pendFiltroAno'].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) {
      const va = sel.value;
      sel.innerHTML = opcoesAge;
      if (va) sel.value = va;
    }
  });

  const despAno = document.getElementById('despFiltroAno');
  if (despAno) {
    const va = despAno.value;
    despAno.innerHTML = opcoesDes;
    if (va) despAno.value = va;
  }
}

// ============================================================
// FILTROS E EVENTOS
// ============================================================

['filtroCliente', 'filtroAno', 'filtroMes', 'filtroColaborador'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', renderizarAgendamentos);
    el.addEventListener('change', renderizarAgendamentos);
  }
});

// filtroStatus é multiple — só change
const filtroStatusEl = document.getElementById('filtroStatus');
if (filtroStatusEl) filtroStatusEl.addEventListener('change', renderizarAgendamentos);

['pendFiltroCliente', 'pendFiltroAno', 'pendFiltroMes', 'pendFiltroColaborador'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', renderizarPendentes);
    el.addEventListener('change', renderizarPendentes);
  }
});

const pendFiltroStatusEl = document.getElementById('pendFiltroStatus');
if (pendFiltroStatusEl) pendFiltroStatusEl.addEventListener('change', renderizarPendentes);

document.getElementById('dashFiltroMes').addEventListener('change', atualizarDashboard);
document.getElementById('dashFiltroAno').addEventListener('change', atualizarDashboard);
document.getElementById('folhaFiltroColaborador').addEventListener('change', () => renderizarFolha());
['despFiltroAno', 'despFiltroMes', 'despFiltroCategoria'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('change', renderizarDespesas);
});

// ============================================================
// HELPERS DE STATUS
// ============================================================

function getStatusClass(status) {
  switch ((status || 'CADASTRADO').toUpperCase()) {
    case 'RECEBIDO': return 'row-recebido';
    case 'PRONTO': return 'row-pronto';
    case 'PENDENTE': return 'row-pendente';
    case 'CANCELADO': return 'row-cancelado';
    default: return '';
  }
}

function badgeStatus(status) {
  const s = (status || 'CADASTRADO').toUpperCase();
  const cls = {
    RECEBIDO: 'badge-recebido',
    PRONTO: 'badge-pronto',
    PENDENTE: 'badge-pendente',
    CANCELADO: 'badge-cancelado',
    CADASTRADO: 'badge-cadastrado',
  }[s] || 'badge-cadastrado';
  return `<span class="badge ${cls}">${s}</span>`;
}

function statusSelectInline(id, currentStatus, onchangeFn) {
  const s = (currentStatus || 'CADASTRADO').toUpperCase();
  const opts = STATUS_OP.map(st =>
    `<option value="${st}"${st === s ? ' selected' : ''}>${st}</option>`
  ).join('');
  return `<select class="status-select-inline" onchange="${onchangeFn}(${id}, this.value)">${opts}</select>`;
}

function getStatusFromOptions(selectEl) {
  if (!selectEl) return [];
  return Array.from(selectEl.options)
    .filter(o => o.selected)
    .map(o => o.value);
}

// ============================================================
// AGENDAMENTOS - FILTRO COMUM
// ============================================================

function filtrarAgendamentos(prefixo) {
  const isOp = prefixo === '';
  const clienteId = isOp ? 'filtroCliente' : 'pendFiltroCliente';
  const anoId = isOp ? 'filtroAno' : 'pendFiltroAno';
  const mesId = isOp ? 'filtroMes' : 'pendFiltroMes';
  const colabId = isOp ? 'filtroColaborador' : 'pendFiltroColaborador';
  const statusId = isOp ? 'filtroStatus' : 'pendFiltroStatus';

  const filtroCliente = (document.getElementById(clienteId).value || '').toLowerCase().trim();
  const filtroAno = document.getElementById(anoId).value;
  const filtroMes = document.getElementById(mesId).value;
  const filtroColab = document.getElementById(colabId).value;
  const statusSelecionados = getStatusFromOptions(document.getElementById(statusId));

  const buscando = filtroCliente.length > 0;

  return cacheAgendamentos.filter(a => {
    const status = (a.status || 'CADASTRADO').toUpperCase();

    // Para a aba Pendentes, excluir RECEBIDO e CANCELADO por padrão de onde vem filtrado
    // (o filtro de status do pendentes já cuida disso via select)

    // Status filter
    if (statusSelecionados.length > 0 && !statusSelecionados.includes(status)) return false;

    if (buscando) {
      // Quando buscando: ignorar ano/mes/colab, buscar por nome OU telefone
      const cliente = (a.cliente || '').toLowerCase();
      const telefone = (a.telefone || '').toLowerCase();
      if (!cliente.includes(filtroCliente) && !telefone.includes(filtroCliente)) return false;
      return true;
    }

    // Filtros normais
    if (filtroAno && (!a.data || !a.data.startsWith(filtroAno))) return false;
    if (filtroMes && a.mes !== filtroMes) return false;
    if (filtroColab && a.gestor !== filtroColab && a.produtor !== filtroColab && a.atendente !== filtroColab) return false;

    return true;
  });
}

// ============================================================
// OPERAÇÕES - LISTAGEM
// ============================================================

function renderizarAgendamentos() {
  const dados = filtrarAgendamentos('');

  const tbody = document.getElementById('agendamentosBody');

  if (dados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="12" class="text-center text-muted" style="padding:40px">Nenhuma operação encontrada</td></tr>';
    document.getElementById('ageQtd').textContent = '0';
    document.getElementById('ageTotal').textContent = formatarMoeda(0);
    return;
  }

  const dadosExibir = dados.slice(0, 500);

  tbody.innerHTML = dadosExibir.map(a => {
    const status = (a.status || 'CADASTRADO').toUpperCase();
    const rowClass = getStatusClass(status);

    const statusCliente = a.cliente_pagou
      ? '<span class="badge badge-success">✓ PAGO</span>'
      : '<span class="badge badge-warning">⏳ PEND.</span>';

    let statusComissoes = '';
    if (a.cliente_pagou) {
      const g = a.pago_gestor ? '<span class="status-dot pago">G✓</span>' : '<span class="status-dot pendente">G</span>';
      const p = a.pago_produtor ? '<span class="status-dot pago">P✓</span>' : '<span class="status-dot pendente">P</span>';
      const at = a.pago_atendente ? '<span class="status-dot pago">A✓</span>' : '<span class="status-dot pendente">A</span>';
      statusComissoes = `<div class="status-pagamento">${g}${p}${at}</div>`;
    } else {
      statusComissoes = '<span class="text-muted" style="font-size:11px">—</span>';
    }

    return `
      <tr class="${rowClass}" data-id="${a.id}">
        <td class="checkbox-cell"><input type="checkbox" class="check-op" value="${a.id}"></td>
        <td>${formatarData(a.data)}</td>
        <td><strong>${escapeHtml(a.cliente)}</strong></td>
        <td>${escapeHtml(a.tipo || '')}</td>
        <td class="text-right text-bold">${formatarMoeda(a.valor)}</td>
        <td>${escapeHtml(a.gestor || '')}</td>
        <td>${escapeHtml(a.produtor || '')}</td>
        <td>${escapeHtml(a.atendente || '')}</td>
        <td>${statusSelectInline(a.id, status, 'mudarStatusDireto')}</td>
        <td>${statusCliente}</td>
        <td>${statusComissoes}</td>
        <td><button class="btn btn-outline btn-sm" onclick="abrirEditarAgendamento(${a.id})">Editar</button></td>
      </tr>
    `;
  }).join('');

  document.getElementById('ageQtd').textContent = dados.length + (dados.length > 500 ? ' (exibindo 500)' : '');
  document.getElementById('ageTotal').textContent = formatarMoeda(dados.reduce((s, a) => s + (a.valor || 0), 0));
}

// ============================================================
// PENDENTES - LISTAGEM
// ============================================================

function renderizarPendentes() {
  // Pendentes: status NOT IN RECEBIDO, CANCELADO — mas respeitando filtro de status
  const dadosFiltrados = filtrarAgendamentos('pend');

  const tbody = document.getElementById('pendentesBody');

  if (dadosFiltrados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted" style="padding:40px">Nenhum registro pendente encontrado</td></tr>';
    document.getElementById('pendQtd').textContent = '0';
    document.getElementById('pendTotal').textContent = formatarMoeda(0);
    return;
  }

  tbody.innerHTML = dadosFiltrados.map(a => {
    const status = (a.status || 'CADASTRADO').toUpperCase();
    const rowClass = getStatusClass(status);

    return `
      <tr class="${rowClass}" data-id="${a.id}">
        <td class="checkbox-cell"><input type="checkbox" class="check-pend" value="${a.id}"></td>
        <td>${formatarData(a.data)}</td>
        <td><strong>${escapeHtml(a.cliente)}</strong></td>
        <td>${escapeHtml(a.tipo || '')}</td>
        <td class="text-right text-bold">${formatarMoeda(a.valor)}</td>
        <td>${escapeHtml(a.gestor || '')}</td>
        <td>${escapeHtml(a.produtor || '')}</td>
        <td>${escapeHtml(a.atendente || '')}</td>
        <td>${statusSelectInline(a.id, status, 'mudarStatusDireto')}</td>
        <td><button class="btn btn-outline btn-sm" onclick="abrirEditarAgendamento(${a.id})">Editar</button></td>
      </tr>
    `;
  }).join('');

  document.getElementById('pendQtd').textContent = dadosFiltrados.length;
  document.getElementById('pendTotal').textContent = formatarMoeda(dadosFiltrados.reduce((s, a) => s + (a.valor || 0), 0));
}

// ============================================================
// SELECIONAR TODOS / BULK
// ============================================================

function selecionarTodosOp(checked) {
  document.querySelectorAll('.check-op').forEach(c => c.checked = checked);
}

function selecionarTodosPend(checked) {
  document.querySelectorAll('.check-pend').forEach(c => c.checked = checked);
}

async function excluirSelecionadosOp() {
  const ids = Array.from(document.querySelectorAll('.check-op:checked')).map(c => parseInt(c.value));
  if (ids.length === 0) { toast('Nenhum registro selecionado', 'warning'); return; }
  if (!confirm(`Excluir ${ids.length} operação(ões) selecionada(s)? Esta ação não pode ser desfeita.`)) return;

  mostrarLoading(true);
  const { error } = await supabase.from('agendamentos').delete().in('id', ids);
  mostrarLoading(false);

  if (error) { toast('Erro ao excluir: ' + error.message, 'error'); return; }

  toast(`${ids.length} operação(ões) excluída(s)`, 'success');
  await carregarAgendamentos();
  atualizarDashboard();
}

async function excluirSelecionadosPend() {
  const ids = Array.from(document.querySelectorAll('.check-pend:checked')).map(c => parseInt(c.value));
  if (ids.length === 0) { toast('Nenhum registro selecionado', 'warning'); return; }
  if (!confirm(`Excluir ${ids.length} operação(ões) selecionada(s)? Esta ação não pode ser desfeita.`)) return;

  mostrarLoading(true);
  const { error } = await supabase.from('agendamentos').delete().in('id', ids);
  mostrarLoading(false);

  if (error) { toast('Erro ao excluir: ' + error.message, 'error'); return; }

  toast(`${ids.length} operação(ões) excluída(s)`, 'success');
  await carregarAgendamentos();
  atualizarDashboard();
}

async function excluirTodosDoMes() {
  const filtroAno = document.getElementById('filtroAno').value;
  const filtroMes = document.getElementById('filtroMes').value;

  if (!filtroMes && !filtroAno) {
    toast('Selecione pelo menos um mês ou ano para usar esta função', 'warning');
    return;
  }

  const dados = filtrarAgendamentos('');
  if (dados.length === 0) { toast('Nenhuma operação no filtro atual', 'warning'); return; }

  const label = [filtroMes, filtroAno].filter(Boolean).join('/');
  if (!confirm(`Excluir TODAS as ${dados.length} operações do período "${label}"? Esta ação não pode ser desfeita.`)) return;

  const ids = dados.map(a => a.id);
  mostrarLoading(true);
  const { error } = await supabase.from('agendamentos').delete().in('id', ids);
  mostrarLoading(false);

  if (error) { toast('Erro ao excluir: ' + error.message, 'error'); return; }

  toast(`${ids.length} operação(ões) excluída(s)`, 'success');
  await carregarAgendamentos();
  atualizarDashboard();
}

// ============================================================
// MUDANÇA DE STATUS DIRETA NA LISTA
// ============================================================

async function mudarStatusDireto(id, novoStatus) {
  mostrarLoading(true);
  const { error } = await supabase
    .from('agendamentos')
    .update({ status: novoStatus })
    .eq('id', id);
  mostrarLoading(false);

  if (error) { toast('Erro ao atualizar status: ' + error.message, 'error'); return; }

  // Atualizar cache local
  const idx = cacheAgendamentos.findIndex(x => x.id === id);
  if (idx >= 0) cacheAgendamentos[idx].status = novoStatus;

  toast('Status atualizado', 'success');
  renderizarAgendamentos();
  renderizarPendentes();
  atualizarDashboard();
}

// ============================================================
// AGENDAMENTOS - MODAL DE EDICAO
// ============================================================

function abrirNovaOperacao() {
  document.getElementById('modalAgendamentoTitulo').textContent = 'Nova Operação';
  document.getElementById('ageId').value = '';
  document.getElementById('ageData').value = getCurrentDateString();

  const mesAtual = MESES[new Date().getMonth()];
  document.getElementById('ageMes').value = mesAtual;
  document.getElementById('ageStatus').value = 'CADASTRADO';

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

  document.getElementById('modalAgendamento').classList.add('active');
}

// Alias for backward compatibility
function abrirNovoAgendamento() { abrirNovaOperacao(); }

function abrirEditarAgendamento(id) {
  const a = cacheAgendamentos.find(x => x.id === id);
  if (!a) return;

  document.getElementById('modalAgendamentoTitulo').textContent = 'Editar Operação #' + id;
  document.getElementById('ageId').value = a.id;
  document.getElementById('ageData').value = a.data;
  document.getElementById('ageMes').value = a.mes || '';
  document.getElementById('ageStatus').value = (a.status || 'CADASTRADO').toUpperCase();
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

  atualizarStatusClienteUI(a);

  document.getElementById('modalAgendamento').classList.add('active');
}

function ageDataChanged() {
  const dataVal = document.getElementById('ageData').value;
  if (dataVal) {
    const partes = dataVal.split('-');
    if (partes.length >= 2) {
      const mesIdx = parseInt(partes[1], 10) - 1;
      if (mesIdx >= 0 && mesIdx < 12) {
        document.getElementById('ageMes').value = MESES[mesIdx];
      }
    }
  }
}

function despDataChanged() {
  const dataVal = document.getElementById('despData').value;
  if (dataVal) {
    const partes = dataVal.split('-');
    if (partes.length >= 2) {
      const mesIdx = parseInt(partes[1], 10) - 1;
      if (mesIdx >= 0 && mesIdx < 12) {
        document.getElementById('despMes').value = MESES[mesIdx];
      }
    }
  }
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

async function salvarAgendamento() {
  const id = document.getElementById('ageId').value;
  const dados = {
    data: document.getElementById('ageData').value,
    mes: document.getElementById('ageMes').value,
    status: document.getElementById('ageStatus').value || 'CADASTRADO',
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

  toast(id ? 'Operação atualizada!' : 'Operação criada!', 'success');
  fecharModal('modalAgendamento');
  await carregarAgendamentos();
  preencherSelectsAno();
  atualizarDashboard();
}

async function excluirAgendamento() {
  const id = document.getElementById('ageId').value;
  if (!id) return;

  if (!confirm('Tem certeza que quer excluir esta operação? Esta ação não pode ser desfeita.')) return;

  mostrarLoading(true);
  const { error } = await supabase.from('agendamentos').delete().eq('id', id);
  mostrarLoading(false);

  if (error) {
    toast('Erro ao excluir: ' + error.message, 'error');
    return;
  }

  toast('Operação excluída', 'success');
  fecharModal('modalAgendamento');
  await carregarAgendamentos();
  atualizarDashboard();
}

async function marcarClientePagou() {
  const id = document.getElementById('ageId').value;
  if (!id) return;

  const dataPag = prompt('Data do pagamento (YYYY-MM-DD):', getCurrentDateString());
  if (!dataPag) return;

  mostrarLoading(true);
  const { data, error } = await supabase
    .from('agendamentos')
    .update({ cliente_pagou: true, data_pagamento_cliente: dataPag, status: 'RECEBIDO' })
    .eq('id', id)
    .select()
    .single();
  mostrarLoading(false);

  if (error) {
    toast('Erro: ' + error.message, 'error');
    return;
  }

  toast('Cliente marcado como pago!', 'success');

  const idx = cacheAgendamentos.findIndex(x => x.id === parseInt(id));
  if (idx >= 0) cacheAgendamentos[idx] = data;

  // Atualizar campo status no modal
  document.getElementById('ageStatus').value = 'RECEBIDO';

  atualizarStatusClienteUI(data);
  renderizarAgendamentos();
  renderizarPendentes();
  atualizarDashboard();
}

async function desmarcarClientePagou() {
  const id = document.getElementById('ageId').value;
  if (!id) return;

  if (!confirm('Desmarcar o pagamento do cliente? Isso só funciona se nenhuma comissão tiver sido paga ainda.')) return;

  const a = cacheAgendamentos.find(x => x.id === parseInt(id));
  if (a && (a.pago_gestor || a.pago_produtor || a.pago_atendente)) {
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
  renderizarPendentes();
  atualizarDashboard();
}

async function baixarComissao(tipo) {
  const id = document.getElementById('ageId').value;
  if (!id) return;

  const dataPag = document.getElementById('folhaDataPagamento').value || getCurrentDateString();
  const a = cacheAgendamentos.find(x => x.id === parseInt(id));

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

  // Criar despesa automática para esta comissão
  if (a) {
    const valorComissao = a[`comissao_${tipo}`] || 0;
    const colaboradorNome = a[tipo] || '';
    let categoriaDesp = '';
    if (tipo === 'atendente') categoriaDesp = 'ATENDIMENTO';
    else if (tipo === 'gestor') categoriaDesp = 'INDICAÇÃO';
    else if (tipo === 'produtor') categoriaDesp = 'PRODUÇÃO';

    if (valorComissao > 0 && colaboradorNome && categoriaDesp) {
      const descDesp = `Comissão ${tipo.toUpperCase()} - ${colaboradorNome} - ${a.cliente}`;
      const mesDesp = a.mes || MESES[new Date(dataPag + 'T12:00:00').getMonth()];
      await supabase.from('despesas').insert([{
        data: dataPag,
        mes: mesDesp,
        descricao: descDesp,
        categoria: categoriaDesp,
        valor: valorComissao,
      }]);
      await carregarDespesas();
    }
  }

  toast(`Comissão de ${tipo} baixada!`, 'success');
  const idx = cacheAgendamentos.findIndex(x => x.id === parseInt(id));
  if (idx >= 0) cacheAgendamentos[idx] = data;
  atualizarStatusClienteUI(data);
  renderizarAgendamentos();
  renderizarPendentes();
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
  renderizarPendentes();
  atualizarDashboard();
}

// ============================================================
// IMPORTAR CSV
// ============================================================

let csvDados = [];

function abrirImportarCSV() {
  document.getElementById('csvTexto').value = '';
  document.getElementById('csvPreview').innerHTML = '';
  document.getElementById('btnConfirmarImport').style.display = 'none';
  csvDados = [];
  document.getElementById('modalImportCSV').classList.add('active');
}

function previewCSV() {
  const texto = document.getElementById('csvTexto').value.trim();
  const linhas = texto.split('\n').map(l => l.trim()).filter(Boolean);

  if (linhas.length < 2) {
    document.getElementById('csvPreview').innerHTML = '<p class="text-danger">Cole pelo menos o cabeçalho e uma linha de dados.</p>';
    return;
  }

  // Verificar cabeçalho
  const cabecalho = linhas[0].split(';').map(h => h.trim());
  const esperado = ['Vencimento', 'Cliente', 'Tipo', 'Telefone', 'Páginas', 'Valor', 'Pagamento'];

  csvDados = [];

  for (let i = 1; i < linhas.length; i++) {
    const cols = linhas[i].split(';').map(c => c.trim());
    let dataStr = cols[0] || '';

    // Converter DD/MM/YYYY → YYYY-MM-DD
    if (dataStr.includes('/')) {
      const p = dataStr.split('/');
      if (p.length === 3) dataStr = `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
    }

    // Derivar mês a partir da data
    let mesDerivado = '';
    if (dataStr && dataStr.length >= 7) {
      const mesIdx = parseInt(dataStr.substring(5, 7), 10) - 1;
      if (mesIdx >= 0 && mesIdx < 12) mesDerivado = MESES[mesIdx];
    }

    csvDados.push({
      data: dataStr,
      mes: mesDerivado,
      cliente: cols[1] || '',
      tipo: cols[2] || '',
      telefone: cols[3] || '',
      paginas: cols[4] || '',
      valor: parseFloat((cols[5] || '0').replace(',', '.')) || 0,
      observacoes: cols[6] || '',
      status: 'CADASTRADO',
    });
  }

  const previewHtml = `
    <p><strong>${csvDados.length} registro(s) para importar:</strong></p>
    <div class="table-wrapper" style="max-height:300px; overflow-y:auto">
      <table>
        <thead><tr>
          <th>Vencimento</th><th>Cliente</th><th>Tipo</th><th>Telefone</th><th>Páginas</th><th>Valor</th><th>Pagamento</th><th>Mês</th>
        </tr></thead>
        <tbody>
          ${csvDados.map(r => `<tr>
            <td>${r.data}</td>
            <td>${escapeHtml(r.cliente)}</td>
            <td>${escapeHtml(r.tipo)}</td>
            <td>${escapeHtml(r.telefone)}</td>
            <td>${escapeHtml(r.paginas)}</td>
            <td>${formatarMoeda(r.valor)}</td>
            <td>${escapeHtml(r.observacoes)}</td>
            <td>${r.mes}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('csvPreview').innerHTML = previewHtml;
  document.getElementById('btnConfirmarImport').style.display = 'inline-flex';
}

async function confirmarImportCSV() {
  if (csvDados.length === 0) { toast('Nenhum dado para importar', 'warning'); return; }

  if (!confirm(`Importar ${csvDados.length} operação(ões)?`)) return;

  mostrarLoading(true);
  const { error } = await supabase.from('agendamentos').insert(csvDados);
  mostrarLoading(false);

  if (error) {
    toast('Erro na importação: ' + error.message, 'error');
    return;
  }

  toast(`${csvDados.length} operação(ões) importada(s)!`, 'success');
  fecharModal('modalImportCSV');
  csvDados = [];
  await carregarAgendamentos();
  preencherSelectsAno();
  atualizarDashboard();
}

// ============================================================
// COMISSÕES (ex-FOLHA)
// ============================================================

let folhaSelecionados = new Set();

function carregarFolha() {
  folhaSelecionados = new Set();
  renderizarFolha();
}

function selecionarTodosVisiveis() {
  document.querySelectorAll('[class*="check-"]:not(:checked)').forEach(c => {
    if (c.closest('.folha-colaborador')) {
      const body = c.closest('.folha-colaborador-body');
      if (!body || body.classList.contains('expanded')) {
        c.checked = true;
      }
    }
  });
  onCheckChange();
}

function renderizarFolha() {
  const filtroColab = document.getElementById('folhaFiltroColaborador').value;

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
    if (a.produtor && a.comissao_produtor > 0 && !a.pago_produtor) {
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
    if (a.atendente && a.comissao_atendente > 0 && !a.pago_atendente) {
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

  let filtrados = pendentes;
  if (filtroColab) filtrados = pendentes.filter(p => p.colaborador === filtroColab);

  const grupos = {};
  filtrados.forEach(p => {
    if (!grupos[p.colaborador]) grupos[p.colaborador] = [];
    grupos[p.colaborador].push(p);
  });

  const totalAPagar = filtrados.reduce((s, p) => s + p.valor_comissao, 0);
  const qtdColabs = Object.keys(grupos).length;

  document.getElementById('folhaTotalAPagar').textContent = formatarMoeda(totalAPagar);
  document.getElementById('folhaQtdColabs').textContent = qtdColabs;

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
                        data-cliente="${escapeHtml(c.cliente)}"
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
    if (c.closest('.folha-colaborador')) {
      total += parseFloat(c.dataset.valor) || 0;
    }
  });
  document.getElementById('folhaSelecionado').textContent = formatarMoeda(total);
}

async function criarDespesaComissao(dataPag, tipo, colaborador, cliente, valor, mes) {
  if (!valor || !colaborador) return;
  let categoria = '';
  if (tipo === 'atendente') categoria = 'ATENDIMENTO';
  else if (tipo === 'gestor') categoria = 'INDICAÇÃO';
  else if (tipo === 'produtor') categoria = 'PRODUÇÃO';
  if (!categoria) return;

  const desc = `Comissão ${tipo.toUpperCase()} - ${colaborador} - ${cliente}`;
  await supabase.from('despesas').insert([{
    data: dataPag,
    mes: mes || MESES[new Date(dataPag + 'T12:00:00').getMonth()],
    descricao: desc,
    categoria: categoria,
    valor: valor,
  }]);
}

async function pagarSelecionados() {
  const checks = Array.from(document.querySelectorAll('[class*="check-"]:checked')).filter(c => c.closest('.folha-colaborador'));
  if (checks.length === 0) {
    toast('Nenhuma comissão selecionada', 'warning');
    return;
  }

  const dataPag = document.getElementById('folhaDataPagamento').value;
  if (!dataPag) {
    toast('Informe a data do pagamento', 'warning');
    return;
  }

  const porColab = {};
  const updates = [];

  checks.forEach(c => {
    const colab = c.dataset.colab;
    const ageId = parseInt(c.dataset.ageid);
    const tipo = c.dataset.tipo;
    const valor = parseFloat(c.dataset.valor);
    const cliente = c.dataset.cliente || '';

    if (!porColab[colab]) porColab[colab] = { total: 0, qtd: 0, ageIds: [] };
    porColab[colab].total += valor;
    porColab[colab].qtd++;
    porColab[colab].ageIds.push(ageId);

    updates.push({ ageId, tipo, valor, colab, cliente });
  });

  const total = Object.values(porColab).reduce((s, c) => s + c.total, 0);

  if (!confirm(`Confirmar pagamento de ${formatarMoeda(total)} para ${Object.keys(porColab).length} colaborador(es) na data de ${formatarData(dataPag)}?\n\n${checks.length} comissão(ões) serão marcadas como pagas.`)) return;

  mostrarLoading(true);

  try {
    for (const u of updates) {
      const update = {};
      update[`pago_${u.tipo}`] = true;
      update[`data_pagamento_${u.tipo}`] = dataPag;
      const { error } = await supabase.from('agendamentos').update(update).eq('id', u.ageId);
      if (error) throw error;

      // Criar despesa automática
      const a = cacheAgendamentos.find(x => x.id === u.ageId);
      const mes = a ? a.mes : '';
      await criarDespesaComissao(dataPag, u.tipo, u.colab, u.cliente, u.valor, mes);
    }

    const registros = Object.entries(porColab).map(([colab, info]) => ({
      data_pagamento: dataPag,
      colaborador: colab,
      total_pago: info.total,
      qtd_trabalhos: info.qtd,
      agendamento_ids: info.ageIds,
      observacoes: 'Pagamento via comissões',
    }));

    const { error: errHist } = await supabase.from('folha_pagamento').insert(registros);
    if (errHist) console.warn('Aviso ao salvar histórico:', errHist);

    await carregarDespesas();
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

      const a = cacheAgendamentos.find(x => x.id === parseInt(c.dataset.ageid));
      const mes = a ? a.mes : '';
      await criarDespesaComissao(dataPag, c.dataset.tipo, nome, c.dataset.cliente || '', parseFloat(c.dataset.valor), mes);
    }

    await supabase.from('folha_pagamento').insert([{
      data_pagamento: dataPag,
      colaborador: nome,
      total_pago: total,
      qtd_trabalhos: checks.length,
      agendamento_ids: ageIds,
      observacoes: 'Pagamento total via comissões',
    }]);

    await carregarDespesas();
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
  const anoFiltro = document.getElementById('dashFiltroAno').value;

  let dados = cacheAgendamentos;
  if (anoFiltro) dados = dados.filter(a => a.data && a.data.startsWith(anoFiltro));
  if (mesFiltro) dados = dados.filter(a => a.mes === mesFiltro);

  const totalFaturado = dados.reduce((s, a) => s + (a.valor || 0), 0);
  const recebido = dados.filter(a => a.cliente_pagou).reduce((s, a) => s + (a.valor || 0), 0);
  const aReceber = totalFaturado - recebido;

  let comissoesAPagar = 0;
  let comissoesPagas = 0;
  dados.forEach(a => {
    if (a.cliente_pagou) {
      if (a.gestor && a.gestor !== 'NOVO' && a.gestor !== 'DESC' && a.comissao_gestor > 0) {
        if (a.pago_gestor) comissoesPagas += a.comissao_gestor;
        else comissoesAPagar += a.comissao_gestor;
      }
      if (a.produtor && a.comissao_produtor > 0) {
        if (a.pago_produtor) comissoesPagas += a.comissao_produtor;
        else comissoesAPagar += a.comissao_produtor;
      }
      if (a.atendente && a.comissao_atendente > 0) {
        if (a.pago_atendente) comissoesPagas += a.comissao_atendente;
        else comissoesAPagar += a.comissao_atendente;
      }
    }
  });

  let despesasDados = cacheDespesas;
  if (anoFiltro) despesasDados = despesasDados.filter(d => d.data && d.data.startsWith(anoFiltro));
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
// COLABORADORES (PÁGINA DE DETALHE)
// ============================================================

function renderizarPaginaColaboradores() {
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

  const trabalhos = cacheAgendamentos.filter(a =>
    a.gestor === nome || a.produtor === nome || a.atendente === nome
  );

  let totalAReceber = 0;
  let totalRecebido = 0;
  const detalhes = [];

  trabalhos.forEach(a => {
    const funcoes = [];
    if (a.gestor === nome && a.comissao_gestor > 0) {
      funcoes.push({ funcao: 'GESTOR', valor: a.comissao_gestor, cliente_pagou: a.cliente_pagou, pago: a.pago_gestor, data_pago: a.data_pagamento_gestor });
    }
    if (a.produtor === nome && a.comissao_produtor > 0) {
      funcoes.push({ funcao: 'PRODUTOR', valor: a.comissao_produtor, cliente_pagou: a.cliente_pagou, pago: a.pago_produtor, data_pago: a.data_pagamento_produtor });
    }
    if (a.atendente === nome && a.comissao_atendente > 0) {
      funcoes.push({ funcao: 'ATENDENTE', valor: a.comissao_atendente, cliente_pagou: a.cliente_pagou, pago: a.pago_atendente, data_pago: a.data_pagamento_atendente });
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
  const filtroAno = document.getElementById('despFiltroAno').value;
  const filtroMes = document.getElementById('despFiltroMes').value;
  const filtroCat = document.getElementById('despFiltroCategoria').value;

  let dados = cacheDespesas;
  if (filtroAno) dados = dados.filter(d => d.data && d.data.startsWith(filtroAno));
  if (filtroMes) dados = dados.filter(d => d.mes === filtroMes);
  if (filtroCat) dados = dados.filter(d => d.categoria === filtroCat);

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
        <div class="stat-card-label">${escapeHtml(cat)}</div>
        <div class="stat-card-value">${formatarMoeda(val)}</div>
      </div>
    `).join('');

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
  document.getElementById('despData').value = getCurrentDateString();
  document.getElementById('despMes').value = MESES[new Date().getMonth()];
  document.getElementById('despDescricao').value = '';
  document.getElementById('despCategoria').value = 'DEP. OPERACIONAL';
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
  const dataVal = document.getElementById('despData').value;

  // Auto-derivar mês da data se necessário
  let mesVal = document.getElementById('despMes').value;
  if (dataVal && !mesVal) {
    const mesIdx = parseInt(dataVal.substring(5, 7), 10) - 1;
    if (mesIdx >= 0 && mesIdx < 12) mesVal = MESES[mesIdx];
  }

  const dados = {
    data: dataVal,
    mes: mesVal,
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
  preencherSelectsAno();
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
// HISTÓRICO
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

  const linhas = trabs.map(a => `${formatarData(a.data)} - ${a.cliente} - ${a.tipo || ''}`).join('\n');
  alert(`Pagamento de ${formatarMoeda(h.total_pago)} para ${h.colaborador} em ${formatarData(h.data_pagamento)}\n\nTrabalhos:\n${linhas}`);
}

// ============================================================
// UTILITÁRIOS
// ============================================================

function formatarMoeda(v) {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T12:00:00');
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
