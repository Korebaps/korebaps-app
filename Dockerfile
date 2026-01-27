# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy server package files
COPY server/package*.json ./
RUN npm ci --only=production

# Copy frontend package files and build
COPY my-app/package*.json ./my-app/
RUN cd my-app && npm install

# Copy source code
COPY server/ .
COPY my-app/ ./my-app/

# Build the React app
RUN cd my-app && npm run build

# Copy built app to server public directory
RUN cp -r my-app/build ./public

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 4000) + '/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "index.js"]
