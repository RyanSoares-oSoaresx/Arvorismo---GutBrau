-- SCHEMA DE BANCO DE DADOS - GUTBRAU ESCALAS
-- Copie e cole este script no Editor SQL do seu projeto Supabase para criar a estrutura do banco de dados.

-- 1. Criar tabela de colaboradores
CREATE TABLE IF NOT EXISTS colaboradores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    telefone TEXT,
    funcao_padrao TEXT DEFAULT 'Atendimento',
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar Row Level Security (RLS) se desejado.
-- Para facilidade inicial, as regras de RLS podem ser simplificadas ou desativadas.
ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;

-- 2. Criar tabela de escalas
CREATE TABLE IF NOT EXISTS escalas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_inicio DATE NOT NULL, -- Segunda-feira da semana correspondente
    data_fim DATE NOT NULL,    -- Domingo da semana correspondente
    publicada BOOLEAN NOT NULL DEFAULT false,
    sabado_cancelado BOOLEAN NOT NULL DEFAULT false,
    domingo_cancelado BOOLEAN NOT NULL DEFAULT false,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE escalas ENABLE ROW LEVEL SECURITY;

-- 3. Criar tabela de itens de escala
CREATE TABLE IF NOT EXISTS escala_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escala_id UUID REFERENCES escalas(id) ON DELETE CASCADE NOT NULL,
    colaborador_id UUID REFERENCES colaboradores(id) ON DELETE CASCADE NOT NULL,
    data DATE NOT NULL, -- Dia específico do turno (ex: sábado, domingo)
    turno TEXT NOT NULL, -- Horário de trabalho (ex: '10:00 - 18:00')
    funcao TEXT NOT NULL, -- Função exercida naquele dia (ex: 'Caixa')
    treinamento BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE escala_itens ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE SEGURANÇA (RLS)
-- Como a visão do colaborador é pública (qualquer pessoa com o link pode visualizar),
-- habilitamos leitura pública para tabelas. 
-- As inserções/edições serão protegidas pela verificação da senha admin.

-- Políticas para Colaboradores
DROP POLICY IF EXISTS "Permitir leitura pública de colaboradores" ON colaboradores;
CREATE POLICY "Permitir leitura pública de colaboradores" ON colaboradores
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir modificação total de colaboradores (Admin)" ON colaboradores;
CREATE POLICY "Permitir modificação total de colaboradores (Admin)" ON colaboradores
    FOR ALL USING (true); -- Controle feito via chave de API no backend

-- Políticas para Escalas
DROP POLICY IF EXISTS "Permitir leitura pública de escalas" ON escalas;
CREATE POLICY "Permitir leitura pública de escalas" ON escalas
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir modificação total de escalas (Admin)" ON escalas;
CREATE POLICY "Permitir modificação total de escalas (Admin)" ON escalas
    FOR ALL USING (true);

-- Políticas para Itens da Escala
DROP POLICY IF EXISTS "Permitir leitura pública de itens da escala" ON escala_itens;
CREATE POLICY "Permitir leitura pública de itens da escala" ON escala_itens
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir modificação de itens da escala (Admin)" ON escala_itens;
CREATE POLICY "Permitir modificação de itens da escala (Admin)" ON escala_itens
    FOR ALL USING (true);

-- 5. DADOS INICIAIS (SEED) - Lista de Colaboradores Reais da GutBrau
INSERT INTO colaboradores (nome, telefone, funcao_padrao) VALUES
('André Rechia', '', 'Monitor'),
('Claufer Scurra', '', 'Monitor'),
('Guilherme Aguilhera', '', 'Resgatista'),
('Leandro', '', 'Monitor'),
('Adilson Corrêa Macêdo', '+55 47 9690-9398', 'Monitor'),
('Adrian', '+55 79 8160-4431', 'Monitor'),
('Ana Julia', '+55 47 9691-1349', 'Monitor'),
('Andreia Gutknecht', '+55 47 9132-4981', 'Caixa'),
('Arthur S.', '+55 47 8883-8392', 'Monitor'),
('Barcelar', '+55 11 99282-9529', 'Monitor'),
('Davi', '+55 47 9245-7850', 'Monitor'),
('Djonatan Alves', '+55 47 9650-7594', 'Monitor'),
('Gabriel', '+55 47 9140-3058', 'Monitor'),
('Gabriel Rosa', '+55 47 9643-5644', 'Resgatista'),
('Helo', '+55 47 8499-2868', 'Monitor'),
('Henrique Saragoça', '+55 47 8802-4156', 'Monitor'),
('Jordão Rafael', '+55 47 9151-1738', 'Resgatista'),
('Karoline', '+55 47 8850-8894', 'Monitor'),
('Mohrr', '+55 47 9908-2394', 'Monitor'),
('Nicole Kaiser', '+55 47 9236-6921', 'Monitor'),
('Você (Supervisor)', '+55 47 9994-6760', 'Monitor'),
('Vitor', '+55 47 9914-0659', 'Monitor'),
('Vitor Hugo Wielewski', '+55 47 9997-2848', 'Resgatista'),
('Victor', '+55 47 8838-7696', 'Monitor'),
('Ryan', '', 'Resgatista'),
('Paulo', '', 'Monitor')
ON CONFLICT DO NOTHING;
