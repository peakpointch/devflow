import { createApp } from "vue";
// @ts-expect-error typescript does not understand vue imports
import Popup from "./Popup.vue";

createApp(Popup).mount("#app");
