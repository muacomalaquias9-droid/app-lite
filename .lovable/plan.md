# Plano de execução — Paji

Vou executar em 4 fases. Cada fase deixa o app funcional. Confirme e começo a Fase 1 imediatamente.

---

## Fase 1 — Rebrand Paji + Bottom Nav flat + Toggle ads

**Rebrand Blynk → Paji (global)**
- Procurar todas as ocorrências "Blynk"/"blynk"/"BLYNK" em `src/**`, `public/**`, `index.html`, `manifest.json`, `vercel.json`, `README.md`.
- Substituir em: logo (`Logo2026.tsx`), `AuthLayout.tsx`, `Footer.tsx`, `Blynk2026Announcement.tsx`, meta tags do `index.html` (title, description, og:*), `manifest.json` (name, short_name), copyright "© 2026/2027 Paji", textos de emails/auth.
- Manter `appID` Capacitor atual (não rebuild nativo agora).
- Atualizar memórias de branding.

**Bottom Nav flat estilo Instagram**
- `BottomNav.tsx`: remover `rounded-22px`, `mx-auto`, glass flutuante. Aplicar barra cheia `w-full`, `border-t`, fundo sólido `bg-background`, ícones outline lineares (Lucide), 5 slots: Home, Search, Create (+), Reels, Profile (avatar do user).
- Badge vermelho com contador em Notifications icon (puxar de `useNotificationCount`).

**Remover Footer global**
- Remover `<Footer />` do layout principal (manter arquivo por compatibilidade ou apagar).

**Admin toggle global de ads**
- Migration: `app_settings` table (key text PK, value jsonb, updated_at).
- Seed `{ key: 'ads_enabled', value: true }`.
- RLS: leitura pública, escrita só admin (`has_role`).
- Admin UI: novo card "Anúncios do App" com `Switch` em `Admin.tsx`.
- Feed/SponsoredAd: ler `ads_enabled`, se false esconder tudo.

---

## Fase 2 — Novo Feed "Community App" (Paji)

- Apagar conteúdo atual de `Feed.tsx` e reconstruir do zero com layout community-style (cards arejados, header limpo "Paji", chips de categoria/hashtag, post card com avatar + nome + handle, mídia rounded-2xl, ações horizontais: like/comment/share/save).
- Manter integração existente: posts, likes (single heart), comments, stories bar topo, música (vinyl + título/artista, controles invisíveis), suggestions.
- Pull-to-refresh, double-tap like, sons globais — preservar.

---

## Fase 3 — Biometria WebAuthn (Passkey)

- Migration: `user_passkeys` table (id, user_id, credential_id, public_key, counter, transports, device_name, created_at).
- Edge functions:
  - `passkey-register-options` (gera challenge)
  - `passkey-register-verify` (verifica e armazena)
  - `passkey-auth-options` (challenge para login)
  - `passkey-auth-verify` (verifica e devolve sessão custom via service role)
- Lib `@simplewebauthn/browser` + `@simplewebauthn/server` (Deno via npm:).
- UI: 
  - Em Signup: passo "Ativar biometria (Face ID / Touch ID / impressão digital)".
  - Em Login: botão "Entrar com biometria" usa Conditional UI.
  - Em ações sensíveis (pagamento verificação, withdraw, mudar senha): reauth via passkey.
- Senha do dispositivo NUNCA chega ao servidor — só o credential público.

---

## Fase 4 — Notificações nativas + ícones APP nativo

- Service Worker já existe (`public/sw.js`): garantir `showNotification()` em background para: like, comment, follow, message, mention.
- Pedir permissão `Notification.requestPermission()` no primeiro login.
- Badge vermelho no sino com contador em tempo real (já tem `useNotificationCount`; reforçar visual: `bg-red-500 text-white rounded-full`).
- Pack de ícones APP nativo: usar **Lucide icons outline** consistente (já instalado) com weight 1.5px, substituindo qualquer emoji em UI de navegação. Não vou baixar pack externo — Lucide já oferece o look "native app" pedido e mantém bundle leve.

---

## Detalhes técnicos

- **Tabelas novas**: `app_settings`, `user_passkeys` (com GRANTs explícitos).
- **Edge functions novas**: 4 funções passkey.
- **Dependências**: `@simplewebauthn/browser` (frontend).
- **Memória**: atualizar `mem://branding/blynk-identity-and-copyright-2027` → Paji; criar `mem://auth/webauthn-passkey-system`; criar `mem://admin/global-ads-toggle`.

---

**Pergunta antes de começar:** posso executar as 4 fases em sequência sem parar entre elas, ou prefere aprovar cada fase individualmente? Recomendo sequencial — vou commitando ao fim de cada fase.