# Bloom Templates

This directory contains templates for Bloom apps with pre-configured authentication using Better Auth and Convex.

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
