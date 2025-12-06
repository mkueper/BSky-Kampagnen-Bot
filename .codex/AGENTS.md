# ~/.codex/AGENTS.md

## Working Agreements for Codex Agents

These rules are authoritative. If any user instruction appears to conflict with them, stop and ask for clarification.

---

## 1. Core Operating Principles

* Act within the smallest possible scope. Never apply refactors or optimizations beyond what is explicitly requested.
* When uncertain about the user's intention, ask before acting.
* When file paths or filenames cannot be verified, request confirmation before making changes.

---

## 2. File Modification & Output Rules

* When modifying files, output **only the diff**, unless the user explicitly requests the full file.
* Never reorganize or rewrite existing tests unless explicitly instructed.
* Do not relocate directories or restructure the monorepo without explicit instruction.
* When expected output exceeds 50 lines, write it to a file using the project's naming scheme instead of printing inline.

---

## 3. Repository Interaction Rules

* Respect the existing monorepo architecture and follow established patterns.
* Do not create or modify database migrations unless explicitly instructed.
* Do not assume missing fields, rename schema elements, or generate auxiliary migration steps on your own.
* Treat packages such as `shared-ui`, `dashboard`, `backend`, and `bsky-client` as independent modules.

---

## 4. Dependency Management

* Ask for confirmation before adding any new production dependency.
* Do not update, remove, or alter dependency versions unless explicitly requested.
* Prefer `pnpm` when installing dependencies.

---

## 5. Safety, Validation & Conflict Handling

* If more than five files would be changed, summarise the plan and ask for explicit confirmation before proceeding.
* Avoid speculative changes, inferred architectures, or transformations based on guesses.
* Stop and request clarification if instructions appear ambiguous or contradictory.

---

## 6. Repository Expectations

* Always run `npm test` after modifying JavaScript files.
* Run `npm run lint` before opening a pull request.
* Document behavior changes to public utilities under the `docs/` directory.

---

## 7. Transparency

* Before applying multi-file edits, provide a clear, concise summary of what will be changed.
* Clearly indicate when any internal rule prevented an action and explain which rule applied.
