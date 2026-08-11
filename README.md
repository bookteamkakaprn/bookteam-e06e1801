# bteam-versao2

# CONTEXTO

Crie uma plataforma web completa chamada **Book Clube**, desenvolvida no Lovable utilizando Supabase como banco de dados, autenticação e armazenamento de arquivos.

O objetivo é substituir totalmente o controle manual feito por WhatsApp, papel e planilhas, centralizando inscrições, pagamentos, participantes, trilhas de leitura, eventos e administração em um único sistema.

A plataforma deve ser moderna, responsiva, intuitiva e muito simples para usuários que possuem pouca familiaridade com tecnologia.

Utilizar:

- Lovable

- Supabase

- Supabase Auth

- Supabase Storage

- Row Level Security (RLS)

- Design responsivo

- Interface limpa

- Componentes modernos

- Dashboard administrativo

--------------------------------------------------

# TIPOS DE USUÁRIOS

## Administrador

Pode:

- Criar eventos

- Editar eventos

- Cancelar eventos

- Criar Trilhas

- Criar Livros

- Aprovar pagamentos

- Visualizar comprovantes

- Gerenciar participantes

- Gerenciar presença

- Emitir certificados

- Visualizar dashboard

- Exportar listas

---

## Participante

Pode:

Criar conta

Fazer login

Editar perfil

Escolher trilhas

Inscrever-se em eventos

Enviar comprovante PIX

Visualizar inscrições

Visualizar pagamentos

Visualizar certificados

Acompanhar seu progresso

Ver próximos eventos

--------------------------------------------------

# LANDING PAGE

Criar uma landing page institucional contendo:

Hero

Nome Book Clube

Subtítulo

Botão:

"Quero participar"

Sessão

Como funciona

1

Escolha uma trilha

↓

2

Inscreva-se

↓

3

Faça o pagamento via PIX

↓

4

Participe do encontro

↓

5

Continue sua jornada

Sessão

Trilhas

Cards das trilhas

Sessão

Próximos encontros

Mostrar automaticamente os eventos futuros.

Sessão

Depoimentos

Sessão

Perguntas frequentes

Rodapé

Contato

Instagram

WhatsApp

--------------------------------------------------

# CADASTRO

Campos

Nome

CPF

Email

Telefone

Cidade

Estado

Senha

Aceite LGPD

Após cadastro

Criar automaticamente o participante.

--------------------------------------------------

# LOGIN

Email

Senha

Esqueci minha senha

--------------------------------------------------

# PERFIL

Nome

Foto

Telefone

Cidade

Estado

Data de cadastro

Trilha atual

Livros concluídos

Eventos realizados

Certificados

--------------------------------------------------

# TRILHAS

Administrador poderá cadastrar:

Nome

Descrição

Imagem

Cor

Status

Cada trilha possui diversos livros.

Exemplo

Trilha Liderança

Livro 1

Livro 2

Livro 3

Livro 4

Livro 5

O sistema deverá saber automaticamente em qual livro o participante está.

--------------------------------------------------

# LIVROS

Cadastrar:

Título

Autor

Imagem

Descrição

Ordem

Material complementar

PDF

Vídeo

Status

--------------------------------------------------

# EVENTOS

Administrador cria eventos.

Campos

Título

Livro relacionado

Descrição

Imagem

Cidade

Local

Data

Hora

Valor

Número de vagas

Status

Aberto

Fechado

Cancelado

Mostrar quantidade de vagas restantes.

--------------------------------------------------

# INSCRIÇÃO

Fluxo

Participante escolhe evento

↓

Clique

Inscrever-se

↓

Sistema cria inscrição

↓

Status

Aguardando pagamento

--------------------------------------------------

# PAGAMENTO PIX

NÃO UTILIZAR CARTÃO.

Cada evento terá:

Valor

QRCode PIX

Código copia e cola

Chave PIX

Após pagamento

Botão

"Enviar comprovante"

Upload:

PDF

PNG

JPEG

Salvar arquivo no Supabase Storage.

Criar registro no banco.

Status

Aguardando conferência

--------------------------------------------------

# APROVAÇÃO

Administrador visualizará

Lista de pagamentos

Nome

Evento

Valor

Data

Comprovante

Botões

Aprovar

Rejeitar

Ao aprovar

Status:

Pagamento aprovado

Inscrição confirmada

--------------------------------------------------

# CRM

Criar CRM completo.

Cada participante deverá possuir:

Nome

Telefone

Email

Cidade

CPF

Data cadastro

Último acesso

Status

Lead

Inscrito

Pago

Participando

Concluído

Inativo

Trilha atual

Livro atual

Eventos

Pagamentos

Certificados

Observações

Filtros

Cidade

Trilha

Status

Evento

Pesquisar

--------------------------------------------------

# DASHBOARD

Cards

Participantes

Eventos futuros

Eventos realizados

Pagamentos pendentes

Pagamentos aprovados

Receita

Participantes ativos

Gráfico

Inscrições por mês

Receita por mês

Participantes por trilha

--------------------------------------------------

# PRESENÇA

Criar tela

Lista de inscritos

Check-in

Botão

Presente

Ausente

Registrar horário

--------------------------------------------------

# CERTIFICADOS

Após presença

Administrador poderá gerar certificado.

Campos

Nome

Evento

Livro

Carga horária

Data

Assinatura

Participante poderá baixar em PDF.

--------------------------------------------------

# ÁREA DO PARTICIPANTE

Dashboard contendo

Próximo evento

Minha trilha

Livro atual

Próximo livro

Histórico

Pagamentos

Certificados

Materiais

--------------------------------------------------

# BANCO DE DADOS

Criar as tabelas:

usuarios

participantes

trilhas

livros

eventos

inscricoes

pagamentos

presencas

certificados

materiais

observacoes

Criar relacionamentos entre todas as tabelas.

--------------------------------------------------

# STORAGE

Criar buckets

comprovantes

certificados

materiais

perfil

--------------------------------------------------

# AUTENTICAÇÃO

Supabase Auth

Administrador

Participante

Controle de permissões utilizando RLS.

--------------------------------------------------

# NOTIFICAÇÕES

Preparar estrutura para futuras integrações com:

WhatsApp

Email

Push

Ainda não implementar envio automático, apenas deixar arquitetura preparada.

--------------------------------------------------

# EXPORTAÇÃO

Administrador poderá exportar:

Participantes

Inscrições

Pagamentos

Presenças

Certificados

Formato

Excel

CSV

PDF

--------------------------------------------------

# PAINEL ADMINISTRATIVO

Menu lateral

Dashboard

Participantes

CRM

Trilhas

Livros

Eventos

Inscrições

Pagamentos

Presenças

Certificados

Relatórios

Configurações

--------------------------------------------------

# EXPERIÊNCIA DO USUÁRIO

Toda navegação deve ser extremamente simples.

Objetivos:

• Poucos cliques.

• Interface limpa.

• Funcionar perfeitamente no celular.

• Pesquisa rápida.

• Carregamento rápido.

• Componentes modernos.

• Feedback visual para todas as ações.

• Confirmações antes de excluir registros.

• Paginação em listas grandes.

• Busca em tempo real.

• Filtros inteligentes.

--------------------------------------------------

# ARQUITETURA

Criar código organizado.

Separar:

Pages

Components

Hooks

Services

Types

Utils

Contexts

Criar componentes reutilizáveis.

Seguir boas práticas de React, TypeScript e Supabase.

Preparar a aplicação para crescimento futuro sem necessidade de reestruturação.

O sistema deverá ser escalável, seguro, intuitivo e pronto para receber futuras integrações como API PIX automática, WhatsApp Oficial, aplicativo mobile e gamificação das trilhas de leitura.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://bookteam.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cd8e1775-5dbb-4228-a2ef-0f98048323d0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
