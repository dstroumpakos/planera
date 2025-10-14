# Bloom Template

This is a template for Bloom apps with pre-configured authentication using Better Auth and Convex.

## Authentication

This template uses Better Auth for authentication with Convex integration. The following authentication methods are available:

### Email and Password Authentication

```tsx
import { authClient } from "@/lib/auth-client";

// Sign up with email and password
const signUp = async (email: string, password: string) => {
    await authClient.signUp.email({
        email,
        password,
        name: email, // or provide a separate name field
    });
};

// Sign in with email and password
const signIn = async (email: string, password: string) => {
    await authClient.signIn.email({
        email,
        password,
    });
};
```

### Google OAuth

```tsx
import { authClient } from "@/lib/auth-client";

const signInWithGoogle = async () => {
    await authClient.signIn.social({
        provider: "google",
    });
};
```

### Anonymous Sign-In

For guest access or temporary users:

```tsx
import { authClient } from "@/lib/auth-client";

const signInAnonymously = async () => {
    await authClient.signIn.anonymous();
};
```

### Sign Out

```tsx
import { authClient } from "@/lib/auth-client";

const signOut = async () => {
    await authClient.signOut();
};
```

## Better Auth as a Convex Component

The Better Auth integration is implemented as a Convex component, which means it runs in a sandboxed environment separate from your main app data. Key implications:

- **Isolated Data**: Auth data (users, sessions, accounts) lives in the component's own schema and cannot be directly queried from your app's Convex functions
- **Separate Functions**: The component has its own set of functions with strict boundaries
- **Additional User Data**: If you need to store extra user information beyond what Better Auth provides, create a new table in your main app schema (see [Convex Components documentation](https://docs.convex.dev/components/using-components) for more details)

### Triggers

Better Auth provides **triggers** - a powerful feature for running transactional callbacks when authentication data changes. Triggers execute in the same transaction as the auth operation and can be used to:

- Create user profiles in your app when a new user signs up
- Update related data when user information changes
- Clean up user data when accounts are deleted

**Example**: Automatically create a user profile on signup

```tsx
// In your Convex component configuration
triggers: {
  user: {
    onCreate: async (ctx, doc) => {
      // Runs transactionally when a new user is created
      await ctx.db.insert("userProfiles", {
        userId: doc._id,
        createdAt: Date.now(),
      });
    },
    onUpdate: async (ctx, newDoc, oldDoc) => {
      // Handle user updates
    },
    onDelete: async (ctx, doc) => {
      // Clean up related data
    }
  }
}
```

**Important**: If a trigger throws an error, the entire operation (including the auth change) will be rolled back.

## Protecting Convex Functions with Authentication

To ensure only authenticated users can run your Convex functions, use the custom functions defined in `convex/functions.ts` instead of the standard Convex functions:

```typescript
// ❌ Don't use standard functions for authenticated routes
import { query, mutation, action } from "./_generated/server";

// ✅ Use custom auth functions instead
import { authQuery, authMutation, authAction } from "./functions";

// This query will automatically reject unauthenticated users
export const getMyData = authQuery({
  handler: async (ctx) => {
    // ctx.user is guaranteed to exist here
    return await ctx.db
      .query("data")
      .filter((q) => q.eq(q.field("userId"), ctx.user._id))
      .collect();
  },
});
```

These custom functions:
- Automatically verify the user is authenticated
- Throw an error if no valid session exists
- Provide a `ctx.user` object with the authenticated user's information
- Work for queries (`authQuery`), mutations (`authMutation`), and actions (`authAction`)

## Showing UI Based on Authentication State

You can control which UI is shown when the user is signed in or signed out using Convex's `<Authenticated>`, `<Unauthenticated>` and `<AuthLoading>` helper components. These components are powered by Convex's `useConvexAuth()` hook, which provides `isAuthenticated` and `isLoading` flags. This hook can be used directly if preferred.

**Important**: It's crucial to use Convex's authentication state components or the `useConvexAuth()` hook instead of Better Auth's `getSession()` or `useSession()` when you need to check whether the user is logged in or not. Better Auth will reflect an authenticated user before Convex does, as the Convex client must subsequently validate the token provided by Better Auth. Convex functions that require authentication can throw if called before Convex has validated the token.

### Example Usage

```tsx
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";

function App() {
    return (
        <View>
            <Unauthenticated>
                <Text>Logged out</Text>
                {/* Show login buttons */}
            </Unauthenticated>

            <Authenticated>
                <Content />
            </Authenticated>

            <AuthLoading>
                <Text>Loading...</Text>
            </AuthLoading>
        </View>
    );
}

// This component is guaranteed to have an authenticated user
// and Convex queries can safely require authentication
const Content = () => {
    const messages = useQuery(api.messages.getForCurrentUser);
    return <Text>Authenticated content: {messages?.length}</Text>;
};
```

### Using the useConvexAuth Hook Directly

If you need more granular control over authentication state:

```tsx
import { useConvexAuth } from "convex/react";

function MyComponent() {
    const { isAuthenticated, isLoading } = useConvexAuth();

    if (isLoading) {
        return <Text>Loading...</Text>;
    }

    if (isAuthenticated) {
        return <Text>Logged in</Text>;
    }

    return <Text>Logged out</Text>;
}
```
