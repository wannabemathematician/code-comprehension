# Code Comprehension

**Code Comprehension** is a web-based platform for practicing *real-world software engineering skills*: reading, understanding, and reasoning about existing codebases.

Instead of algorithm puzzles, users work inside realistic multi-file projects with:
- Slack-style product/manager context
- messy or legacy code (often LLM-generated)
- failing tests (simulated for MVP)
- deep code-comprehension questions (MCQs tied to the repo)

The goal is to train and measure **code literacy, debugging intuition, and communication**, not just code writing.

---

## High-level architecture (MVP)

This repository is a **single monorepo** containing:
- a React frontend
- a serverless Node.js backend (AWS Lambda)
- infrastructure-as-code
- local challenge authoring assets

At this stage:
- challenges are stored as zipped files in S3
- challenge metadata lives in DynamoDB
- authentication is handled by Cognito
- submissions and code execution are *not* implemented yet

---


---

## Apps

### `apps/web` — Frontend
- React (Vite or Next.js)
- Auth via Amazon Cognito
- Loads challenge zips client-side
- Provides:
  - file tree + editor
  - Slack-style prompt
  - simulated test output
  - MCQs tied to the codebase

This is a **static site**, deployed to S3.

---

### `apps/api` — Backend API
- Node.js + TypeScript
- AWS Lambda + API Gateway
- Stateless, read-only for MVP

Current responsibilities:
- authenticate requests (via Cognito JWTs)
- list available challenges
- fetch challenge metadata
- generate pre-signed S3 URLs for challenge downloads

There is **no code execution** or submission handling yet.

---

## Infrastructure

### `infra/`
Infrastructure is defined using **AWS CDK (TypeScript)**.

Provisioned resources:
- Amazon Cognito (User Pool)
- DynamoDB (`Challenges` table)
- S3 (private challenge zip storage)
- API Gateway
- Lambda functions
- IAM roles and policies

The frontend is deployed to S3 (CloudFront optional later).

---

## Challenges

Challenges are authored locally and published to S3 as zip files.

### In production
- Each challenge is zipped
- Uploaded to S3 (private bucket)
- Indexed via DynamoDB metadata
- Downloaded by clients using **short-lived pre-signed URLs**

Git is **not** the source of truth for challenge binaries.

---

## API (current MVP)
Authenticated endpoints:
GET /challenges
GET /challenges/{id}
GET /challenges/{id}/download


These are sufficient to:
- list challenges
- view details
- load challenge content client-side

---

## What this MVP deliberately does NOT include (yet)

- code execution or sandboxing
- Docker runners / ECS / Fargate
- submission persistence
- grading logic
- admin UI
- load balancing

These will be added incrementally once the core experience is validated.

---

## Development philosophy

- Optimize for **learning signal**, not correctness-by-brute-force
- Prefer **reading and reasoning** over writing from scratch
- Keep infrastructure minimal until real usage exists
- Defer expensive systems (runners, queues, orchestration) until needed

---

## Long-term direction (not MVP scope)

- Real unit test execution in isolated containers
- Rich scoring (comprehension, correctness, communication)
- Hiring and team assessment workflows
- AI-assisted challenge generation and review

---

## Getting started (placeholder)

> Setup instructions will be added once infrastructure scaffolding is in place.

---

## One-sentence product thesis

> As AI makes writing code cheap, the scarce skill becomes reading, reasoning about, and communicating what code does.  
> **Code Comprehension trains and measures that skill.**
