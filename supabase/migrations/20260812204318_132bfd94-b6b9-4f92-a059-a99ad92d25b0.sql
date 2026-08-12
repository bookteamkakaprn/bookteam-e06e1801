UPDATE public.configuracoes_pagamento
SET beneficiario = 'Ruth',
    tipo_chave = 'telefone',
    pix_chave = '41 99213-4801',
    pix_copia_cola = COALESCE(pix_copia_cola, '41992134801'),
    instrucoes = COALESCE(instrucoes, 'Faça o PIX para a chave (telefone) 41 99213-4801 — Pix da Ruth — e envie o comprovante nesta tela.'),
    updated_at = now();