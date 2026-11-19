# Plano — transmissão ao vivo e feed de lives

## O que será feito
- Criar uma sala de live profissional com captura de câmara e microfone, vídeo e áudio em tempo real, controlos para anfitrião e visualizadores, e encerramento seguro.
- Reutilizar os registos e a sinalização autenticada já existentes; estabelecer ligações WebRTC entre anfitrião e cada visualizador, com TURN quando disponível.
- Permitir abrir e partilhar a live em `/live-nomedousuario`, resolvendo o nome de utilizador e mostrando a sala ativa.
- Acrescentar ao feed uma faixa atualizada em tempo real com transmissões ativas, anel animado e entrada direta na sala; incluir acesso para iniciar uma live.
- Atualizar a lista de trabalho e documentar a decisão estrutural do módulo de transmissão.

## Validação
- Confirmar compilação e verificar no preview a faixa do feed, a sala/estado sem transmissão e o fluxo de permissão e início da câmara quando disponível.
- A transmissão entre dispositivos só pode ser confirmada com dois utilizadores autenticados e permissões de câmara/microfone; a rede e o TURN também afetam a conectividade.

## Nota técnica
A primeira versão usa WebRTC direto entre anfitrião e visualizadores, sem serviço de vídeo externo; a capacidade aumenta menos bem que numa infraestrutura SFU dedicada.
