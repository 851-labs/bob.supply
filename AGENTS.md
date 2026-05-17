# Agents

## Core Priorities

- performance first
- reliability first
- keep generated batches resumable and auditable

## Maintainability

Long term maintainability is a core priority. Shared batch, animal, prompt, and manifest logic belongs in packages rather than being duplicated inside generator entrypoints.
