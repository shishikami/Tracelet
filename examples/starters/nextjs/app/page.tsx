import { TrackedButton } from "./tracked-button";

export default function Page() {
  return (
    <main>
      <h1>Tracelet + Next.js</h1>
      <p>The SDK is initialized once through a client boundary.</p>
      <TrackedButton />
    </main>
  );
}
