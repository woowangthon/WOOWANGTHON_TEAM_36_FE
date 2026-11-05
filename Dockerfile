# 로컬 통합 실행용 개발 서버 이미지입니다(계획서 8.3).
# backend의 `docker compose --profile full`이 빌드해 띄웁니다. 배포는 Vercel이 하므로 이 이미지는 쓰지 않습니다.
FROM node:24-slim

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# 컨테이너 밖에서 접속할 수 있게 0.0.0.0에 엽니다. 프록시 대상은 compose가 API_PROXY_TARGET으로 넘깁니다.
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
