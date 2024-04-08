module.exports = {
    apps : [{
        name: 'dstruct',
        script: "npm",
        args: "run server",
        watch: true,
        env: {
            NODE_ENV: "production",
        },
        env_production: {
            NODE_ENV: "production"
        }
    }],
};
