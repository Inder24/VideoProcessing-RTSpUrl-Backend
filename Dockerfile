FROM node:alpine 
COPY ./ ./
# Install project dependencies
RUN npm install
# Running default command
# WORKDIR /src
EXPOSE 8185
EXPOSE 8187
CMD ["node", "./src/Backend-main.js"]