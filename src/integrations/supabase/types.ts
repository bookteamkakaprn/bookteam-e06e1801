// Enums
export type AppRole = 'admin' | 'participante';
export type EventoStatus = 'aberto' | 'fechado' | 'cancelado' | 'realizado';
export type InscricaoStatus = 'aguardando_pagamento' | 'confirmada' | 'cancelada' | 'lista_espera';
export type LivroStatus = 'ativo' | 'arquivado';
export type MaterialTipo = 'pdf' | 'video' | 'link';
export type PagamentoStatus = 'aguardando' | 'aprovado' | 'rejeitado';
export type ParticipanteCRMStatus = 'lead' | 'inscrito' | 'pago' | 'participando' | 'concluido' | 'inativo';
export type TrilhaStatus = 'ativa' | 'arquivada';

// Participante
export interface Participante {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  whatsapp?: string;
  cpf?: string;
  cidade?: string;
  estado?: string;
  nascimento?: string;
  foto_url?: string;
  aceite_lgpd: boolean;
  status: ParticipanteCRMStatus;
  como_conheceu?: string;
  igreja?: string;
  observacoes_admin?: string;
  created_at: string;
  updated_at: string;
  ultimo_acesso?: string;
}

// Trilha
export interface Trilha {
  id: string;
  nome: string;
  descricao?: string;
  imagem_url?: string;
  cor?: string;
  status: TrilhaStatus;
  created_at: string;
  updated_at: string;
}

// Livro
export interface Livro {
  id: string;
  trilha_id: string;
  titulo: string;
  autor?: string;
  descricao?: string;
  imagem_url?: string;
  status: LivroStatus;
  ordem: number;
  categoria?: string;
  competencias?: string;
  conteudo_programatico?: string;
  objetivo?: string;
  publico_alvo?: string;
  duracao?: string;
  qtd_encontros?: number;
  professor?: string;
  coordenador?: string;
  material_necessario?: string;
  datas_curso?: string;
  horario?: string;
  sala?: string;
  turma?: string;
  ano?: number;
  valor?: number;
  vagas_total: number;
  vagas_restantes?: number;
  inscritos: number;
  created_at: string;
  updated_at: string;
}

// Evento
export interface Evento {
  id: string;
  livro_id?: string;
  titulo: string;
  descricao?: string;
  imagem_url?: string;
  data: string;
  hora?: string;
  cidade?: string;
  local?: string;
  vagas: number;
  valor: number;
  status: EventoStatus;
  pix_chave?: string;
  pix_copia_cola?: string;
  pix_qrcode_url?: string;
  created_at: string;
  updated_at: string;
}

// Inscrição
export interface Inscricao {
  id: string;
  participante_id: string;
  evento_id?: string;
  turma_id?: string;
  status: InscricaoStatus;
  codigo?: string;
  created_at: string;
  updated_at: string;
}

// Pagamento
export interface Pagamento {
  id: string;
  inscricao_id: string;
  participante_id: string;
  evento_id?: string;
  turma_id?: string;
  valor: number;
  status: PagamentoStatus;
  comprovante_url?: string;
  observacao?: string;
  aprovado_em?: string;
  aprovado_por?: string;
  created_at: string;
  updated_at: string;
}

// Presença
export interface Presenca {
  id: string;
  inscricao_id: string;
  participante_id: string;
  evento_id: string;
  presente: boolean;
  horario_checkin?: string;
  registrado_por?: string;
  created_at: string;
}

// Certificado
export interface Certificado {
  id: string;
  participante_id: string;
  evento_id: string;
  livro_id?: string;
  carga_horaria: number;
  data_emissao: string;
  assinatura?: string;
  pdf_url?: string;
  created_at: string;
}

// Material
export interface Material {
  id: string;
  livro_id: string;
  tipo: MaterialTipo;
  titulo: string;
  url: string;
  created_at: string;
}

// Turma
export interface Turma {
  id: string;
  livro_id: string;
  nome: string;
  status: string;
  data_inicio?: string;
  data_fim?: string;
  professor?: string;
  coordenador?: string;
  staff?: string;
  horario?: string;
  sala?: string;
  vagas_max: number;
  vagas_restantes?: number;
  inscritos: number;
  valor?: number;
  temporada?: string;
  ano?: number;
  created_at: string;
  updated_at: string;
}

// UserRole
export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

// Histórico de Livros
export interface HistoricoLivros {
  id: string;
  participante_id: string;
  livro_id: string;
  data_conclusao: string;
  observacao?: string;
  created_at: string;
}

// Observação
export interface Observacao {
  id: string;
  participante_id: string;
  autor_id: string;
  texto: string;
  created_at: string;
}

// Configuração Pagamento
export interface ConfiguracaoPagamento {
  id: string;
  pix_chave?: string;
  pix_copia_cola?: string;
  pix_qrcode_url?: string;
  tipo_chave?: string;
  beneficiario?: string;
  banco?: string;
  instrucoes?: string;
  created_at: string;
  updated_at: string;
}

// Notificação
export interface Notificacao {
  id: string;
  participante_id: string;
  canal: string;
  assunto?: string;
  mensagem: string;
  enviada: boolean;
  enviada_em?: string;
  created_at: string;
}
