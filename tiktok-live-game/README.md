# Live Arena — jogo interativo para TikTok

Projeto inicial de jogo para live vertical, com personagem animado em CSS, três personagens selecionáveis, voz em português pelo navegador, feed de eventos e backend Node.js para receber eventos da live.

## Requisitos

- Windows 10/11
- Node.js 20 ou superior
- Uma conta TikTok que esteja ao vivo para testar a conexão real

## Instalação no Windows

1. Instale o Node.js LTS em https://nodejs.org/.
2. Abra a pasta `tiktok-live-game` no terminal.
3. Execute `npm install`.
4. Copie `.env.example` para um arquivo chamado `.env`.
5. No `.env`, preencha `TIKTOK_USERNAME=seu_usuario` sem o @.
6. Execute `npm start`.
7. Abra http://localhost:3000 no navegador.
8. Inicie a live no TikTok e clique em **Conectar à live**.

## Importante sobre a conexão

A integração utiliza a biblioteca comunitária `tiktok-live-connector`, não uma API oficial de leitura de chat do TikTok. Ela pode parar de funcionar quando o TikTok muda seus sistemas, e a conexão pode falhar se a conta não estiver ao vivo, se o usuário estiver incorreto ou se houver restrições. É necessário testar com a sua conta e transmissão reais. O botão de conexão do navegador solicita ao servidor a conexão; o servidor usa o usuário definido no `.env`.

A voz usa a síntese de fala disponível no navegador. As vozes instaladas variam por sistema e navegador. Para que o público da live ouça a voz, o áudio do navegador precisa estar incluído na captura/transmissão do TikTok Live Studio.

## Comandos de chat implementados

- Mensagens contendo `oi` ou `olá`: o personagem cumprimenta.
- `pula`: o personagem salta.
- `dança`: o personagem dança.
- Com **Ler todos os comentários** ativado, o jogo fala os comentários recebidos.
- Presentes e novos seguidores geram mensagens de agradecimento quando esses eventos são disponibilizados pela biblioteca.

## Estrutura

- `server.js`: servidor HTTP, Socket.IO e conexão de live.
- `public/index.html`: interface.
- `public/style.css`: visual e animações do personagem.
- `public/game.js`: reações, fala e controles.
- `.env.example`: exemplo de configuração sem credenciais.

## Observação

Este é um protótipo funcional inicial, não uma cópia do LiveCade. Os personagens atuais são estilizados em CSS, não modelos 3D reais. O teste de comentários sem conexão usa o botão de simulação.
