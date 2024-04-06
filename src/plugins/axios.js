import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: 'https://dstruct.vocoprojektid.ee/api',
    withCredentials: true,
});

const axiosPlugin = {
    install(app) {
        app.config.globalProperties.$http = axiosInstance;
    },
};

export { axiosPlugin, axiosInstance };