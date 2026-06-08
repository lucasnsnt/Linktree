# Linktree

Este projeto é um Linktree personalizado desenvolvido em React + Vite, com o objetivo de centralizar e direcionar visitantes para todas as minhas redes sociais, portfólio, GitHub, LinkedIn, Instagram e outros links relevantes.

## Funcionalidades

- Interface moderna e responsiva
- Links para todas as redes sociais principais
- Status dinamico por horario com fallback automatico
- Frase de "codando" quando ha commit recente no GitHub
- Integracao com Spotify via serverless function (`/api/spotify`)
- Deploy recomendado na Vercel
- Domínio personalizado: [links.lucasnsnt.ink](https://links.lucasnsnt.ink)

## Tecnologias

- React
- Vite
- TailwindCSS
- shadcn/ui

## Configuracao do Spotify

Configure estas variaveis no projeto da Vercel:

```bash
SPOTIFY_REFRESH_TOKEN=seu_refresh_token
SPOTIFY_CLIENT_ID=seu_client_id
SPOTIFY_CLIENT_SECRET=seu_client_secret
```

A function em [api/spotify.js](api/spotify.js) troca o refresh token por access token no servidor e o frontend consome diretamente [ /api/spotify ] sem expor segredo no cliente.

---
Desenvolvido por Lucas Santos — [lucasnsnt](https://github.com/lucasnsnt)
