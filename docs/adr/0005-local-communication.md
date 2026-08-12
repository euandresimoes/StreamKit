# ADR 0005 — Comunicação local e proteção da API

**Status:** aceita  
**Data:** 2026-08-12  
**Responsáveis:** André Simões  
**Especificação:** seções 9.5, 12, 19 e 25  
**Batches:** 0 e 2

## Decisão

- HTTP em `127.0.0.1` e porta dinâmica para casos de uso/OpenAPI.
- Server-Sent Events para notificações reativas inicialmente; WebSocket somente se overlays futuros exigirem comunicação bidirecional.
- IPC apenas para capacidades nativas do Electron e bridge mínima tipada.
- Token bearer aleatório de 256 bits por sessão, entregue por bridge restrita, além de validação de origem/canal e encerramento do backend junto ao app.

## Consequências

A API permanece documentável e testável. O token é efêmero, nunca persistido/logado, e reduz chamadas de processos locais não autorizados.

## Validação e reversão

Testar bind exclusivo em loopback, porta imprevisível, ausência/rejeição de token, origem inválida e encerramento. Contratos de caso de uso não dependem do transporte.
