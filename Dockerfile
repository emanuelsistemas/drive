# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Update browserslist database and build
RUN npx update-browserslist-db@latest && \
    npm run build

# Production stage
FROM nginx:alpine

# Install additional security packages
RUN apk add --no-cache curl

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create a non-root user
RUN adduser -D reactuser && \
    chown -R reactuser:reactuser /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
    CMD curl -f http://localhost:3000/ || exit 1

# Switch to non-root user
USER reactuser

# Expose port 3000
EXPOSE 3000

# Start nginx
CMD ["nginx", "-g", "daemon off;"]