---
name: react-expert
description: "Provides expert guidance for developing with React 18+. Use for tasks involving modern React features (hooks, suspense), component architecture, state management (Zustand, Jotai), data fetching (React Query), performance, and testing with Vitest."
---

# React Expert Skill

This skill equips Manus with the expertise to build, refactor, and optimize modern React applications. It provides a comprehensive workflow for component design, state management, data fetching, performance optimization, and testing.

## Core Workflow

When a task involves building or maintaining a React application, follow this structured workflow.

### 1. Understand the Component/Feature Goal

Before writing code, clarify the requirements. Is it a new feature, a refactor, or a performance bug? Understand the desired state, props, and user interactions.

### 2. Component Architecture and Design

*   **Composition:** Favor composition over inheritance. Use custom hooks and render props to share logic. For complex UI, use compound components to create a declarative, flexible API for parent-child communication.
*   **TypeScript:** Always use TypeScript. Define clear types for props, state, and API responses.
*   **Project Structure:** Organize files by feature or domain (e.g., `/features/authentication`, `/components/ui`). This is more scalable than grouping by file type (e.g., `/components`, `/hooks`).

### 3. State Management

Choose the right tool for the job. Avoid over-engineering.

*   **Local State (`useState`, `useReducer`):** Use for state that is local to a single component or a small, co-located group of components.
*   **Client-Side Global State (Zustand, Jotai):** Use for global state that needs to be shared across many components (e.g., theme, user settings). Prefer Zustand for its simplicity and minimal boilerplate.
*   **Server-Side State / Cache (React Query):** **Always use React Query (or SWR) for managing server state.** This includes fetching, caching, and updating data from APIs. Do not store server data in a global state manager like Zustand.

    ```typescript
    import { useQuery } from '@tanstack/react-query';

    function useUserData(userId) {
      return useQuery({
        queryKey: ["user", userId],
        queryFn: () => fetch(`/api/users/${userId}`).then(res => res.json()),
      });
    }
    ```

### 4. Data Fetching

As mentioned, React Query is the standard. 

*   **Queries (`useQuery`):** For fetching data.
*   **Mutations (`useMutation`):** For creating, updating, or deleting data. Use mutations to handle side effects like optimistic updates and cache invalidation.
    ```typescript
    const mutation = useMutation({
      mutationFn: updateUser,
      onSuccess: () => {
        // Invalidate and refetch
        queryClient.invalidateQueries({ queryKey: ["users"] });
      },
    });
    ```

### 5. Performance Optimization

Don't prematurely optimize. Use the React DevTools Profiler to identify bottlenecks first.

*   **Memoization (`React.memo`, `useMemo`, `useCallback`):** Use to prevent unnecessary re-renders of expensive components or calculations. Be mindful of the overhead.
*   **Code Splitting (`React.lazy` and Suspense):** Split large components or routes into separate chunks that are loaded on demand.
*   **Virtualization:** For long lists, use a library like TanStack Virtual to render only the visible items.

### 6. Routing

For most web apps, use React Router v6.

*   **Routes:** Define routes using `<Routes>` and `<Route>`.
*   **Layouts:** Use nested routes and `<Outlet />` to create shared layouts.
*   **Programmatic Navigation:** Use the `useNavigate` hook.

### 7. Testing

Use Vitest as the test runner and React Testing Library for rendering and interacting with components.

*   **Philosophy:** Test user behavior, not implementation details. Find elements by accessible roles and text, not by CSS classes or internal state.
*   **Setup:** Configure `vitest.config.ts` with the `jsdom` environment.
*   **Example Test:**
    ```typescript
    import { render, screen } from '@testing-library/react';
    import userEvent from '@testing-library/user-event';
    import MyComponent from './MyComponent';

    test('it should increment the count when the button is clicked', async () => {
      render(<MyComponent />);
      const button = screen.getByRole('button', { name: /increment/i });
      await userEvent.click(button);
      expect(screen.getByText(/count: 1/i)).toBeInTheDocument();
    });
    ```

## Key Resources

*   **Comprehensive Reference:** For detailed information on all concepts, APIs, and best practices, read the main reference document:
    `/home/ubuntu/skills/react-expert/references/reference.md`
*   **React DevTools:** Essential for debugging and profiling React applications.
