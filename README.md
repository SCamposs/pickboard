# PickBoard

PickBoard é um aplicativo desktop local para acompanhar drafts de League of Legends, organizar pools pessoais e copiar prompts prontos para qualquer IA moderna. A versão 0.2.0 pode ler picks e bans confirmados diretamente do League Client, sem retirar o preenchimento manual.

O aplicativo usa Tauri 2, React, TypeScript, Vite, Tailwind CSS e Rust. Não existe backend externo, conta, telemetria, analytics ou envio remoto de dados do draft.

## Recursos

- Picks para TOP, JG, MID, ADC e SUP nos dois times, preenchidos manualmente em qualquer ordem.
- Sincronização local e opcional de picks e bans confirmados durante o champ select.
- Posições aliadas preenchidas somente quando o League Client fornece uma função reconhecida.
- Picks inimigos detectados sempre começam sem posição; o usuário pode atribuir, trocar ou remover seu palpite.
- Cinco bans independentes por time, com validações contra picks e duplicações.
- Prompt de draft completo, incluindo inimigos sem posição sem presumir uma ordem de funções.
- Busca de campeões sem acento, espaço, hífen ou apóstrofo, com aliases comuns.
- Nova partida, inversão de times, limpeza seletiva, sempre no topo e modo compacto.
- Pools por função e categorias Principais, Bons, Situacionais e Evitar.
- Contexto reutilizável para iniciar conversas com qualquer IA moderna.
- Persistência local com schema versionado, migração e recuperação segura.
- Snapshot pt_BR com 173 campeões e ícones embutidos para uso offline.
- Atualização manual pelo Riot Data Dragon, sempre com fallback para o snapshot embutido.

## Como funciona a sincronização

Ative ou desative **Sincronizar com o League Client** em **Configurações**. Ela vem ativada por padrão.

O backend Rust procura o processo `LeagueClientUx.exe`, obtém as credenciais temporárias locais pelos argumentos do processo ou pelo `lockfile` e se conecta exclusivamente ao loopback. A autenticação usa o usuário local `riot`; senha, porta, PID, linha de comando e conteúdo do lockfile nunca são enviados ao React, persistidos ou exibidos.

Os eventos do cliente servem apenas como gatilho. Após conectar, reconectar ou receber um evento relevante, o PickBoard lê novamente o snapshot completo de `GET /lol-champ-select/v1/session`. Isso evita acumular eventos duplicados e faz trocas convergirem para o estado mais recente.

A integração é estritamente somente leitura. Ela não:

- aceita partidas;
- confirma pick ou ban;
- altera runas ou feitiços;
- envia mensagens;
- identifica jogadores ocultos;
- lê memória, injeta código ou executa ações no cliente.

Não é necessário criar, configurar ou distribuir uma Riot API key. A LCU usa somente uma credencial temporária criada pelo próprio League Client em cada execução.

### Estados da conexão

- **Sincronização desativada:** o toggle está desligado e o quadro permanece manual.
- **Procurando League Client:** o cliente ainda não foi encontrado.
- **League Client encontrado / Conectando:** a conexão local está sendo preparada.
- **Aguardando seleção:** o cliente está aberto, mas não há champ select ativo.
- **Draft sincronizado:** o snapshot confirmado está sendo acompanhado.
- **Reconectando:** houve uma interrupção transitória; o último draft continua visível.
- **Integração indisponível:** o formato ou a conexão não pôde ser usado; o modo manual continua disponível.

### Picks inimigos sem posição

O PickBoard não usa ordem, cell ID, popularidade ou composição para adivinhar posições inimigas. Um adversário confirmado aparece em **Picks inimigos detectados** e já entra no prompt como parte da composição.

Para registrar seu palpite, escolha TOP, JG, MID, ADC ou SUP ao lado do campeão. Se a função estiver ocupada, o ocupante anterior volta para **Sem posição** e nenhuma informação é descartada. No slot, use a ação **Retornar para sem posição** para desfazer; depois você pode escolher outra função.

## Modo manual e ciclo da sessão

Todos os slots e bans continuam clicáveis com ou sem o League Client. Desativar a sincronização preserva o quadro atual. Ao reativar, o estado é reconciliado com a seleção atual.

Uma nova sessão comprovada limpa apenas picks e bans da sessão anterior, uma única vez. Pools, perfil, preferências e configurações são preservados. Sair do champ select, sofrer dodge ou perder a conexão não apaga o último snapshot visível.

Durante uma sessão sincronizada, **Nova partida**, **Limpar** e **Inverter times** continuam disponíveis. O aplicativo avisa que um snapshot seguinte pode restaurar os dados detectados. Nenhuma dessas ações escreve no League Client.

## Instalação e uso normal

Para usar o aplicativo pronto, você não precisa instalar Node.js, pnpm ou Rust e não precisa baixar o repositório.

- `PickBoard_0.2.0_x64-setup.exe` é o instalador normal. Ele instala somente para o usuário atual e usa o fluxo padrão do NSIS para escolher/confirmar o destino.
- `PickBoard_0.2.0_x64-portable.zip` contém somente `PickBoard.exe`; extraia em uma pasta e execute sem instalar.
- O repositório é apenas o código-fonte para desenvolvimento. Ele não se mistura com a instalação normal.

O Microsoft Edge WebView2 Runtime deve existir no Windows. Esta versão não possui assinatura digital, então o SmartScreen pode exibir um aviso.

## Requisitos de desenvolvimento

- Windows 10 ou Windows 11 x64
- Node.js 22 ou posterior
- pnpm 11
- Rust estável com target MSVC
- Microsoft Edge WebView2 Runtime
- Build Tools do Visual Studio com ferramentas C++ para desktop

Instale as dependências:

```powershell
pnpm install
```

Frontend no navegador — sem integração LCU:

```powershell
pnpm dev
```

Aplicativo desktop Tauri:

```powershell
pnpm tauri:dev
```

## Testes e verificações

Os testes Rust usam JSON sanitizado e contratos locais; nenhum token real é necessário.

```powershell
pnpm test
pnpm lint
pnpm typecheck
pnpm build
cd src-tauri
cargo test
cargo check
```

Para gerar cobertura TypeScript:

```powershell
pnpm test:coverage
```

## Roteiro manual com o League Client

Use uma partida personalizada ou outro ambiente seguro; não use fila ranqueada para desenvolvimento.

1. Abra o PickBoard sem o League e confirme **Procurando League Client**.
2. Abra o League Client e confirme a detecção automática.
3. Entre em uma partida personalizada e inicie o champ select.
4. Passe o mouse sobre um campeão sem confirmar e confirme que ele não entra definitivamente no quadro.
5. Confirme picks aliados e verifique as posições fornecidas pelo cliente.
6. Confirme picks inimigos e verifique que aparecem sem posição.
7. Atribua uma posição inimiga, troque-a e retorne o campeão para **Sem posição**.
8. Confirme bans dos dois times.
9. Faça uma troca de campeão e confirme a convergência do snapshot.
10. Copie o prompt com inimigos posicionados e não posicionados.
11. Desative a sincronização e confirme que o quadro deixa de receber mudanças.
12. Reative e confirme a reconciliação com a sessão atual.
13. Feche e reabra o cliente, verificando reconexão e modo manual durante a interrupção.
14. Teste um dodge e confirme que o último snapshot permanece visível.
15. Inicie outro champ select e confirme que picks e bans anteriores são limpos uma única vez.

## Limitações da sincronização

- A League Client API não possui garantia oficial de estabilidade e pode mudar sem aviso.
- Atualizações do cliente podem interromper temporariamente a integração.
- Posições inimigas nunca são inferidas automaticamente.
- Alguns modos podem não fornecer posições aliadas confiáveis; nesses casos o acompanhamento é parcial.
- A descoberta e a integração com o cliente são destinadas ao aplicativo Windows instalado.
- O modo manual sempre permanece disponível.
- A integração não executa ações dentro do cliente.

## Solução de problemas

- **Continua procurando:** abra o cliente completo do League e aguarde alguns segundos; o launcher sozinho não basta.
- **Integração indisponível:** atualize/reabra o League e o PickBoard. Continue manualmente se uma atualização da LCU tiver alterado o contrato.
- **Campeão desconhecido:** em Configurações, use **Verificar atualizações de campeões**.
- **O draft voltou após limpar ou inverter:** a sessão sincronizada continua ativa e o snapshot confirmado foi aplicado novamente. Desative a sincronização para editar sem reconciliação.
- **Posição aliada ausente:** o modo atual não informou uma posição reconhecida; preencha manualmente.

## Dados dos campeões

O snapshot embutido fica em `src/data/champions.json`, `public/champions/` e `src/data/champion-aliases.json`.

Para consultar o Data Dragon e baixar apenas os ícones ausentes:

```powershell
pnpm sync:champions
```

Se a rede falhar, o snapshot existente não é removido.

## Build e distribuição Windows

Gere testes, lint, typecheck, frontend, binário release, instalador NSIS e portátil:

```powershell
pnpm release:windows
```

Ou separadamente:

```powershell
pnpm build:tauri
pnpm package:portable
```

Os arquivos ficam em:

```text
dist/releases/PickBoard_0.2.0_x64-setup.exe
dist/releases/PickBoard_0.2.0_x64-portable.zip
```

O ZIP portátil deve conter apenas `PickBoard.exe`.

### Publicar futuramente como GitHub Release

Esta tarefa não publica nem cria tag. Quando a versão for aprovada para distribuição pública:

1. registre ou atualize o projeto no Riot Developer Portal e peça a auditoria aplicável;
2. gere os dois artefatos e confira seus hashes SHA-256;
3. no GitHub, abra **Releases → Draft a new release**;
4. escolha/crie a tag `v0.2.0` apontando para o commit aprovado;
5. use o título `PickBoard 0.2.0` e descreva sincronização local, modo manual, limitações e ausência de assinatura;
6. anexe o instalador e o ZIP portátil — não anexe o repositório como se fosse o aplicativo;
7. publique a release. Os anexos passam a aparecer como downloads; `Source code (zip/tar.gz)` é gerado pelo GitHub e contém somente o repositório.

## Estrutura

```text
src/
  assets/        recursos visuais empacotados pelo frontend
  components/    draft, layout, pools, configurações e controles
  domain/        tipos, validação, migração, reconciliação e prompts
  hooks/         ciclo de vida da sincronização na interface
  services/      persistência, clipboard, catálogo e ponte Tauri
  store/         estado Zustand e ações
src-tauri/
  src/lcu/       descoberta, conexão, modelos, normalização e watcher
  capabilities/ permissões mínimas
  icons/         ícones do executável e instalador
scripts/         sincronização do catálogo e empacotamento portátil
```

## Persistência e privacidade

O estado fica em `pickboard-state.json` na pasta local de dados do aplicativo. São persistidos draft, bans, anotações de posição, pools, perfil, preferências e configurações.

Nunca são persistidos token, senha, porta, PID, lockfile, URL autenticada, estado interno de reconexão ou identidade de jogadores. Logs de desenvolvimento são locais, mínimos e sanitizados. Não existe telemetria.

## Aviso sobre a Riot Games

PickBoard isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.

Os dados estáticos e ícones vêm do Riot Data Dragon. A integração usa a League Client API local, que a Riot declara não ser oficialmente suportada. Antes de publicar publicamente esta funcionalidade, o responsável deve registrar ou atualizar o PickBoard no Riot Developer Portal, informar o endpoint local usado, descrever o acesso somente leitura e solicitar a auditoria exigida pela política vigente.

Referências primárias:

- [League Client API](https://developer.riotgames.com/docs/lol#league-client-api)
- [General Policies](https://developer.riotgames.com/policies/general)

O PickBoard não usa uma Riot API key e não sugere associação, aprovação ou endosso pela Riot Games.

## Licença

MIT. Consulte `LICENSE`.
