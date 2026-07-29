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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE escala_itens ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE SEGURANÇA (RLS)
-- Como a visão do colaborador é pública (qualquer pessoa com o link pode visualizar),
-- habilitamos leitura pública para tabelas. 
-- As inserções/edições serão protegidas pela verificação da senha admin.

-- Políticas para Colaboradores
CREATE POLICY "Permitir leitura pública de colaboradores" ON colaboradores
    FOR SELECT USING (true);

CREATE POLICY "Permitir modificação total de colaboradores (Admin)" ON colaboradores
    FOR ALL USING (true); -- Controle feito via chave de API no backend

-- Políticas para Escalas
CREATE POLICY "Permitir leitura pública de escalas" ON escalas
    FOR SELECT USING (true);

CREATE POLICY "Permitir modificação total de escalas (Admin)" ON escalas
    FOR ALL USING (true);

-- Políticas para Itens da Escala
CREATE POLICY "Permitir leitura pública de itens da escala" ON escala_itens
    FOR SELECT USING (true);

CREATE POLICY "Permitir modificação de itens da escala (Admin)" ON escala_itens
    FOR ALL USING (true);

-- 5. DADOS INICIAIS (SEED) - Opcional para testes rápidos
INSERT INTO colaboradores (nome, telefone, funcao_padrao) VALUES
('João Silva', '(47) 99999-1111', 'Caixa'),
('Maria Santos', '(47) 99999-2222', 'Atendimento'),
('Pedro Souza', '(47) 99999-3333', 'Cozinha'),
('Ana Oliveira', '(47) 99999-4444', 'Bar'),
('Carlos Pereira', '(47) 99999-5555', 'Churrasqueiro'),
('Beatriz Lima', '(47) 99999-6666', 'Atendimento')
ON CONFLICT DO NOTHING;
