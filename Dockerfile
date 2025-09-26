FROM node:24-alpine

WORKDIR /app
COPY . .

RUN yarn install
RUN yarn build

RUN chmod +x /app/docker/entrypoint.sh
RUN ln -s '/app/bin/run.js' /usr/local/bin/internxt

ENTRYPOINT ["/app/docker/entrypoint.sh"]