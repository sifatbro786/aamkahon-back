// pm2 process for the API on the VPS.
// ONE instance in fork mode: the campaign cron runs in-process with no lock,
// so a second instance (or cluster mode) would apply campaigns twice.
module.exports = {
    apps: [
        {
            name: "amkahon-back",
            script: "server.js",
            exec_mode: "fork",
            instances: 1,
            env: { NODE_ENV: "production", PORT: 5030 },
            max_memory_restart: "500M",
        },
    ],
};
