FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install app dependencies - include ALL dependencies to fix missing modules
RUN apk add --no-cache --virtual .build-deps \
    python3 make g++ \
    && npm install \
    && apk del .build-deps

# Copy app source
COPY . .

# Set production environment and expose port
ENV NODE_ENV=production
ENV DISABLE_FILE_WATCHING=true

# Cloud Run will set PORT environment variable
# Default to 8080 for local testing
ENV PORT=8080
EXPOSE $PORT

# Start the app with our Cloud Run specific script
CMD [ "node", "cloud-run-start.js" ]
