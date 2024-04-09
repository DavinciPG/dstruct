import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: 'http://localhost:3000/api',
    withCredentials: true
});

const axiosPlugin = {
    install(app) {
        // Make Axios instance available globally
        app.config.globalProperties.$http = axiosInstance;
    },
};

export { axiosPlugin, axiosInstance };