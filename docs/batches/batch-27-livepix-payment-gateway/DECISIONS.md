# Decisões pendentes — Batch 27

Decisões fechadas para a implementação:

- somente pagamentos recebidos entram como contribuição;
- cada torneio/sorteio define um valor mínimo estritamente maior que zero;
- a entrada automática é configurável por campanha;
- pagamento sem correspondência de identidade fica pendente para resolução manual;
- pagamentos abaixo do mínimo, duplicados ou sem identidade não geram entrada automática;
- pagamentos em moeda diferente da moeda configurada pela campanha ficam pendentes/rejeitados com
  motivo visível, sem conversão implícita.

Continuam dependentes da configuração do app LivePix e do contrato oficial: escopos OAuth definitivos,
janela de reconciliação de webhooks e retenção de mensagens financeiras.
