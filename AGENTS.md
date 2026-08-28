<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Pull request workflow

Open **every** pull request against `main`. Do **not** stack pull requests on feature branches, including during bulk data acquisition. Resolve any conflict visibly against current `main`; never merge a domain PR into an intermediate branch or rely on a later retarget. One PR may contain several already-related commits only when explicitly recovering or consolidating work, but its base must still be `main`.

## Operational guidance & workflow

For platform configuration, AI roles, and the daily workflow, see [`docs/OPERATIONS-GUIDE.md`](docs/OPERATIONS-GUIDE.md).

## Palworld mechanics reference

Before making, changing, or documenting a claim about Palworld game mechanics, read [`docs/PALWORLD-1.0-REFERENCE.md`](docs/PALWORLD-1.0-REFERENCE.md). It records the project’s source-tier rules, verified 1.0 breeding and egg mechanics, current model boundaries, and remaining `UNKNOWN` items. Do not turn a documented unknown or community-tier observation into application data without stronger evidence.

## Static import rules & exceptions

Test files are a permitted exception to the `pairMaps` static-import rule, since they never reach the client bundle.
