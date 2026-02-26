---
name: ai-agent-generation
description: "Provides expert guidance for designing and building AI agents. Use for tasks involving agent frameworks (LangGraph, CrewAI, AutoGen), architectural patterns (ReAct, Plan-and-Execute), tool use, memory, and evaluation."
---

# AI Agent Generation Skill

This skill equips Manus with the expertise to design, build, and deploy robust, production-grade AI agents. It provides a structured workflow for selecting the right framework and architecture, implementing core components like tool use and memory, and ensuring reliability through evaluation.

## Core Workflow: Building an AI Agent

When a task requires creating an AI agent, follow this comprehensive workflow.

### 1. Define the Agent's Purpose and Constraints

First, clearly define the agent's objective and operational environment.

*   **Goal:** What specific problem will the agent solve? (e.g., "Automate customer support ticket triaging," "Generate daily market analysis reports").
*   **Task Complexity:** Is the task simple and linear, or does it require complex branching, iteration, or collaboration?
*   **Environment:** Is the environment static or dynamic? Does the agent need to react to real-time changes?
*   **Latency & Cost:** What are the performance and budget constraints?

### 2. Select the Right Framework and Architecture

Based on the requirements, choose the most suitable framework and architectural pattern. This is the most critical decision.

1.  **Consult the Framework Comparison:** Review the framework comparison table in the main reference document to make an informed choice. 
    *   **Read:** `/home/ubuntu/skills/ai-agent-generation/references/reference.md` (Section 1)

| If the task requires... | Then choose... |
| :--- | :--- |
| Complex, stateful, and auditable workflows | **LangGraph** |
| Clear role-based task delegation | **CrewAI** |
| Iterative refinement and dynamic conversation | **AutoGen** |
| Rapid prototyping and simple tool use | **OpenAI Agents SDK** |

2.  **Choose an Architectural Pattern:** Select a core reasoning pattern.
    *   **ReAct:** Default for most interactive, dynamic tasks.
    *   **Plan-and-Execute:** For predictable, multi-step workflows.
    *   **Multi-Agent:** For complex problems that can be broken down into specialized sub-tasks.

### 3. Implement the Core Agent Components

With the framework and architecture chosen, build the agent's core logic.

*   **Agent Definition:** Define the agent's identity, instructions, and base LLM.
*   **Tool Implementation (Function Calling):**
    *   Define a clear and descriptive schema for each tool.
    *   Implement robust error handling within the tool's code.
    *   Ensure tools are idempotent where possible.
*   **Memory System:**
    *   For simple, single-session tasks, short-term context memory is often sufficient.
    *   For tasks requiring knowledge across sessions, implement a long-term memory solution. A vector database (for semantic search) combined with a key-value store (for user data) is a powerful combination.

### 4. Add Guardrails and Error Handling

Production agents must be resilient.

*   **Circuit Breakers:** Implement limits to prevent runaway execution, such as maximum iterations, time limits, or cost-based cutoffs.
*   **Validation:** Use guardrails (like those in the OpenAI Agents SDK) or Pydantic models to validate inputs and outputs of tools and LLM calls.
*   **Retries and Fallbacks:** Implement retry logic for transient network errors and define fallback behaviors for when a tool or LLM call consistently fails.

### 5. Test and Evaluate

Rigorous testing is non-negotiable.

1.  **Unit Tests:** Write unit tests for individual tools to ensure they function correctly in isolation.
2.  **Integration Tests:** Test the agent's ability to correctly chain tool calls and reason through a complete task.
3.  **Evaluation Dataset:** Create a representative dataset of inputs and desired outcomes. Run the agent against this dataset to measure performance, accuracy, and failure rates.
4.  **Use an Observability Platform:** Integrate a tool like **Langfuse** (open-source) or **LangSmith** (managed) from the beginning. Use their tracing capabilities to debug failures and analyze performance. This is not optional for production systems.

### 6. Deploy and Monitor

*   **Deployment:** Deploy the agent in a scalable, managed environment.
*   **Monitoring:** Continuously monitor the agent's performance, cost, and error rates in production using your chosen observability platform. Use this data to identify areas for improvement and to catch regressions.

## Key Resources

*   **Comprehensive Technical Reference:** For in-depth information on all frameworks, architectures, and best practices, this is the primary source of truth.
    *   **MUST READ:** `/home/ubuntu/skills/ai-agent-generation/references/reference.md`
