import { createApp } from 'vue'
import App from './App.vue'
import { axiosPlugin } from "@/plugins/axios";
import Store from '@/store';
import Router from '@/router';

import LoadScript from "vue-plugin-load-script";

const app = createApp(App);

// configuration
app.use(axiosPlugin);
app.use(Store);
app.use(Router);
app.use(LoadScript);

app.mount('#app');