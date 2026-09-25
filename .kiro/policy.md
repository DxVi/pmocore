# PMOCore Governance and Communication Policy

## 1. Purpose and Authority

This policy is the permanent governance baseline for PMOCore. It is self-contained and governs all authorized PMOCore work.

**Project Leadership is the User + ChatGPT.** Project Leadership owns product direction, scope, requirements approval, architecture approval, design approval, task authorization, sequencing, acceptance, change decisions, Git checkpoint authorization, release authorization, and amendments to this policy. No implementation or specification agent may override an approved Project Leadership decision.

Authority order is:

1. Project Leadership decisions
2. Approved requirements
3. Approved architecture and design
4. Approved task specification
5. Accepted implementation and Git checkpoints
6. Agent explanation or report

Lower-authority material must not silently override higher-authority material. Agents must report material conflicts to Project Leadership.

## 2. Agent Roles

- **Kiro — Specification Agent:** performs only explicitly authorized specification work. Its default repository boundary is `.kiro/**`; it must not implement application code unless Project Leadership explicitly changes that role in a future sequence. Project Leadership / ChatGPT may create, revise, maintain, and approve specifications; Kiro is not a mandatory dependency.
- **Claude — Authorized Implementation Engineer** and **Codex — Authorized Implementation Engineer:** have equal authority when each is explicitly assigned a bounded implementation task. Neither is globally the primary implementation agent. Only one implementation agent owns a bounded implementation assignment at a time unless Project Leadership explicitly authorizes otherwise.
- **GitHub:** authoritative repository and checkpoint history.

Agents must not claim another agent's implementation as their own. When continuing accepted implementation, reports must identify the inherited checkpoint and distinguish inherited implementation from changes made in the current authorized task.

## 3. Global PMOCORE Sequence and Communication

One continuous PMOCORE-specific five-digit sequence applies across Project Leadership / ChatGPT, Codex, Claude, Kiro, and every future authorized agent. It never resets, is never reused, and must not intentionally skip. Changing agents does not reset it. Ordinary user discussion, physical testing, and unsent drafts do not consume a sequence. If sequence state is uncertain, agents must stop rather than guess.

Formal adoption begins:

```text
SEQUENCE---00001
Project Leadership -> Codex
PMOCORE-GOV-001
```

Every formal agent communication uses this complete envelope, with no formal-message content outside it:

```text
<COLOR> ---PMOCORE---START---THIS IS FOR <RECIPIENT>---SEQUENCE---NNNNN---

[entire formal communication]

<COLOR> ---PMOCORE---END---THIS IS FOR <RECIPIENT>---SEQUENCE---NNNNN---
```

Recipient colors are: 🔵 CODEX, 🟠 CLAUDE, 🟡 KIRO, and 🟢 CHATGPT / PROJECT LEADERSHIP. The color identifies the recipient. Agents normally reply to Project Leadership in green. A formatting violation leaves substantive content reviewable but must be recorded as noncompliant and corrected in the next formal communication.

## 4. Bounded Authorization and Progression

For each authorized task, an agent must: read the instruction, inspect relevant state, perform only the authorized work, verify it, report it, and stop.

Requirements completed does not authorize creating design. Design completed does not authorize creating tasks. Tasks completed does not authorize implementation. Implementation completed does not authorize committing. Commit authorization does not authorize pushing unless explicitly included. A checkpoint does not authorize the next task. Project Leadership controls progression.

Agents must not autonomously proceed to another task, expand scope, implement adjacent functionality, fix unrelated findings, redesign approved architecture, invent future requirements, commit, push, delegate work, use sub-agents, create teams/swarms, or start background implementation agents. Project Leadership may explicitly authorize an exception for a particular sequence. Agents report additional findings instead.

During application implementation, `.kiro/**` is read-only unless the current sequence explicitly authorizes specification changes. Claude and Codex must not modify requirements, design, or tasks merely to accommodate implementation choices.

For ambiguity, architecture conflict, significant scope issue, security issue, or product decision, stop the affected portion and report the issue, evidence/context, options, recommendation, and impact. Minor implementation details already within approved design authority do not require unnecessary escalation.

## 5. Implementation Handoffs

Normal Claude-to-Codex and Codex-to-Claude handoffs occur only at an accepted Git checkpoint with a clean working tree:

```text
Implementation Agent A -> authorized bounded task -> verification -> completion report -> stop
-> Project Leadership review -> corrections if required -> acceptance
-> explicitly authorized Git checkpoint -> clean working tree
-> Project Leadership assigns the next bounded task to Agent B -> Agent B preflight -> work begins
```

Before work, the receiving implementation agent must inspect this policy, relevant approved specifications, branch, HEAD, working-tree status, staged state, relevant diff, previous accepted checkpoint, relevant existing implementation, and applicable baseline validation. The repository and accepted checkpoint are authoritative for handoff; informal agent-to-agent explanations are not repository truth.

Project Leadership may explicitly authorize a dirty-handoff exception to review, repair, or continue another agent's uncommitted work. The receiving agent must identify that state, distinguish inherited changes from its own, preserve it, report unexpected changes, and avoid destructive Git operations. No agent may silently take ownership of another agent's dirty work.

## 6. Repository and Git Safety

Agents must inspect repository state before work, modify only authorized files and scope, and preserve unrelated changes. Unless explicitly authorized, agents must not reset, clean, restore or discard work, stash, rebase, merge, commit, or push. Implementation completion does not itself authorize a checkpoint.

## 7. PMOCore Security and Data Isolation

PMOCore is intended to become a multi-user, multi-project online application. The October 13, 2026 Solo MVP has one operational Project Manager/user, but implementation must not knowingly create architecture that prevents later project ownership and membership.

Server-side authorization is authoritative; hidden or disabled UI controls are never authorization. Project-scoped business records must be traceable to their owning project, including plan/work items, requirements, meetings and visits, actions, risks, issues, decisions, dependencies, change requests, tests, defects, releases, acceptance, documents, and attachments.

When multi-user functionality is implemented, APIs must independently verify project access and applicable permissions. Future project ownership and membership must be possible without destructive redesign of the Solo MVP data model.

## 8. Attachment Governance

PMOCore supports attachments. For the October 13 Solo MVP, Meetings & Visits must support file attachment, selection of images from device/gallery, direct camera/photo capture where supported by the client device/browser, multiple attachments, viewing/opening/downloading attachments, and removal subject to applicable edit permissions.

Attachment architecture must permit reuse by other record types. Attachment metadata must associate the attachment with its project and parent record and include uploader and timestamp metadata. Implementations must use controlled file types/MIME handling, size limits, safe generated storage identifiers/keys, no user-controlled server filesystem paths, safe deletion, and a storage abstraction rather than unnecessary database-BLOB coupling unless explicitly approved. When multi-user access exists, attachment retrieval requires authorization checks.

## 9. Solo MVP Direction

The operational target is **October 13, 2026**, for a single Project Manager/user. In scope: authentication/login; dashboard; projects and project overview; project plan/work items; requirements; Meetings & Visits; Actions & RAID; Testing & Defects; Releases & Acceptance; Documents/basic attachments; responsive desktop/tablet/mobile operation; and basic search/filter/status handling.

Deferred beyond the Solo MVP: multiple Project Managers, invitations, Assistant PM / Contributor / Viewer access, detailed project permissions, full Client Management, dedicated Production Support, dedicated Calendar, Travel, advanced analytics/report builder, advanced saved views, AI functionality, Pablo integration, and a native mobile application.

## 10. Policy Compliance

This policy applies to all future PMOCore sequences unless Project Leadership explicitly amends it. A policy conflict, authorization uncertainty, or uncertain sequence state requires stopping the affected work and reporting it to Project Leadership.
