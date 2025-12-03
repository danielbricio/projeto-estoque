const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const QRCode = require('qrcode');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); 

// --- Configuração do Banco de Dados ---
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error('Erro no banco:', err.message); 
    else console.log('Conectado ao banco de dados SQLite.'); 
});

db.run(`CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT, categoria TEXT, preco REAL, quantidade INTEGER, descricao TEXT
)`);

// --- ROTAS DO CRUD (MANTIDAS) ---
app.get('/api/produtos', (req, res) => {
    db.all("SELECT * FROM produtos", [], (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});

app.post('/api/produtos', (req, res) => {
    const { nome, categoria, preco, quantidade, descricao } = req.body;
    db.run(`INSERT INTO produtos (nome, categoria, preco, quantidade, descricao) VALUES (?, ?, ?, ?, ?)`, 
    [nome, categoria, preco, quantidade, descricao], function(err) {
        if (err) return res.status(500).json({error: err.message});
        res.json({ id: this.lastID, message: "Produto salvo!" });
    });
});

app.put('/api/produtos/:id', (req, res) => {
    const { nome, categoria, preco, quantidade, descricao } = req.body;
    const { id } = req.params;
    const sql = `UPDATE produtos SET nome = ?, categoria = ?, preco = ?, quantidade = ?, descricao = ? WHERE id = ?`;
    db.run(sql, [nome, categoria, preco, quantidade, descricao, id], function(err) {
        if (err) return res.status(500).json({error: err.message});
        res.json({ message: "Produto atualizado com sucesso!" });
    });
});

app.delete('/api/produtos/:id', (req, res) => {
    db.run("DELETE FROM produtos WHERE id = ?", req.params.id, function(err) {
        if (err) return res.status(500).json({error: err.message});
        res.json({ message: "Deletado com sucesso" });
    });
});

// --- ROTA DE PAGAMENTO  ---
app.post('/api/pagamento', async (req, res) => {
    const { nome, cpf, ncartao, valor, tipopag } = req.body;
    
    console.log("\n==================================================");
    console.log(`💳 INICIANDO PAGAMENTO: ${tipopag}`);
    console.log(`👤 Cliente: ${nome} | CPF: ${cpf} | Valor: R$ ${valor}`);

    try {
        // Converte o JSON para o formato x-www-form-urlencoded, requerido pela API de pagamento.
        const params = new URLSearchParams();
        params.append('nome', nome);
        params.append('cpf', cpf);
        params.append('ncartao', ncartao || '');
        params.append('valor', valor);
        params.append('tipopag', tipopag);

        // Realiza a chamada POST para o endpoint externo do gateway de pagamento.
        const response = await axios.post('http://www.datse.com.br/dev/syncpix.php', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const dadosAPI = response.data;

        console.log("RESPOSTA DA API");
        console.log(JSON.stringify(dadosAPI, null, 2)); // O "2" deixa bonito com indentação
        console.log("==================================================\n");
        
        let respostaFinal = {
            status: 'sucesso',
            mensagem: dadosAPI.msg,
            modo: dadosAPI.modo
        };

        // Trata a resposta da API com base no método de pagamento.
        if (dadosAPI.modo === 'PIX') {
            // Para PIX, gera uma imagem QR Code (Base64) a partir do payload retornado.
            const imagemGerada = await QRCode.toDataURL(dadosAPI.id);
            respostaFinal.imagem = imagemGerada;
            respostaFinal.codigo = dadosAPI.id;
        } else {
            // Para Cartão/Boleto, repassa o ID da transação retornado pelo gateway.
            respostaFinal.detalhes = dadosAPI.id; 
        }
        res.json(respostaFinal);

    } catch (error) {
        console.error("Erro na API Pagamento:", error.message);
        res.status(500).json({ error: "Erro no pagamento." });
    }
});

// --- ROTA DE LOGIN ---
app.post('/api/login', async (req, res) => {
    const { usuario, senha, usarCriptografia } = req.body;
    let senhaFinal = senha;
    let urlAlvo = 'http://www.datse.com.br/dev/syncjava.php'; 

    console.log("\n==================================================");
    console.log(`🔐 TENTATIVA DE LOGIN: ${usuario}`);
    console.log(`⚙️  Modo Criptografia: ${usarCriptografia ? 'ATIVADO (AES)' : 'DESATIVADO'}`);

    try {
        // Se a criptografia estiver ativa, a senha é processada antes do envio.
        if (usarCriptografia) {
            urlAlvo = 'http://www.datse.com.br/dev/syncjava2.php'; 
            
            const key = '1234567890123456'; 
            // Utiliza o módulo 'crypto' para criar uma cifra AES-128-ECB.
            const cipher = crypto.createCipheriv('aes-128-ecb', key, null);
            let encrypted = cipher.update(senha, 'utf8', 'base64');
            encrypted += cipher.final('base64');
            
            senhaFinal = encrypted;
            console.log(`🔑 Senha Criptografada (Enviada): ${senhaFinal}`);
        }

        // Prepara os dados para envio no formato x-www-form-urlencoded.
        const params = new URLSearchParams();
        params.append('usuario', usuario);
        params.append('senha', senhaFinal);

        // Envia a requisição de login para a API de autenticação.
        const response = await axios.post(urlAlvo, params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        console.log("RESPOSTA DA API:");
        // Imprime o objeto inteiro que veio da API
        console.log(response.data); 
        console.log("==================================================\n");

        res.json(response.data);

    } catch (error) {
        console.error("Erro no Login:", error.message);
        res.status(500).json({ status: "erro", msg: "Falha na conexão com API de Login" });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando! http://localhost:${PORT}`);
});