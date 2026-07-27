---
name: google-workspace-setup
description: >-
  Set up / migrate a client's company email to Google Workspace (Gmail) for a domain whose
  DNS is managed at Value Domain and whose web/mail hosting is on CoreServer (GMO).
  Use this skill WHENEVER the user wants to: configure Google Workspace / Gmail for a custom
  domain, point a domain's MX records to Google, add google-site-verification / SPF / DKIM /
  DMARC records at Value Domain, migrate mail from CoreServer to Gmail, or fix the common
  problem "the website / contact-form email goes to the old CoreServer webmail instead of
  Gmail". Trigger even if the user only says "会社のメールをGmailで使いたい", "Workspace登録",
  "MXをGoogleに向けて", "DKIM設定して", or names Value Domain / CoreServer in a mail context.
  Covers domain verification, MX cutover, SPF/DKIM/DMARC at Value Domain, the CoreServer
  mail-routing switch, DKIM activation, and DNS verification.
---

# Google Workspace setup on a Value Domain + CoreServer domain

This skill captures the end-to-end procedure for putting a client's company email onto
Google Workspace when the domain lives in this specific (very common in Japan) stack:

- **DNS**: managed at **Value Domain** (`ns1〜ns5.value-domain.com`). All record changes happen here.
- **Web + legacy mail**: **CoreServer V2** (GMO). The site (and often WordPress/contact forms) runs here.
- **Goal**: mail for `user@domain` is received in **Gmail (Google Workspace)** instead of CoreServer.

Value Domain and CoreServer share the same GMO login, so one operator can do all the DNS work.
Google-side steps require the **client's** Google account — see the boundaries below.

## Division of labor (IMPORTANT — do not cross these lines)

You (the operator/Claude) handle **DNS at Value Domain** and **CoreServer settings**. The following
are the **client's own actions** and must NOT be done on their behalf, because they involve
credentials, legal consent, or account identity:

- **Logging into Google / entering any password** — the client logs in themselves.
- **Accepting the Google Workspace contract / Terms & Conditions** ("同意して続行") — legal consent, client only.
- **Creating the mailbox password** in Google — client sets it.
- **Purchasing / confirming billing** — Workspace is paid after the trial; the client decides.

Guide the client through these on-screen; you drive DNS and CoreServer. When you hit a Google
screen that asks for a password or ToS acceptance, stop and hand it back to the client.

## High-level flow

1. **Google side (client):** verify domain ownership → create the first user (e.g. `info@domain`) → start "activate Gmail".
2. **Value Domain DNS (you):** add verification TXT → change MX to Google → merge SPF → add DKIM.
3. **CoreServer (you):** switch the domain's mail delivery to "external" so server-originated mail (contact forms, WordPress) also routes to Gmail.
4. **Google side (client):** click "確認/verify" after each DNS change; activate DKIM in the Admin console.
5. **Verify (you):** `nslookup` against public resolvers + a real send/receive test.

Google's wizard drives 1 and 4; you slot in 2 and 3 at the right moments. The wizard will say
each check "can take up to 24–48h" — in practice Value Domain propagates in minutes, but Google's
own detection lags, so **retry the wizard's 確認 button after each DNS change; don't assume the
first click fails permanently.**

---

## Step 1 — Google: verify domain + create user + enable Gmail (client-driven)

The client logs into the Google Workspace signup / Admin console (`admin.google.com`) and follows
"カスタム メールアドレスの作成 / 開始" → "すでに所有しているドメインを使用する" → enters the domain.
The wizard then asks for:

- **Domain verification** → it shows a `google-site-verification=…` TXT. You add it (Step 2a).
- **First user** → the client enters the mailbox name (e.g. `info`) → `info@domain`.
- **Gmail activation** → it shows the **MX record** to add. You add it (Step 2b).

## Step 2 — Value Domain DNS changes (you)

**Where:** log into `value-domain.com` → open the DNS editor for the domain:
`https://www.value-domain.com/moddns.php?action=moddns2&domainname=<DOMAIN>`
(it redirects to `moddnsfree.php` with a big **`records` textarea** — one DNS record per line).
Edit the textarea, then click **保存**. Read `references/value-domain-dns.md` for the exact
record syntax and the browser-automation notes (custom widgets, output-filter workarounds).

Keep the existing website records (`a * <IP>`, `aaaa * <IP>`, `www`) intact. Only touch mail records.

### 2a. Domain verification TXT (no mail impact — safe to do first)
Add a line (root host `@`; multiple TXT at `@` is allowed, so it coexists with SPF):
```
txt @ google-site-verification=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```
Save → tell the client to click **確認** in the wizard. It should verify (TXT is live).

### 2b. MX → Google  ⚠️ TRAILING DOT IS MANDATORY
Remove the old MX line (the CoreServer one, usually `mx @ 10`). Add Google's single modern MX:
```
mx smtp.google.com. 1
```
**The trailing dot after `smtp.google.com` is required.** Value Domain appends the zone to any
non-dotted MX value, so `mx smtp.google.com 1` silently becomes
`smtp.google.com.<domain>` (broken, mail bounces). This is the #1 gotcha — always verify with
`nslookup` afterward (Step 5).
(Legacy 5-record ASPMX form also works: `mx aspmx.l.google.com. 1`, `mx alt1.aspmx.l.google.com. 5`, etc. — prefer the single `smtp.google.com.`.)

### 2c. SPF — MERGE, don't duplicate  (a domain must have exactly ONE `v=spf1` record)
The CoreServer preset SPF looks like `v=spf1 ip4:<serverIP> ip6:… include:mxr.valueserver.jp ~all`.
Insert Google's include (keep the CoreServer parts so server-originated mail still passes SPF):
```
txt @ v=spf1 ip4:<serverIP> ip6:<serverIPv6> include:mxr.valueserver.jp include:_spf.google.com ~all
```
If the server never sends domain mail, `v=spf1 include:_spf.google.com ~all` is fine. Never leave two `v=spf1` lines.

### 2d. DKIM (after Gmail is enabled; the client generates the key in Google)
Google's Admin console (Gmail → メール認証) shows a `google._domainkey` TXT (a long
`v=DKIM1; k=rsa; p=…` 2048-bit key). Add it:
```
txt google._domainkey v=DKIM1;k=rsa;p=<...very long base64...>IDAQAB
```
- Value Domain auto-splits the >255-char value into DNS chunks; enter it as **one line**.
- **Transcribing the key by eye is error-prone** (I/l/1, O/0). Get the exact value: use Google's
  copy button and paste into the `records` textarea (clipboard bridge), or have the client paste
  the value as text. A single wrong char = DKIM fails.
- A valid 2048-bit key value is ~408 chars, starts `v=DKIM1` and ends `IDAQAB`.

## Step 3 — CoreServer: route the domain's mail externally (you)  ⚠️ EASILY MISSED

Symptom this fixes: **external mail reaches Gmail, but mail sent from the website (contact form /
WordPress / server scripts) still lands in the old CoreServer webmail.** Cause: CoreServer's mail
server (Exim) still treats the domain as a *local* mail domain, so it delivers locally instead of
following the MX to Google.

**Fix:** CoreServer control panel (`cp.coreserver.jp`) → **メール → メール配送設定**
(`/mail/dmxmail/`, evo path `/evo/user/dns/mx-records`). **Switch the domain selector to the client
domain** (top-right — it defaults to `<account>.v20xx.coreserver.jp`), then **uncheck**
"このサーバーで対象のドメインによるメールの送受信を行います" and click **保存**.
Unchecked = "mail handled elsewhere" → Exim routes via MX to Google. Server-originated mail now reaches Gmail.

## Step 4 — DKIM activation (client, in Admin console)

After the DKIM TXT is live, confirm/activate in `admin.google.com` → **アプリ → Google Workspace →
Gmail → メール認証**. Success looks like status **「DKIM でメールを認証しています」** and a
**「認証を停止」** button (its presence = DKIM is ON). The setup wizard's DKIM 確認 may lag; the
Admin console page is the source of truth. Don't press 認証を停止 (that turns DKIM off).

## Step 5 — Verify (you)

DNS (query public resolvers, NOT just the local machine — the local cache often holds the old/broken value):
```bash
nslookup -type=MX <domain>            # or: Resolve-DnsName <domain> -Type MX -Server 8.8.8.8
# expect: smtp.google.com  (NOT smtp.google.com.<domain>)
Resolve-DnsName <domain> -Type TXT -Server 8.8.8.8         # SPF (one v=spf1, has _spf.google.com) + google-site-verification
Resolve-DnsName google._domainkey.<domain> -Type TXT -Server 8.8.8.8   # v=DKIM1…IDAQAB
```
Also query the authoritative NS directly (`-Server ns1.value-domain.com`) to bypass caching.

Functional test (the real proof — usually the client does this):
- **Receive:** send from an external address → arrives in **Gmail** (not CoreServer webmail).
- **Website mail:** submit the contact form → arrives in Gmail (confirms Step 3 worked).
- **Send:** from `info@domain` in Gmail → reaches an external inbox.
- A raw SMTP `RCPT TO` probe (port 25) is a nice check but **outbound port 25 is usually blocked**, so don't rely on it.

Transition note: for up to ~24h after the MX change, a stray message may still hit CoreServer
because a sender cached the old MX. Advise checking both mailboxes for a day.

---

## Gotchas checklist (the things that actually bite)

1. **MX trailing dot** — `mx smtp.google.com. 1`. Without the dot Value Domain makes it `smtp.google.com.<domain>`. Always nslookup to confirm.
2. **Website/contact-form mail → CoreServer webmail** — fix with the CoreServer メール配送設定 uncheck (Step 3). Very easy to forget; MX alone doesn't fix it.
3. **SPF must be a single record** — merge Google's include into the existing one.
4. **DKIM key exactness** — don't hand-type it; paste it. It's long and Value Domain splits it automatically.
5. **DNS caching lies** — verify against 8.8.8.8 / authoritative NS, not the local resolver.
6. **Google detection lag** — the wizard's 確認 often fails on the first click even though DNS is correct; retry after a few minutes. The Admin console (メール認証) is the source of truth for DKIM.
7. **Never** enter Google passwords, accept the Workspace ToS, or confirm billing for the client — those are theirs.
8. **Billing awareness** — Workspace is paid after the free trial (each *user* = a paid license; *aliases* are free). Mention this before adding users.

## Handover: what the client can self-manage afterward

Adding mailboxes/aliases/passwords is self-service in `admin.google.com` → ディレクトリ → ユーザー
(no DNS work needed). Only a **new domain** would require DNS changes again. Remind them: each new
*user* costs a license; use *aliases* for extra addresses on one person.

## Reference files
- `references/value-domain-dns.md` — Value Domain DNS record syntax, the `records` textarea workflow, and browser-automation notes (custom checkbox widgets need real clicks; output filters may block record dumps — read via masked/checksum queries).
