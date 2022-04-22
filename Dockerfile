FROM python:3.9
ENV NODE_ENV=production
WORKDIR /usr/src/app
RUN apt-get update && apt-get upgrade -y && apt-get install -y nodejs npm
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install -g npm@8.7.0
RUN npm install  && mv node_modules ../
COPY . .
EXPOSE 9000

CMD ["npm", "start"]
