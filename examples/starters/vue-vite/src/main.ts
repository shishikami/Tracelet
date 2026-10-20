import { createApp } from "vue";
import App from "./App.vue";
import { analytics } from "./analytics";
import "./styles.css";

void analytics.init();
createApp(App).mount("#app");
