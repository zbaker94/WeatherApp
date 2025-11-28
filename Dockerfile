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

RUN test -f .env || (echo '.env file missing!' && exit 1)

# Build the app (ensure .output/server/index.mjs exists)
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Expose port (change if your app uses a different port)
EXPOSE 3000

# Start the app using npm start script
CMD ["npm", "start"]
