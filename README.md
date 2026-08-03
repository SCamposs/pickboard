# PickBoard

PickBoard é um aplicativo desktop local para montar drafts manuais de League of Legends, organizar pools pessoais de campeões e copiar prompts prontos para um assistente de IA.

O aplicativo foi criado diretamente na raiz deste repositório com Tauri 2, React, TypeScript, Vite e Tailwind CSS. Não existe backend, autenticação, telemetria, banco remoto ou dependência de internet durante o uso normal.

## Recursos

- Picks para TOP, JG, MID, ADC e SUP nos dois times, preenchidos em qualquer ordem.
- Cinco bans independentes por time, com validações contra picks e duplicações.
- Seletor lateral com busca sem acento, espaço, hífen ou apóstrofo e aliases como `ww`, `noc`, `tk`, `morde` e `kaisa`.
- Navegação por teclado no seletor: setas, Enter, Esc e `/`.
- Cópia de draft incompleto ou completo com `Ctrl + Shift + C`.
- Nova partida com `Ctrl + N`, inversão de times, limpeza seletiva e confirmação para ações abrangentes.
- Sempre no topo pela API da janela Tauri.
- Modo compacto persistente.
- Pools separadas por função e pelas categorias Principais, Bons, Situacionais e Evitar.
- Reordenação e movimentação das pools por drag-and-drop, inclusive por teclado.
- Cópia de uma pool, de todas as funções jogadas e de um contexto completo para iniciar conversas com qualquer IA moderna.
- Configuração inicial não bloqueante, preferências editáveis e restauração segura dos padrões.
- Persistência local JSON com schema versionado, migração, validação e fallback para corrupção.
- Snapshot pt_BR com 173 campeões e ícones embutidos para uso offline.
- Atualização manual e confirmada pelo Riot Data Dragon, mantendo o snapshot embutido como fallback.
- Aviso legal oficial de produto de terceiros na tela Sobre.

## Requisitos de desenvolvimento

- Windows 10 ou Windows 11 x64
- Node.js 22 ou posterior
- pnpm 11
- Rust estável com target MSVC
- Microsoft Edge WebView2 Runtime
- Build Tools do Visual Studio com ferramentas C++ para desktop

O instalador final não exige Node.js, pnpm ou Rust.

## Instalação das dependências

```powershell
pnpm install
```

O projeto usa `pnpm-lock.yaml`. O único script de instalação de dependência autorizado em `pnpm-workspace.yaml` é o do `esbuild`.

## Desenvolvimento

Frontend no navegador:

```powershell
pnpm dev
```

Aplicativo desktop Tauri:

```powershell
pnpm tauri:dev
```

## Verificações

```powershell
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Para gerar relatório de cobertura:

```powershell
pnpm test:coverage
```

## Dados dos campeões

O snapshot embutido fica em:

- `src/data/champions.json`
- `public/champions/`
- `src/data/champion-aliases.json`

Para consultar a versão estável atual do Data Dragon, normalizar `champion.json` em pt_BR e baixar somente os ícones ausentes:

```powershell
pnpm sync:champions
```

O script valida campos obrigatórios, quantidade mínima do catálogo e conteúdo básico de cada imagem. Se a rede falhar, o snapshot existente não é removido.

## Build e distribuição Windows

Gerar testes, lint, typecheck, frontend, binário release, instalador NSIS e pacote portátil:

```powershell
pnpm release:windows
```

Ou executar separadamente:

```powershell
pnpm build:tauri
pnpm package:portable
```

Artefatos reunidos em:

```text
dist/releases/PickBoard_0.1.0_x64-setup.exe
dist/releases/PickBoard_0.1.0_x64-portable.zip
```

O ZIP portátil contém apenas `PickBoard.exe`. O WebView2 Runtime do Windows continua sendo um requisito do sistema. Esta primeira versão não possui assinatura digital; o Windows pode exibir um aviso do SmartScreen.

## Estrutura

```text
src/
  components/
    draft/       quadro, bans e seletor
    layout/      shell e navegação
    pools/       catálogo e drag-and-drop
    settings/    perfil, preferências, dados e Sobre
    ui/          controles reutilizáveis e toasts
  data/          snapshot normalizado e aliases
  domain/        tipos, validações, defaults e formatadores puros
  services/      persistência, clipboard, janela e atualização
  store/         estado Zustand e ações
src-tauri/
  capabilities/ permissões mínimas
  icons/         identidade original do PickBoard
  src/           bootstrap Tauri e atualização do Data Dragon
scripts/         sincronização e empacotamento portátil
```

## Persistência

O estado é salvo como `pickboard-state.json` na pasta local de dados do aplicativo. São persistidos draft, bans, funções, pools, perfil, preferências, sempre no topo, modo compacto, limpeza ao iniciar, confirmação inicial e versão instalada dos campeões.

Atualizações de campeões baixadas pelo usuário são armazenadas sob a pasta local `champions/`. Se esses dados estiverem ausentes ou inválidos, o aplicativo usa o snapshot embutido.

## Atalhos

- `Ctrl + Shift + C`: copiar draft, desde que um campo de texto não esteja consumindo a combinação.
- `Ctrl + N`: nova partida.
- `/`: focar a busca quando o seletor estiver aberto.
- `↑` e `↓`: navegar pelos resultados.
- `Enter`: selecionar o resultado destacado.
- `Esc`: fechar o seletor.

## Aviso sobre a Riot Games

PickBoard isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.

Os dados estáticos e ícones são fornecidos pelo Riot Data Dragon. O PickBoard não usa uma Riot API key e não sugere associação ou aprovação pela Riot Games.

## Licença

MIT. Consulte `LICENSE`.
