# PokeDex — Projeto Front-End (HTML + CSS + JS)

Projeto estático consumindo **[PokeAPI](https://pokeapi.co/)** com **Fetch API** e **manipulação do DOM** (createElement, appendChild, etc.).
Atende os requisitos de:
- HTML + CSS puro (sem frameworks)
- JavaScript com `fetch`
- Cards gerados dinamicamente (nome, imagem, status/descrição — aqui: tipos e stats)

## Como rodar
1. Baixe o ZIP ou clone os arquivos.
2. Abra `index.html` no navegador. (Se der problema de CORS em alguns navegadores, use uma extensão de *Live Server* ou rode `python -m http.server` na pasta e acesse `http://localhost:8000`.)

## Estrutura
- `index.html` — marcação e componentes principais
- `styles.css` — layout responsivo e tema
- `app.js` — consumo da API e criação dinâmica dos cards

## Expansões sugeridas
- Modal com detalhes (habilidades, movimentos, evolução)
- Paginação/infinite scroll
- Cache em `localStorage` e *retry* com *exponential backoff*
