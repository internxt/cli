FROM node:24-alpine

RUN apk add --no-cache jq

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

HEALTHCHECK --interval=60s --timeout=20s --start-period=30s --retries=3 CMD /app/docker/health_check.sh
