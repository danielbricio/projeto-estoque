// --- VERIFICAÇÃO DE SEGURANÇA ---
if (localStorage.getItem('usuarioLogado') !== 'true') {
    alert('Acesso restrito! Por favor, faça o login para continuar.');
    window.location.href = 'login.html';
}

const API_URL = 'http://localhost:3000/api/produtos';

// Variavel para controlar se estamos criando (null) ou editando (id)
let idParaEditar = null;

// --- FUNCAO 1: Listar Produtos ---
async function carregarProdutos() {
    try {
        const resposta = await fetch(API_URL);
        const produtos = await resposta.json();

        const tbody = document.getElementById('tabela-corpo');
        tbody.innerHTML = '';

        produtos.forEach(produto => {
            // Prepara o objeto para ser passado para a funcao de edicao
            // Substituimos aspas duplas por &quot; para nao quebrar o HTML
            const produtoString = JSON.stringify(produto).replace(/"/g, "&quot;");

            const linha = `
                <tr>
                    <td>${produto.id}</td>
                    <td><strong>${produto.nome}</strong></td>
                    <td>${produto.categoria}</td>
                    <td>R$ ${parseFloat(produto.preco).toFixed(2)}</td>
                    <td>${produto.quantidade}</td>
                    <td>
                        <button class="btn-comprar" onclick="abrirModal('${produto.nome}', ${produto.preco})" style="background-color: #0d6efd; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px;">
                            <span class="material-icons" style="font-size:16px; vertical-align:middle">shopping_cart</span>
                        </button>

                        <button onclick="prepararEdicao(${produtoString})" style="background-color: #ffc107; color: black; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px;">
                             <span class="material-icons" style="font-size:16px; vertical-align:middle">edit</span>
                        </button>

                        <button class="btn-delete" onclick="deletarProduto(${produto.id})">
                            <span class="material-icons" style="font-size:16px; vertical-align:middle">delete</span> 
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += linha;
        });

    } catch (erro) {
        console.error("Erro ao buscar produtos:", erro);
    }
}

// --- FUNCAO AUXILIAR: Prepara a tela para edicao ---
function prepararEdicao(produto) {
    // 1. Joga os dados nos inputs
    document.getElementById('nome').value = produto.nome;
    document.getElementById('categoria').value = produto.categoria;
    document.getElementById('preco').value = produto.preco;
    document.getElementById('quantidade').value = produto.quantidade;
    document.getElementById('descricao').value = produto.descricao;

    // 2. Guarda o ID na variavel global
    idParaEditar = produto.id;

    // 3. Muda a cor do botao salvar para Amarelo
    const btn = document.querySelector('.btn-salvar');
    btn.innerHTML = '<span class="material-icons">sync</span> Atualizar Produto';
    btn.style.backgroundColor = "#ffc107"; // Amarelo
    btn.style.color = "black";
    
    // 4. Rola a tela para o topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- FUNCAO 2: Salvar (Cria ou Edita) ---
async function salvarProduto() {
    const nome = document.getElementById('nome').value;
    const categoria = document.getElementById('categoria').value;
    const preco = document.getElementById('preco').value;
    const quantidade = document.getElementById('quantidade').value;
    const descricao = document.getElementById('descricao').value;

    if (!nome || !preco) {
        alert("Preencha pelo menos Nome e Preco!");
        return;
    }

    const dadosProduto = { nome, categoria, preco, quantidade, descricao };

    try {
        if (idParaEditar) {
            // MODO EDICAO (PUT)
            await fetch(`${API_URL}/${idParaEditar}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosProduto)
            });
        } else {
            // MODO CRIACAO (POST)
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosProduto)
            });
        }

        limparCampos();
        carregarProdutos();

    } catch (erro) {
        console.error("Erro ao salvar:", erro);
        alert("Erro ao salvar.");
    }
}

// --- FUNCAO 3: Deletar ---
async function deletarProduto(id) {
    if (confirm("Tem certeza que deseja excluir?")) {
        try {
            await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            carregarProdutos();
        } catch (erro) {
            console.error("Erro ao deletar:", erro);
        }
    }
}

// --- FUNCAO AUXILIAR: Limpar formulario ---
function limparCampos() {
    document.getElementById('nome').value = '';
    document.getElementById('categoria').value = '';
    document.getElementById('preco').value = '';
    document.getElementById('quantidade').value = '';
    document.getElementById('descricao').value = '';
    
    idParaEditar = null;
    
    // Volta o botao para o estado original (Verde)
    const btn = document.querySelector('.btn-salvar');
    btn.innerHTML = '<span class="material-icons">save</span> Inserir Produto';
    btn.style.backgroundColor = "#2e7d32";
    btn.style.color = "white";
}

// Inicia o carregamento ao abrir
carregarProdutos();


// ======================================================
// --- LOGICA DE PAGAMENTO (FASE 1) ---
// ======================================================

let produtoAtual = {};

function abrirModal(nome, preco) {
    produtoAtual = { nome, preco };
    document.getElementById('pag-nome-produto').innerText = nome;
    document.getElementById('pag-valor-produto').value = parseFloat(preco).toFixed(2);
    
    // Limpa campos do modal
    document.getElementById('pag-cpf').value = '';
    document.getElementById('pag-cartao').value = '';
    document.getElementById('tipo-pagamento').value = 'PIX';
    document.getElementById('area-resultado').style.display = 'none';
    document.getElementById('div-cartao').style.display = 'none';
    
    document.getElementById('modal-pagamento').style.display = 'flex';
}

function fecharModal() {
    document.getElementById('modal-pagamento').style.display = 'none';
}

function alterarFormaPagamento() {
    const tipo = document.getElementById('tipo-pagamento').value;
    const divCartao = document.getElementById('div-cartao');
    
    if (tipo === 'CARTAO') {
        divCartao.style.display = 'block';
    } else {
        divCartao.style.display = 'none';
    }
    document.getElementById('area-resultado').style.display = 'none';
}

async function confirmarPagamento() {
    const tipo = document.getElementById('tipo-pagamento').value;
    const cpf = document.getElementById('pag-cpf').value;
    const ncartao = document.getElementById('pag-cartao').value;
    const valor = document.getElementById('pag-valor-produto').value;
    const nomeComprador = "Aluno Teste"; 

    if(!cpf) { alert('Por favor, digite o CPF!'); return; }
    if(tipo === 'CARTAO' && !ncartao) { alert('Digite o numero do cartao!'); return; }

    const areaResultado = document.getElementById('area-resultado');
    areaResultado.innerHTML = '<p style="color: blue">Processando...</p>';
    areaResultado.style.display = 'block';

    try {
        const res = await fetch('http://localhost:3000/api/pagamento', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome: nomeComprador,
                cpf: cpf,
                ncartao: ncartao,
                valor: valor,
                tipopag: tipo
            })
        });

        const dados = await res.json();

        if (dados.status === 'sucesso') {
            if (dados.modo === 'PIX') {
                areaResultado.innerHTML = `
                    <h4 style="color:green">PIX Gerado!</h4>
                    <div style="background: white; padding: 10px; display: inline-block; border: 1px solid #ddd;">
                        <img src="${dados.imagem}" style="width: 150px;">
                    </div>
                    <p style="font-size: 11px; margin-top:10px; background: #eee; padding: 5px; word-break: break-all;">
                        ${dados.codigo}
                    </p>
                `;
            } else if (dados.modo === 'CARTAO') {
                // VISUAL DE RECIBO DE MAQUININHA 🧾
                // Formata a data atual
                const dataHoje = new Date().toLocaleString('pt-BR');
                
                areaResultado.innerHTML = `
                    <div style="background-color: #fff4ce; color: #333; padding: 15px; font-family: 'Courier New', monospace; border: 1px dashed #999; width: 100%; max-width: 280px; margin: 0 auto; text-align: left; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                        <div style="text-align: center; border-bottom: 1px dashed #999; padding-bottom: 10px; margin-bottom: 10px;">
                            <strong>ESTOQUE & CIA</strong><br>
                            COMPROVANTE DE VENDA
                        </div>
                        <p style="margin: 5px 0; font-size: 12px;">DATA: ${dataHoje}</p>
                        <p style="margin: 5px 0; font-size: 12px;">DOC: ${dados.detalhes}</p>
                        <p style="margin: 5px 0; font-size: 12px;">VALOR: R$ ${valor}</p>
                        <p style="margin: 5px 0; font-size: 12px;">PAGAMENTO: CRÉDITO À VISTA</p>
                        <div style="text-align: center; margin-top: 15px; font-weight: bold;">
                            AUTORIZADO
                        </div>
                    </div>
                    <h4 style="color:green; margin-top: 10px; font-size: 14px;">✅ Transação Aprovada!</h4>
                `;

            } else if (dados.modo === 'BOLETO') {
                // VISUAL DE CÓDIGO DE BARRAS barcode
                areaResultado.innerHTML = `
                    <h4 style="color:#004085; margin-bottom: 10px;">📄 Boleto Gerado</h4>
                    <p style="font-size: 12px; color: #666;">Use o código abaixo para pagar no seu banco:</p>
                    
                    <div style="background: #f8f9fa; padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin: 10px 0; word-break: break-all; font-family: monospace; font-size: 14px; letter-spacing: 1px;">
                        ${dados.detalhes}
                    </div>

                    <div style="height: 40px; background: repeating-linear-gradient(90deg, #333 0, #333 1px, transparent 1px, transparent 3px); width: 80%; margin: 0 auto; opacity: 0.8;"></div>
                    
                    <button onclick="navigator.clipboard.writeText('${dados.detalhes}'); alert('Código copiado!')" style="margin-top: 10px; background: #004085; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        <span class="material-icons" style="font-size: 12px; vertical-align: middle;">content_copy</span> Copiar Código
                    </button>
                `;
            }
        } else {
            areaResultado.innerHTML = `<p style="color: red">Erro: ${dados.error}</p>`;
        }

    } catch (erro) {
        console.error(erro);
        areaResultado.innerHTML = '<p style="color: red">Erro de conexao.</p>';
    }
}

// --- FUNÇÃO DE LOGOUT ---
function sairDoSistema() {
    // 1. Remove a chave de autenticação do armazenamento local
    localStorage.removeItem('usuarioLogado');

    // 2. Redireciona o usuário para a tela de login
    window.location.href = 'login.html';
}