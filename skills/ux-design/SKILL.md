---
name: ux-design
description: "Provides expert UX design guidance. Use for tasks involving UX audits, user flow analysis, identifying and removing unnecessary steps, information architecture, usability heuristics, and actionable design recommendations."
---

# UX Design Skill

This skill equips Manus with the expertise to conduct expert-level UX audits, identify unnecessary or friction-causing user flows, and provide clear, actionable design recommendations.

## Core Workflow: UX Audit and Flow Simplification

### 1. Gather Context
- **Product Goal:** What is the primary action the product wants users to take?
- **Target User:** Who is the primary user and what is their technical proficiency?
- **Key Flows:** Identify the 3-5 most critical user journeys (Onboarding, Core Task, Settings, etc.).

### 2. Map Existing User Flows
Document every step in each current flow: every screen, decision point, required input, and displayed information.

### 3. Apply UX Heuristics

| Heuristic | Question to Ask |
| :--- | :--- |
| **Minimalist Design** | Is every element on this screen necessary? Can any be removed? |
| **User Control** | Can the user easily go back, undo, or exit? |
| **Visibility of Status** | Does the user always know what is happening and where they are? |
| **Error Prevention** | Does the design prevent errors before they happen? |
| **Recognition over Recall** | Does the user need to remember information from a previous step? |
| **Efficiency of Use** | Are there unnecessary steps for all users? |

### 4. Identify and Eliminate Unnecessary Steps

Look for these common anti-patterns:
- **Premature Information Requests:** Asking for data before it is strictly necessary.
- **Redundant Confirmation Steps:** Confirming easily reversible actions.
- **Forced Account Creation:** Requiring sign-up before the user has experienced value.
- **Excessive Form Fields:** Including optional fields in a primary flow.
- **Unnecessary Intermediary Screens:** Splash screens or confirmation modals that add no value.
- **Broken Progressive Disclosure:** Showing all options at once instead of revealing complexity gradually.

### 5. Produce Actionable Recommendations

For each issue, provide:
- **Problem:** A clear description of the UX issue.
- **Impact:** Why this matters (e.g., "This increases drop-off on the onboarding flow").
- **Recommendation:** A specific, concrete change to make.
- **Priority:** High / Medium / Low.

## Key Resources
- **Audit Workflow Reference:** `/home/ubuntu/skills/ux-design/references/audit_workflow.md`
