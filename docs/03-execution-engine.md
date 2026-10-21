# 03. The execution engine (Phase 4)

## Goal
Run a valid DAG so that a node starts **only after all parents succeeded**, and every state change is saved.

## The loop (simple, in one process first)
```
create a Run and one NodeRun (pending) per node
repeat:
   find "ready" nodes = pending nodes whose parents are all success
   run them (in parallel if several)
   save output + status for each
   if a node failed: mark all its descendants "skipped"
until nothing is left
Run = success if every node succeeded, else failed
```
The "find ready nodes" step is a **pure function**: give it the graph and current statuses, it returns node ids. No database inside, so it is easy to test.

## Node types (small and typed)
| Type | What it does |
|---|---|
| trigger | Starts the run; its output is the trigger payload |
| transform | Builds new data from earlier outputs using `{{ path }}` templates (no `eval`!) |
| http | Calls a URL with method, headers, body, and a timeout |
| delay | Waits a bounded number of seconds |
| output | Stores the final result of the run |

Each type is one small "executor" function registered by name, so adding a node type means adding one function.

## Data between nodes
Each node gets a context: `{ trigger: <payload>, nodes: { <nodeId>: { output } } }`. A template like `{{ nodes.fetch.output.email }}` reads from it.

## Failure rule (explicit and tested)
If a node fails, its **descendants are skipped**; independent branches keep running. The run ends as `failed`.

## Safety basics
- Never `eval` user text.
- Every HTTP call has a timeout.
- Hide secrets (Authorization headers, tokens) when saving inputs and logs; limit stored payload size.

## Likely viva questions
- How do you know a node is ready?
- What happens when one branch fails?
- Why is the readiness function pure?
- How does data flow from node to node?
