# OPERATIONS GUIDE — good-vibe-desk

Everything about running this project: which AI does what, how each platform is
configured, and what to do when something breaks.

**Live app:** https://good-vibe-desk.kevinjackson1114.workers.dev
**Repo:** github.com/good-vibe-desk-lovable-app/good-vibe-desk
**Last updated:** August 2026

---

# PART 1 — DO THIS FIRST

Six settings, one sitting, about twenty minutes on your phone.
Turn on **Desktop site** in Chrome (⋮ menu) before starting.

## 1.1 Protect the main branch ⭐ HIGHEST VALUE

**Why:** Four PRs once merged into dead branches instead of `main` and nobody
noticed for hours. This makes that impossible.

```
https://github.com/good-vibe-desk-lovable-app/good-vibe-desk/settings/rules
```

1. Tap **New ruleset** → **New branch ruleset**
2. Name it `main-protection`
3. Enforcement status: **Active**
4. Target branches → **Add target** → **Include default branch**
5. Tick these three boxes:
   - ☑ Restrict deletions
   - ☑ Block force pushes
   - ☑ Require a pull request before merging
6. Under the pull request rule, set **Required approvals: 0**
   ⚠️ Do NOT set 1 — GitHub won't let you approve your own PR and you'd lock
   yourself out.
7. Tick ☑ **Require status checks to pass**, then **Add checks**, and search for:
   - `test`
   - `good-vibe-desk` (the Cloudflare Workers Build check)
   ⚠️ Do NOT add any Netlify checks.
8. **Create**

**If the checks don't appear in search:** they need to have run at least once.
Merge anything, wait for CI, then come back.

**If the repo is private and this page won't let you save:** rulesets are free
on public repos only. Either make the repo public — it contains no secrets —
or skip this step.

## 1.2 Remove Netlify

**Why:** It can't host this app (server-rendered, no static output). All it does
is add eight fake failing checks to every PR, which is how a real failure will
eventually get missed.

```
https://github.com/organizations/good-vibe-desk-lovable-app/settings/installations
```

Netlify → **Configure** → scroll to the bottom → **Uninstall**

Old PRs keep their historical checks. Nothing else changes.

## 1.3 Auto-delete merged branches

**Why:** Stops the branch list filling with dead branches, which is what made
the stacked-PR incident hard to see.

```
https://github.com/good-vibe-desk-lovable-app/good-vibe-desk/settings
```

Scroll to **Pull Requests**:
- ☑ Automatically delete head branches
- ☑ Allow squash merging
- ☐ Allow merge commits — **uncheck**
- ☐ Allow rebase merging — **uncheck**

## 1.4 Lock down Actions

**Why:** Stops any agent's workflow approving its own pull request.

```
https://github.com/good-vibe-desk-lovable-app/good-vibe-desk/settings/actions
```

Scroll to **Workflow permissions**:
- ● Read repository contents and packages permissions
- ☐ Allow GitHub Actions to create and approve pull requests — **uncheck**

**Save**

## 1.5 Stop Cloudflare preview builds

**Why:** You exhausted Netlify's build minutes on two accounts. Preview builds
on every branch are how that happens. Free tier is 3,000 build minutes a month.

```
https://dash.cloudflare.com
```

Workers & Pages → **good-vibe-desk** → Settings → **Build**
- Branch control → **uncheck** "Builds for non-production branches"
- Production branch: `main`
- Build caching: **on**
- Confirm build command `npm run build`, deploy command `npx wrangler deploy`

## 1.6 Turn on 2FA

**Why:** GitHub makes it mandatory before 21 September 2026. After 2 September
you can't turn it off.

```
https://github.com/settings/security
```

Use an authenticator app or passkey. **Not SMS.**

⚠️ Don't enable org-wide 2FA until the other org member has it — it removes
members who don't.

---

# PART 2 — WHICH AI DOES WHAT

The single most important thing to get right. Each tool has one job.

| AI | Job | Never let it |
|---|---|---|
| **Jules** | Code, data pipelines, scraping, PRs | Merge its own work |
| **Lovable** | UI only, on its own branch | Touch `main`, data, or parsers |
| **Claude (me)** | Review, planning, writing briefs | — |
| **Manus** | Was the main builder; now credit-limited | — |

## 2.1 Jules — the main worker

**What it's good at:** Everything Manus did. Runs in a Linux VM with internet,
installs packages, runs your tests, opens pull requests.

**Limits:** 15 tasks/day, 3 at once, free. Each task must finish in one go —
there's a time cap Google doesn't publish. Scope work small.

**Golden rule:** One task = one PR against `main`. Never stack.

## 2.2 Lovable — UI only, quarantined

⚠️ **Lovable is the dangerous one.** It auto-commits continuously to whatever
branch it's synced to, and it has no concept of your generated data files,
parser contracts, or the 4.5 MB offline budget.

**Before you use it again:**

1. Enable branch switching: Lovable → Settings → Account → **Labs**
2. Point it at a branch called `lovable/ui` — **never `main`**
3. Paste the constraints (Part 4) into Lovable's **Knowledge**
4. Merge its work to `main` only through a normal PR, so your checks gate it

**Use it for:** components, styling, layout
**Never for:** anything in `src/data/`, `scripts/`, the service worker, or build config

## 2.3 Claude — review and planning

Bring me: research reports to check, plans to review before you approve them,
error logs, and anything that smells wrong.

I can't run your code. Every file I hand you is unverified until CI says
otherwise — that's caught real errors twice.

---

# PART 3 — PLATFORM SETUP

## 3.1 Jules

```
https://jules.google
```

**Environment tab** — setup script:
```
npm install
```
Then **Run and Snapshot**. This caches your 716 packages so every task doesn't
reinstall them.

⚠️ Re-snapshot whenever dependencies change, or tasks run against stale packages.

**Settings:**

| Setting | Value | Why |
|---|---|---|
| Knowledge / memory | On | Remembers your corrections |
| CI Fixer | **OFF** | Would auto-fix lint by weakening tests |
| Suggested Tasks | Off | Unrequested PRs |
| Scheduled Tasks | Off | No unsupervised edits |
| MCP | None | Nothing relevant available |
| Repo access | This repo only | Least privilege |

⚠️ **Never give Jules your Cloudflare API token or any deploy secret.**

## 3.2 Cloudflare

Beyond Part 1.5, the useful bits:

**Rollback a bad deploy:** Workers & Pages → good-vibe-desk → **Deployments** →
three-dot menu on any previous version → **Rollback**. Keeps the last 100
versions, free tier included. Works on mobile.

**Free tier limits:** 100,000 requests/day, 3,000 build minutes/month. Static
assets don't count toward requests. You're nowhere near any of it.

**Never enable these — they break the app:**
- Auto Minify — corrupts hashed assets, breaks the service worker
- Rocket Loader — breaks React hydration
- Bot Fight Mode — would block your item-pack downloads
- Any cache rule on `sw.js` or `index.html` — strands users on stale offline shells

## 3.3 GitHub security

```
https://github.com/good-vibe-desk-lovable-app/good-vibe-desk/settings/security_analysis
```

Turn on:
- ☑ Dependabot alerts
- ☑ Dependabot security updates
- ☑ Secret scanning
- ☑ Push protection ← blocks a leaked key before it lands
- ☑ Private vulnerability reporting

Skip: CodeQL (noisy for an app this size), Dependabot version updates (constant
PRs you don't need).

---

# PART 4 — THE RULES

Paste these into any new AI's context. They exist because each one broke
something.

```
1.  MAX_BASE_WORK_LEVEL = 8 in src/lib/tiers.ts stays 8.
    Four separate AI passes recommended changing it to 10. All four were wrong.
2.  Join data on internalName, never Paldeck number.
    85 of 300 Pals are variants sharing a number with their base form.
3.  Never invent a game value. Unsourced = rendered "unknown" and logged.
4.  pairMaps.ts may only be statically imported by data-check.tsx and test files.
5.  Never hand-edit generated files in src/data/palworld/.
6.  Generated files must be registered in .prettierignore AND eslint.config.js.
7.  Never make a test pass by deleting it, skipping it, or weakening it.
8.  const A = "a" in src/routes/index.tsx is deliberate. Do not clean it up.
9.  Core PWA output must stay under 4,500,000 bytes.
10. One PR per task, always against main. Never stack PRs.
11. Read docs/PALWORLD-1.0-REFERENCE.md before any game-mechanics claim.
```

---

# PART 5 — DAILY WORKFLOW

## 5.1 Giving an AI a task

1. State the goal in one sentence
2. Paste the relevant rules from Part 4
3. Say: **"One PR against `main`. Do not stack."**
4. Say: **"Run tsc, vitest, lint and build. Paste the output."**
5. Wait for its plan → read it → approve or push back

## 5.2 Reviewing a PR

Open the PR and check, in order:

1. **Is the base branch `main`?** If not, stop.
2. **Is the `test` check green?** That's the only one that matters.
3. **Is Cloudflare Workers Build green?**
4. **Ignore anything Netlify** (gone after Part 1.2)
5. Merge → Confirm merge

## 5.3 Something broke

| Symptom | Do this |
|---|---|
| Live app broken | Cloudflare → Deployments → Rollback |
| CI red on main | Open Actions, read the failing step, send it to me |
| Lint failing | Run the Format workflow, then recheck |
| AI edited generated files | Reject the PR. Cite rule 5 |
| AI changed the `8` | Reject. Cite rule 1 |
| Merge button greyed out | Check for conflicts. Ask the AI to rebase |

**Format workflow:**
```
https://github.com/good-vibe-desk-lovable-app/good-vibe-desk/actions/workflows/format.yml
```
Run workflow → main → Run workflow

---

# PART 6 — WHAT'S STILL OPEN

## 6.1 Blocked on data that doesn't exist publicly

The planner can't rank teams for a specific boss because four numbers aren't
published anywhere:

- The level-scaling formula (scale value → actual stat at level N)
- Enemy and boss stat profiles
- Move damage values and cooldowns
- Element effectiveness multipliers

Closed as unsourceable after three attempts. **Only a PC with Palworld
installed, running PalCalc's GenDB, would settle them.**

## 6.2 Two in-game experiments only you can run

Protocols are written in `docs/PALWORLD-1.0-REFERENCE.md`:
- Does the Ancient Hatchery change rare-skill inheritance rates?
- Does Broncherry affect mutated eggs beyond Alpha conversion?

## 6.3 Never investigated

- `blaynem/paldex` and `PalworldDataTools/PalworldDataExtractor` — may contain
  the level-scaling formula
- `cheahjs/palworld-save-tools` — could let you import your save file instead of
  hand-entering your collection. Probably the highest-value unbuilt feature.

## 6.4 Small and easy

- No navigation links to `/compendium`, `/planner/combat`, `/planner/base-work`
  or `/explore` from the front page. Half the app is invisible.

---

# PART 7 — SKIP THESE

| Thing | Why |
|---|---|
| Netlify | Can't host this app |
| Custom domain | workers.dev is fine |
| Cloudflare WAF, Argo, Cache Rules | Need a custom domain, no benefit here |
| CodeQL | Noisy for an app this size |
| Jules MCP / Scheduled / Suggested | Unnecessary risk |
| GitHub mobile app for settings | Use the browser in desktop mode |
