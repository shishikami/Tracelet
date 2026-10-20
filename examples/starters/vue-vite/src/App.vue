<script setup lang="ts">
import { ref } from "vue";
import { analytics } from "./analytics";

const status = ref("Waiting for an event…");

async function trackProduct() {
  await analytics.track("product_viewed", { productId: "sku_123", price: 129 });
  status.value = "product_viewed is queued";
}

async function flush() {
  await analytics.flush();
  status.value = "Queue flushed — inspect the browser console";
}
</script>

<template>
  <main>
    <p class="eyebrow">TRACELET × VUE</p>
    <h1>One analytics lifecycle, independent of your UI framework.</h1>
    <p>Queue a typed event and flush it through the console transport without setting up a backend.</p>
    <div class="actions"><button @click="trackProduct">Queue product_viewed</button><button class="secondary" @click="flush">Flush queue</button></div>
    <section><strong>Current status</strong><span>{{ status }}</span></section>
  </main>
</template>
