FROM node:22


# Set working directory
WORKDIR /app


# Copy package.json and package-lock.json (if exists)
COPY package*.json ./

# Apply security updates before installing dependencies
RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*

# Install dependencies
RUN npm install

# Copy all files
COPY . .

# Build the app (ensure .output/server/index.mjs exists)
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

ARG PORT=3000
ENV PORT=$PORT
ENV HOST=0.0.0.0
EXPOSE $PORT

# Start the app using npm start script
CMD ["npm", "start"]
