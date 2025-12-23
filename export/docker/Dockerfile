FROM node:20-alpine

WORKDIR /app

# 安装 bash 和 docker CLI，用于在容器内调用宿主机 Docker（通过挂载 docker.sock）
RUN set -eux; \
  ALPINE_VER="$(cut -d. -f1,2 /etc/alpine-release)"; \
  if ! grep -q "/community" /etc/apk/repositories; then \
    echo "https://dl-cdn.alpinelinux.org/alpine/v${ALPINE_VER}/community" >> /etc/apk/repositories; \
  fi; \
  apk add --no-cache bash docker-cli libqrencode-tools; \
  apk upgrade --no-cache

# 拷贝脚本与 WebUI
COPY sh ./sh
COPY webui ./webui
COPY docker/server.js ./docker/server.js

RUN chmod +x ./sh/docker-export-compose.sh

ENV NODE_ENV=production
ENV PORT=3080

EXPOSE 3080

CMD ["node", "docker/server.js"]


