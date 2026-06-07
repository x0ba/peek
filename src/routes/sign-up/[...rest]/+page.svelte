<script lang="ts">
  import { SignUp } from "svelte-clerk";
  import AuthScreen from "$lib/components/app/auth-screen.svelte";
</script>

<svelte:head><title>Create account · Peek</title></svelte:head>

<AuthScreen
  eyebrow="Get started"
  title="Create your workspace"
  subtitle="Start importing and reviewing agent sessions in minutes."
>
  {#snippet form()}
    <SignUp
      routing="path"
      path="/sign-up"
      signInUrl="/sign-in"
      fallbackRedirectUrl="/dashboard"
    />
  {/snippet}
</AuthScreen>
