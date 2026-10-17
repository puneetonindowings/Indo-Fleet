module.exports = {
  apps: [
    {
      name: 'indofleet-backend',
      script: 'dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 5000
      }
    }
  ]
};
