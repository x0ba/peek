<script lang="ts">
  import { SignIn } from "svelte-clerk";
  import AuthScreen from "$lib/components/app/auth-screen.svelte";
</script>

<svelte:head><title>Sign in · Peek</title></svelte:head>

<AuthScreen
  eyebrow="Welcome back"
  title="Sign in to Peek"
  subtitle="Continue with GitHub, Google, or an email magic link."
>
  {#snippet form()}
    <SignIn
      routing="path"
      path="/sign-in"
      signUpUrl="/sign-up"
      fallbackRedirectUrl="/dashboard"
    />
  {/snippet}
</AuthScreen>
