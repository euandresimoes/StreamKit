# Decisões pendentes — Batch 27

Estas decisões precisam ser fechadas antes das tasks que alteram o comportamento de campanha:

- quais tipos entram por padrão: pagamento, mensagem, assinatura e cancelamento;
- se o valor mínimo, moeda e pagamentos sinalizados/retidos bloqueiam a contribuição;
- se a contribuição entra automaticamente ou passa por aprovação manual;
- se uma mesma referência pode gerar mais de uma entrada em campanhas diferentes;
- política de retenção e exibição da mensagem do doador;
- comportamento quando o nome escolhido pelo doador está vazio, é alterado ou não corresponde a
  nenhum handle da plataforma global;
- janela de reconciliação e limpeza de webhooks órfãos;
- escopos OAuth definitivos após criação do app LivePix.

Até essas decisões serem respondidas, o provider pode ser implementado com ingestão, normalização,
diagnóstico e testes, mas não deve ativar automaticamente participantes em campanhas reais.
