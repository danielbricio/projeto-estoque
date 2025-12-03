const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const QRCode = require('qrcode');
// --- MÓDULO DE CRIPTOGRAFIA (NOVIDADE) ---
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

// --- ROTA DE PAGAMENTO (MANTIDA) ---
app.post('/api/pagamento', async (req, res) => {
    const { nome, cpf, ncartao, valor, tipopag } = req.body;
    console.log(`💳 Processando: ${tipopag} | Valor: ${valor}`);

    try {
        const params = new URLSearchParams();
        params.append('nome', nome);
        params.append('cpf', cpf);
        params.append('ncartao', ncartao || '');
        params.append('valor', valor);
        params.append('tipopag', tipopag);

        const response = await axios.post('http://www.datse.com.br/dev/syncpix.php', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const dadosAPI = response.data;
        
        let respostaFinal = {
            status: 'sucesso',
            mensagem: dadosAPI.msg,
            modo: dadosAPI.modo
        };

        if (dadosAPI.modo === 'PIX') {
            const imagemGerada = await QRCode.toDataURL(dadosAPI.id);
            respostaFinal.imagem = imagemGerada;
            respostaFinal.codigo = dadosAPI.id;
        } else {
            respostaFinal.detalhes = dadosAPI.id; 
        }
        res.json(respostaFinal);

    } catch (error) {
        console.error("Erro na API Pagamento:", error.message);
        res.status(500).json({ error: "Erro no pagamento." });
    }
});

// --- ROTA DE LOGIN (TRABALHO 2 - NOVIDADE) ---
app.post('/api/login', async (req, res) => {
    const { usuario, senha, usarCriptografia } = req.body;
    let senhaFinal = senha;
    let urlAlvo = 'http://www.datse.com.br/dev/syncjava.php'; // URL Padrão

    console.log(`🔐 Tentativa de Login: ${usuario} | Cripto: ${usarCriptografia}`);

    try {
        // Se o usuário marcou o checkbox, usamos a rota 2 e criptografamos
        if (usarCriptografia) {
            urlAlvo = 'http://www.datse.com.br/dev/syncjava2.php'; //
            
            // Lógica de Criptografia AES (Igual ao Java do Professor)
            // Chave: "1234567890123456"
            const key = '1234567890123456'; 
            const cipher = crypto.createCipheriv('aes-128-ecb', key, null);
            let encrypted = cipher.update(senha, 'utf8', 'base64');
            encrypted += cipher.final('base64');
            
            senhaFinal = encrypted;
            console.log(`🔑 Senha Criptografada: ${senhaFinal}`);
        }

        // Envia para a API do Professor
        const params = new URLSearchParams();
        params.append('usuario', usuario); //
        params.append('senha', senhaFinal); //

        const response = await axios.post(urlAlvo, params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        // Retorna a resposta da API do professor para o nosso frontend
        // O Java apenas exibia o texto retornado no 'tretorno'
        console.log("Resposta da API Login:", response.data);
        res.json(response.data);

    } catch (error) {
        console.error("Erro no Login:", error.message);
        res.status(500).json({ status: "erro", msg: "Falha na conexão com API de Login" });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando! http://localhost:${PORT}`);
});