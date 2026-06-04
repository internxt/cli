FROM node:24-bookworm-slim

RUN apt-get update && apt-get install -y jq && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

COPY .env.template .env
COPY .npmrc.template .npmrc

RUN yarn install
RUN yarn build

RUN chmod +x /app/docker/entrypoint.sh
RUN chmod +x /app/docker/health_check.sh
RUN ln -s '/app/bin/run.js' /usr/local/bin/internxt

ENTRYPOINT ["/app/docker/entrypoint.sh"]

HEALTHCHECK --interval=120s --timeout=30s --start-period=60s --retries=3 CMD /app/docker/health_check.sh
